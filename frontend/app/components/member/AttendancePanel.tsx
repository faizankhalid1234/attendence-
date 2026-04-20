"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import { L } from "@/lib/attendanceLabels";
import StatusBarChart from "@/app/components/charts/StatusBarChart";
import SummaryPie from "@/app/components/charts/SummaryPie";
import { buildMemberDaySeries, summarizeSeries } from "@/lib/attendanceSeries";

type CompanyRules = {
  id?: string;
  name?: string;
  workStart: string;
  workEnd: string;
  timezone: string;
  officeLatitude: number;
  officeLongitude: number;
  locationRadiusMeters: number;
  localToday?: string;
};

type CompanyOption = { id: string; name: string };

type Row = {
  id: string;
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
};

type GpsPhase = "none" | "getting" | "ready";

/** First GPS fix can be wrong indoors — sample for a few seconds and keep the best-accuracy reading. */
function acquireBestGpsFix(maxWaitMs: number): Promise<{ lat: number; lng: number; acc?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no geolocation"));
      return;
    }
    const goodEnoughM = 50;
    let best: GeolocationPosition | null = null;
    let settled = false;
    const geo = navigator.geolocation;
    let watchId = 0;
    let timerId: number | undefined;

    const cleanup = () => {
      if (watchId) geo.clearWatch(watchId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };

    const finish = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        acc: pos.coords.accuracy ?? undefined,
      });
    };

    watchId = geo.watchPosition(
      (pos) => {
        if (!best || (pos.coords.accuracy ?? 1e9) < (best.coords.accuracy ?? 1e9)) {
          best = pos;
        }
        const acc = pos.coords.accuracy;
        if (acc != null && acc <= goodEnoughM) {
          finish(pos);
        }
      },
      (err) => {
        if (settled) return;
        if (!best) {
          settled = true;
          cleanup();
          reject(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs + 4000 },
    );

    timerId = window.setTimeout(() => {
      if (settled) return;
      if (best) {
        finish(best);
        return;
      }
      geo.getCurrentPosition(
        (pos) => finish(pos),
        () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("timeout"));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
      );
    }, maxWaitMs) as unknown as number;
  });
}

function formatCompanyDateTime(iso: string | null, tz: string): string {
  if (!iso) return "-";
  const zone = tz?.trim() || "Asia/Karachi";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: zone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return new Date(iso).toLocaleString();
    }
  }
}

function rowStatusMeta(row: Row): { primary: string; detail: string; className: string } {
  if (row.checkedInAt && row.checkedOutAt) {
    return {
      primary: L.statusComplete,
      detail: L.statusCompleteDetail,
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/55 dark:text-emerald-200",
    };
  }
  if (row.checkedInAt) {
    return {
      primary: L.statusPending,
      detail: L.statusPendingDetail,
      className: "bg-amber-100 text-amber-900 dark:bg-amber-950/45 dark:text-amber-100",
    };
  }
  return {
    primary: L.statusAbsent,
    detail: L.statusAbsentDetail,
    className: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

export default function AttendancePanel() {
  const [history, setHistory] = useState<Row[]>([]);
  const [company, setCompany] = useState<CompanyRules | null>(null);
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [gpsPhase, setGpsPhase] = useState<GpsPhase>("none");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [officeDistanceM, setOfficeDistanceM] = useState<number | null>(null);
  const [locationLabelLoading, setLocationLabelLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const tz = company?.timezone || "Asia/Karachi";

  const syncVideoReady = useCallback(() => {
    const v = videoRef.current;
    if (v && v.videoWidth > 0 && v.videoHeight > 0) setCameraReady(true);
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    const res = await apiFetch("/api/member/attendance");
    const data = ((await readJsonSafe(res)) || {}) as {
      history?: Row[];
      company?: CompanyRules;
      companies?: CompanyOption[];
      error?: string;
    };
    if (!res.ok) {
      setLoadError(data.error || "Could not load records — please log in again.");
      setHistory([]);
      setCompany(null);
      setCompaniesList([]);
      setSelectedCompanyId("");
      return;
    }
    setHistory(data.history || []);
    const c = data.company || null;
    setCompany(c);
    let opts = Array.isArray(data.companies) ? data.companies.filter((x) => x?.id && x?.name) : [];
    if (opts.length === 0 && c?.id && c?.name) opts = [{ id: String(c.id), name: String(c.name) }];
    setCompaniesList(opts);
    if (c?.id) setSelectedCompanyId(String(c.id));
    else if (opts[0]?.id) setSelectedCompanyId(String(opts[0].id));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stopCamera = () => {
    setCameraReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setMessage("");
    setCameraReady(false);
    stopCamera();
    const tryStream = async (constraints: MediaStreamConstraints) =>
      navigator.mediaDevices.getUserMedia(constraints);

    const attach = async (stream: MediaStream) => {
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        try {
          await el.play();
        } catch {
          /* autoplay policies */
        }
        requestAnimationFrame(() => syncVideoReady());
      }
    };

    try {
      const stream = await tryStream({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      await attach(stream);
      return;
    } catch {
      /* try user */
    }

    try {
      const stream = await tryStream({ video: { facingMode: "user" }, audio: false });
      await attach(stream);
      return;
    } catch {
      /* generic */
    }

    try {
      const stream = await tryStream({ video: true, audio: false });
      await attach(stream);
    } catch {
      setMessage("Allow camera access — photos are captured from the live camera only (no gallery picker).");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setMessage("Camera is not ready — refresh the page and try again.");
      return;
    }
    if (!cameraReady && !(video.videoWidth > 0)) {
      setMessage("Camera is still loading — wait 1–2 seconds, then tap Capture again.");
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setMessage("Video has no size yet — tap Start camera again.");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setMessage("Canvas error — try updating your browser or try again.");
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("Could not encode the photo — capture again.");
          return;
        }
        const file = new File([blob], `attendance-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPhotoFile(file);
        setMessage("Live photo captured.");
      },
      "image/jpeg",
      0.85,
    );
  };

  const getLocation = () => {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("This browser does not support location.");
      return;
    }
    setGpsPhase("getting");
    setLocationLabel("");
    setLocationDetail("");
    setOfficeDistanceM(null);
    setLocationLabelLoading(false);
    setCoords(null);

    void (async () => {
      try {
        const next = await acquireBestGpsFix(6500);
        setCoords(next);
        setGpsPhase("ready");
        setLocationLabelLoading(true);
        try {
          const res = await apiFetch(
            `/api/member/location-label?latitude=${encodeURIComponent(String(next.lat))}&longitude=${encodeURIComponent(String(next.lng))}`,
          );
          const data = ((await readJsonSafe(res)) || {}) as {
            label?: string;
            displayName?: string;
            distanceFromRegisteredOfficeMeters?: number;
          };
          const fallback = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
          const main = res.ok && data.label?.trim() ? data.label.trim() : fallback;
          setLocationLabel(main);
          const dn = data.displayName?.trim() || "";
          setLocationDetail(dn && dn.toLowerCase() !== main.toLowerCase() ? dn : "");
          setOfficeDistanceM(
            typeof data.distanceFromRegisteredOfficeMeters === "number"
              ? data.distanceFromRegisteredOfficeMeters
              : null,
          );
        } catch {
          setLocationLabel(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
          setLocationDetail("");
          setOfficeDistanceM(null);
        } finally {
          setLocationLabelLoading(false);
        }
      } catch {
        setGpsPhase("none");
        setMessage("Allow location permission — or try again near a window or outdoors.");
      }
    })();
  };

  const markAttendance = async () => {
    setLoading(true);
    setMessage("");
    if (!coords) {
      setMessage('Use "Live GPS — location lock" first to capture your location.');
      setLoading(false);
      return;
    }
    if (company?.id && selectedCompanyId && selectedCompanyId !== company.id) {
      setMessage("The selected company does not match your account company.");
      setLoading(false);
      return;
    }
    if (!photoFile) {
      setMessage("Capture a live photo from the camera (no gallery uploads).");
      setLoading(false);
      return;
    }

    const form = new FormData();
    form.append("latitude", String(coords.lat));
    form.append("longitude", String(coords.lng));
    form.append("photo", photoFile, photoFile.name);

    const res = await apiFetch("/api/member/attendance", { method: "POST", body: form });
    const data = ((await readJsonSafe(res)) || {}) as Record<string, unknown>;
    setLoading(false);
    if (!res.ok) {
      const hint = typeof data.hint === "string" ? data.hint : "";
      const cur = typeof data.currentLocalTime === "string" ? data.currentLocalTime : "";
      const extra = hint || (cur ? `Company timezone — local time now: ${cur}` : "");
      setMessage(String(data.error || "Attendance fail") + (extra ? ` — ${extra}` : ""));
      return;
    }
    setMessage(String(data.message || "OK"));
    setPhotoFile(null);
    await load();
  };

  const todayRow = company?.localToday ? history.find((r) => r.date === company.localToday) : undefined;
  const displayCompanyName = company?.name || companiesList.find((c) => c.id === selectedCompanyId)?.name || "";

  const memberSeries = useMemo(
    () =>
      buildMemberDaySeries(
        history.map((r) => ({ date: r.date, checkedInAt: r.checkedInAt, checkedOutAt: r.checkedOutAt })),
        company?.localToday,
        14,
      ),
    [history, company?.localToday],
  );
  const memberSummary = useMemo(() => summarizeSeries(memberSeries), [memberSeries]);
  const memberPie = useMemo(
    () => [
      { name: L.pieComplete, value: memberSummary.complete, color: "#22c55e" },
      { name: L.piePending, value: memberSummary.pending, color: "#f59e0b" },
      { name: L.pieAbsent, value: memberSummary.absent, color: "#94a3b8" },
    ],
    [memberSummary],
  );

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}

      {(companiesList.length > 0 || displayCompanyName) && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
          <label htmlFor="company-select" className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Company for attendance
          </label>
          {companiesList.length > 0 ? (
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {companiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p id="company-select" className="mt-2 text-lg font-bold text-slate-900">
              {displayCompanyName || "—"}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Each member account is linked to one company — shift times below follow that company.
          </p>
        </section>
      )}

      {company?.localToday && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              {L.field1Tag}
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{L.field1Title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{L.field1Help}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-800 dark:text-emerald-300">
                {L.statusComplete}: {memberSummary.complete}
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-900 dark:text-amber-200">
                {L.statusPending}: {memberSummary.pending}
              </span>
              <span className="rounded-full bg-slate-500/15 px-3 py-1 font-semibold text-slate-700 dark:text-zinc-300">
                {L.statusAbsent}: {memberSummary.absent}
              </span>
            </div>
            <div className="mt-6 max-w-md">
              <SummaryPie data={memberPie} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900 dark:text-violet-300">
              {L.field2Tag}
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{L.field2Title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{L.field2Help}</p>
            <div className="mt-6">
              <StatusBarChart data={memberSeries} />
            </div>
          </section>
        </div>
      )}

      <section
        className={`rounded-2xl border-2 p-6 shadow-sm transition-colors ${
          gpsPhase === "ready" && coords && !locationLabelLoading
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-sky-50"
            : "border-slate-200 bg-slate-50/90"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Live status</p>

        {gpsPhase === "none" && (
          <p className="mt-3 text-sm text-slate-600">
            Tap <strong>Live GPS</strong> below — then you will see the <strong>place name</strong> and lock status here.
          </p>
        )}

        {gpsPhase === "getting" && (
          <p className="mt-3 text-base font-medium text-slate-800">
            Improving GPS fix (about 6–7 seconds) — hold the phone near a window or outdoors; the first fix near home
            Wi‑Fi can be wrong, then it may settle to a more accurate office or street position.
          </p>
        )}

        {gpsPhase === "ready" && coords && locationLabelLoading && (
          <p className="mt-3 text-base font-medium text-slate-800">Looking up place name…</p>
        )}

        {gpsPhase === "ready" && coords && !locationLabelLoading && (
          <div className="mt-3 space-y-2">
            <p className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{locationLabel}</p>
            {locationDetail && (
              <p className="text-sm leading-relaxed text-slate-600" title={locationDetail}>
                Full address (map): {locationDetail.length > 160 ? `${locationDetail.slice(0, 160)}…` : locationDetail}
              </p>
            )}
            <p className="text-sm font-semibold text-emerald-700">Live location is locked</p>
            <p className="text-xs text-slate-500">
              GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              {coords.acc != null ? ` · accuracy ±${Math.round(coords.acc)}m` : ""}
            </p>
            {officeDistanceM != null && (
              <p className="text-xs font-medium text-indigo-800">
                Approximate distance from company map pin: {officeDistanceM}m ({(officeDistanceM / 1000).toFixed(1)} km)
              </p>
            )}
            {coords.acc != null &&
              coords.acc > 400 &&
              officeDistanceM != null &&
              officeDistanceM > 2500 && (
                <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  GPS accuracy is weak and you appear far from the office pin — the reading may still be an old home /
                  Wi‑Fi fix. Tap &quot;Live GPS&quot; again or retry outdoors.
                </p>
              )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={gpsPhase === "getting"}
          onClick={getLocation}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow hover:bg-slate-800 disabled:opacity-60"
        >
          {gpsPhase === "getting" ? "GPS fix..." : "Live GPS — location lock"}
        </button>
      </div>

      {company?.localToday && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="font-semibold text-slate-800 dark:text-zinc-100">
            {L.todayPrefix} ({company.localToday}) · {L.companyCalPhrase}
          </div>
          {!todayRow && (
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">{L.noRecordToday}</p>
          )}
          {todayRow && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div
                className={
                  rowStatusMeta(todayRow).className +
                  " inline-flex max-w-xs flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                }
              >
                <span className="font-semibold leading-tight">{rowStatusMeta(todayRow).primary}</span>
                <span className="text-[10px] font-normal leading-snug opacity-95">
                  {rowStatusMeta(todayRow).detail}
                </span>
              </div>
              {todayRow.checkedInAt && (
                <div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">{L.checkIn}</span>
                    <span className="text-slate-500 dark:text-zinc-500">: </span>
                    {formatCompanyDateTime(todayRow.checkedInAt, tz)}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">{L.checkOut}</span>
                    <span className="text-slate-500 dark:text-zinc-500">: </span>
                    {todayRow.checkedOutAt
                      ? formatCompanyDateTime(todayRow.checkedOutAt, tz)
                      : L.checkOutNotYet}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
        {company && (
          <p className="text-sm text-slate-600">
            Shift:{" "}
            <span className="font-semibold">
              {company.workStart} - {company.workEnd}
            </span>{" "}
            ({company.timezone}) · Reference map radius:{" "}
            <span className="font-semibold">{company.locationRadiusMeters}m</span>
            <span className="block pt-1 text-xs font-normal text-slate-500">
              Attendance uses your live location — you do not have to be inside the registered office radius.
            </span>
          </p>
        )}

        <h3 className="mt-4 text-base font-semibold text-slate-900">Live camera (capture only — no gallery)</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Camera start
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Live capture
          </button>
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Stop camera
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {cameraReady ? "Camera ready — tap Capture." : "After starting the camera, wait briefly for the preview."}
        </p>
        <video
          ref={videoRef}
          className="mt-3 aspect-video w-full max-w-lg rounded-xl border border-slate-200 bg-black object-cover"
          playsInline
          muted
          autoPlay
          onLoadedMetadata={syncVideoReady}
          onLoadedData={syncVideoReady}
          onCanPlay={syncVideoReady}
        />
        <canvas ref={canvasRef} className="hidden" />
        {photoFile && (
          <p className="mt-2 text-xs font-medium text-emerald-700">Live photo ready ({Math.round(photoFile.size / 1024)} KB)</p>
        )}

        <form
          className="mt-8 border-t border-slate-200 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void markAttendance();
          }}
        >
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Mark attendance here
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 text-center text-base font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-50 sm:py-5"
          >
            {loading ? "Sending…" : "Mark attendance (check-in / check-out)"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            First submit = check-in · second submit same day = check-out
          </p>
        </form>

        {message && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100">
          <span className="font-bold">{L.recordsTitle}</span>
          <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-zinc-400">Timezone: {tz}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-zinc-200">{L.thDay}</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-zinc-200">{L.thCheckInTime}</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-zinc-200">{L.thCheckOutTime}</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-zinc-200">{L.thStatus}</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-zinc-200">{L.thPhotos}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const st = rowStatusMeta(row);
                return (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-zinc-800">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800 dark:text-zinc-200">{row.date}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-zinc-200">
                      {formatCompanyDateTime(row.checkedInAt, tz)}
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-zinc-200">
                      {formatCompanyDateTime(row.checkedOutAt, tz)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex max-w-[220px] flex-col gap-0.5 rounded-lg px-2 py-1 text-xs font-medium ${st.className}`}>
                        <span className="leading-tight">{st.primary}</span>
                        <span className="text-[10px] font-normal leading-snug">{st.detail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        {row.checkInPhotoUrl && (
                          <a
                            className="text-blue-600 underline dark:text-blue-400"
                            href={row.checkInPhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={L.linkCheckInPhoto}
                          >
                            {L.linkCheckInPhoto}
                          </a>
                        )}
                        {row.checkOutPhotoUrl && (
                          <a
                            className="text-blue-600 underline dark:text-blue-400"
                            href={row.checkOutPhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={L.linkCheckOutPhoto}
                          >
                            {L.linkCheckOutPhoto}
                          </a>
                        )}
                        {!row.checkInPhotoUrl && !row.checkOutPhotoUrl && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && !loadError && (
                <tr>
                  <td className="px-4 py-4 text-slate-500 dark:text-zinc-400" colSpan={5}>
                    <span className="block text-sm">{L.noRecords}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
