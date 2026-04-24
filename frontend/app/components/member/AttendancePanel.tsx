"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import { getBrowserPosition, haversineKm } from "@/lib/liveLocation";
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
  isFake?: boolean;
};

type GpsPhase = "none" | "getting" | "ready";

const GPS_LOCK_MAX_AGE_BEFORE_SUBMIT_MS = 2 * 60 * 1000;

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
  if (row.isFake) {
    return {
      primary: L.statusFake,
      detail: L.statusFakeDetail,
      className: "bg-red-100 text-red-800 dark:bg-red-950/55 dark:text-red-200",
    };
  }
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
  const [submitKind, setSubmitKind] = useState<null | "check_in" | "check_out">(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsPhase, setGpsPhase] = useState<GpsPhase>("none");
  const [gpsError, setGpsError] = useState("");
  const [isDemoViewer, setIsDemoViewer] = useState(false);
  const [coordsCapturedAt, setCoordsCapturedAt] = useState<number | null>(null);
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
      demoMode?: boolean;
      error?: string;
      setupError?: string;
    };
    if (!res.ok) {
      setLoadError(data.error || "Could not load records — please log in again.");
      setHistory([]);
      setCompany(null);
      setCompaniesList([]);
      setSelectedCompanyId("");
      return;
    }
    if (typeof data.setupError === "string" && data.setupError.trim()) {
      setLoadError(data.setupError.trim());
      setHistory(data.history || []);
      setCompany(null);
      setCompaniesList([]);
      setSelectedCompanyId("");
      setIsDemoViewer(Boolean(data.demoMode));
      return;
    }
    setLoadError("");
    setHistory(data.history || []);
    setIsDemoViewer(Boolean(data.demoMode));
    const c = data.company || null;
    setCompany(c);
    let opts = Array.isArray(data.companies) ? data.companies.filter((x) => x?.id && x?.name) : [];
    if (c?.id) {
      opts = opts.filter((x) => String(x.id) === String(c.id));
    }
    if (opts.length === 0 && c?.id && c?.name) opts = [{ id: String(c.id), name: String(c.name) }];
    setCompaniesList(opts);
    if (c?.id) setSelectedCompanyId(String(c.id));
    else if (opts[0]?.id) setSelectedCompanyId(String(opts[0].id));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setMessage("Allow camera access. Photos are captured from the live camera only (no gallery upload).");
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

  /** Same pattern as Live-Location: one getCurrentPosition on button tap (prompt stays tied to the click). */
  const getLocation = useCallback(() => {
    setMessage("");
    setGpsError("");
    const pending = getBrowserPosition();
    setGpsPhase("getting");
    setCoords(null);
    setCoordsCapturedAt(null);
    void pending
      .then((next) => {
        setCoords(next);
        setCoordsCapturedAt(Date.now());
        setGpsPhase("ready");
      })
      .catch((err: unknown) => {
        setGpsPhase("none");
        setCoordsCapturedAt(null);
        const msg = err instanceof Error ? err.message : "Unable to fetch your location.";
        setGpsError(msg);
      });
  }, []);

  const markAttendance = async (action: "check_in" | "check_out") => {
    setMessage("");
    setSubmitKind(action);
    setLoading(true);
    try {
      if (isDemoViewer) {
        setMessage("Demo user is view-only. Attendance marking is disabled.");
        return;
      }

      const rowToday =
        company?.localToday != null
          ? history.find((r) => r.date === company.localToday)
          : undefined;

      if (action === "check_in") {
        if (rowToday?.checkedInAt && rowToday.checkedOutAt) {
          setMessage(L.hintSubmitComplete);
          return;
        }
        if (rowToday?.checkedInAt && !rowToday.checkedOutAt) {
          setMessage(L.hintSubmitCheckInBlocked);
          return;
        }
      }
      if (action === "check_out") {
        if (!rowToday?.checkedInAt) {
          setMessage(L.hintSubmitCheckOutNeedsIn);
          return;
        }
        if (rowToday.checkedOutAt) {
          setMessage(L.hintSubmitCheckOutDone);
          return;
        }
      }

      if (!coordsCapturedAt || Date.now() - coordsCapturedAt > GPS_LOCK_MAX_AGE_BEFORE_SUBMIT_MS) {
        setMessage('Your location lock has expired. Tap "Get my location" again to capture a fresh point.');
        return;
      }
      if (!coords) {
        setMessage('Tap "Get my location" first and allow the browser when it asks for this site.');
        return;
      }
      if (company?.id && selectedCompanyId && selectedCompanyId !== company.id) {
        setMessage("The selected company does not match your account company.");
        return;
      }
      if (!photoFile) {
        setMessage("Capture a live photo from the camera (no gallery uploads).");
        return;
      }

      const effectiveCompanyId = String(company?.id || selectedCompanyId || "");
      if (!effectiveCompanyId) {
        setMessage("Your company is missing on this account. Contact admin.");
        return;
      }

      const form = new FormData();
      form.append("companyId", effectiveCompanyId);
      form.append("latitude", String(coords.lat));
      form.append("longitude", String(coords.lng));
      form.append("action", action);
      form.append("photo", photoFile, photoFile.name);

      const res = await apiFetch("/api/member/attendance", { method: "POST", body: form });
      const data = ((await readJsonSafe(res)) || {}) as Record<string, unknown>;
      if (!res.ok) {
        const hint = typeof data.hint === "string" ? data.hint : "";
        const cur = typeof data.currentLocalTime === "string" ? data.currentLocalTime : "";
        const extra = hint || (cur ? `Company timezone — local time now: ${cur}` : "");
        setMessage(String(data.error || "Attendance fail") + (extra ? ` — ${extra}` : ""));
        return;
      }
      if (Boolean(data.isFake)) {
        setMessage(`${String(data.message || "Saved")} — Status: Fake (outside company radius).`);
      } else {
        setMessage(String(data.message || "Saved"));
      }
      setPhotoFile(null);
      await load();
    } finally {
      setLoading(false);
      setSubmitKind(null);
    }
  };

  const todayRow = company?.localToday ? history.find((r) => r.date === company.localToday) : undefined;
  const canSubmitCheckIn = Boolean(company?.localToday && !todayRow?.checkedInAt);
  const canSubmitCheckOut = Boolean(company?.localToday && todayRow?.checkedInAt && !todayRow?.checkedOutAt);
  const todayAttendanceDone = Boolean(todayRow?.checkedInAt && todayRow?.checkedOutAt);
  const displayCompanyName = company?.name || companiesList.find((c) => c.id === selectedCompanyId)?.name || "";

  const memberSeries = useMemo(
    () =>
      buildMemberDaySeries(
        history.map((r) => ({ date: r.date, checkedInAt: r.checkedInAt, checkedOutAt: r.checkedOutAt, isFake: r.isFake })),
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
      { name: L.pieFake, value: memberSummary.fake, color: "#ef4444" },
      { name: L.pieAbsent, value: memberSummary.absent, color: "#94a3b8" },
    ],
    [memberSummary],
  );

  const officeDistanceKm = useMemo(() => {
    if (!coords || !company) return null;
    const olat = company.officeLatitude;
    const olng = company.officeLongitude;
    if (!Number.isFinite(olat) || !Number.isFinite(olng)) return null;
    return haversineKm(coords.lat, coords.lng, olat, olng);
  }, [coords, company]);

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}

      {(companiesList.length > 0 || displayCompanyName) && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
          <label htmlFor="company-select" className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Your company
          </label>
          {!isDemoViewer && companiesList.length > 1 ? (
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
            Members are linked to one company — shift times below follow that company.
          </p>
          {isDemoViewer && (
            <p className="mt-2 text-xs font-semibold text-amber-700">Demo mode: company selection and attendance submit are disabled.</p>
          )}
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
              <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-900 dark:text-red-200">
                {L.statusFake}: {memberSummary.fake}
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
        className={`rounded-2xl border-2 p-5 shadow-sm transition-colors sm:p-6 ${
          gpsPhase === "ready" && coords
            ? "border-sky-300/90 bg-gradient-to-br from-sky-50/90 via-white to-violet-50/50 dark:border-sky-700/60 dark:from-sky-950/25 dark:via-zinc-900 dark:to-violet-950/20"
            : "border-slate-200 bg-slate-50/90 dark:border-zinc-700 dark:bg-zinc-900/60"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">Your location</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
          Turn on <strong>device location / GPS</strong>, then tap <strong>Get my location</strong> below. When the browser asks, choose{" "}
          <strong>Allow</strong> for this site so attendance can read your coordinates.
        </p>

        {gpsError && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
          >
            {gpsError}
          </div>
        )}

        {gpsPhase === "getting" && (
          <p className="mt-3 text-base font-medium text-slate-800 dark:text-zinc-100">Getting your location…</p>
        )}

        {gpsPhase === "ready" && coords && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-zinc-600 dark:bg-zinc-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Coordinates (saved with attendance)
              </p>
              <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-sky-600 underline decoration-sky-300/80 underline-offset-2 hover:text-sky-500 dark:text-sky-400 dark:decoration-sky-600/50"
              >
                Open in Google Maps →
              </a>
            </div>
            {officeDistanceKm != null && (
              <p className="text-sm text-slate-700 dark:text-zinc-300">
                Approx. distance to company office:{" "}
                <strong>
                  {officeDistanceKm < 1
                    ? `${Math.round(officeDistanceKm * 1000)} m`
                    : `${officeDistanceKm.toFixed(2)} km`}
                </strong>
                {company?.locationRadiusMeters != null ? (
                  <span className="text-slate-500 dark:text-zinc-500">
                    {" "}
                    (allowed radius {Math.round(company.locationRadiusMeters)} m)
                  </span>
                ) : null}
              </p>
            )}
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
              Location captured. Attendance will be submitted with these coordinates.
            </p>
          </div>
        )}

        <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-zinc-700">
          <button
            type="button"
            disabled={gpsPhase === "getting" || loading}
            onClick={() => getLocation()}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-500 hover:to-sky-500 disabled:opacity-55 dark:from-cyan-500 dark:to-sky-500 dark:hover:from-cyan-400 dark:hover:to-sky-400"
          >
            {gpsPhase === "getting" ? "Getting location…" : "Get my location"}
          </button>
        </div>
      </section>

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
            ({company.timezone})
            <span className="block pt-1 text-xs font-normal text-slate-500">
              Attendance uses your live location. If you are outside the company radius, status will be marked as Fake.
            </span>
          </p>
        )}

        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-zinc-100">{L.cameraSectionTitle}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{L.cameraSectionHelp}</p>
        <div className="mt-3 inline-flex w-full max-w-lg flex-wrap gap-1 rounded-xl border border-sky-100 bg-sky-50/40 p-1 shadow-inner dark:border-sky-900/40 dark:bg-sky-950/20">
          <button
            type="button"
            onClick={startCamera}
            disabled={loading}
            className="min-h-[38px] flex-1 rounded-lg border border-transparent bg-white/90 px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:px-3 sm:text-sm"
          >
            {L.cameraStart}
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            disabled={loading}
            className="min-h-[38px] flex-1 rounded-lg bg-cyan-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-500 sm:px-3 sm:text-sm"
          >
            {L.cameraCapture}
          </button>
          <button
            type="button"
            onClick={stopCamera}
            disabled={loading}
            className="min-h-[38px] flex-1 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:px-3 sm:text-sm"
          >
            {L.cameraStop}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
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
          <p className="mt-2 text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Live photo ready ({Math.round(photoFile.size / 1024)} KB)
          </p>
        )}

        <div className="mt-7 space-y-3 border-t border-slate-200 pt-5 dark:border-zinc-700">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">{L.submitSectionTitle}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">{L.submitSectionHelp}</p>
          </div>
          {company?.localToday && (
            <p className="rounded-lg border border-sky-100 bg-sky-50/70 px-2.5 py-1.5 text-center text-[11px] font-medium text-sky-900/90 dark:border-sky-900/35 dark:bg-sky-950/30 dark:text-sky-100/90">
              {todayAttendanceDone && L.hintSubmitComplete}
              {!todayAttendanceDone && canSubmitCheckIn && L.submitNextCheckIn}
              {!todayAttendanceDone && canSubmitCheckOut && L.submitNextCheckOut}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5 rounded-xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50/80 to-white p-3 shadow-sm dark:border-cyan-900/40 dark:from-cyan-950/25 dark:to-zinc-900/95">
              <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
                {L.submitCardArrivalTag}
              </p>
              <button
                type="button"
                disabled={loading || isDemoViewer || !company?.localToday || !canSubmitCheckIn}
                onClick={() => void markAttendance("check_in")}
                className="w-full rounded-lg bg-cyan-600 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-cyan-600 dark:hover:bg-cyan-500"
              >
                {loading && submitKind === "check_in" ? L.submittingCheckIn : L.btnSubmitCheckIn}
              </button>
              <p className="text-center text-[10px] leading-snug text-slate-600 dark:text-zinc-400">
                {L.submitCardArrivalHelp}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-3 shadow-sm dark:border-violet-900/40 dark:from-violet-950/25 dark:to-zinc-900/95">
              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">
                {L.submitCardLeavingTag}
              </p>
              <button
                type="button"
                disabled={loading || isDemoViewer || !company?.localToday || !canSubmitCheckOut}
                onClick={() => void markAttendance("check_out")}
                className="w-full rounded-lg bg-violet-600 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-violet-600 dark:hover:bg-violet-500"
              >
                {loading && submitKind === "check_out" ? L.submittingCheckOut : L.btnSubmitCheckOut}
              </button>
              <p className="text-center text-[10px] leading-snug text-slate-600 dark:text-zinc-400">
                {L.submitCardLeavingHelp}
              </p>
            </div>
          </div>
        </div>

        {message && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
          <span className="text-sm font-bold">{L.recordsTitle}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm text-inherit">
            <thead className="bg-slate-100 text-slate-950 dark:bg-zinc-800 dark:text-zinc-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">{L.thDay}</th>
                <th className="px-4 py-3 text-xs font-semibold">{L.thCheckInTime}</th>
                <th className="px-4 py-3 text-xs font-semibold">{L.thCheckOutTime}</th>
                <th className="px-4 py-3 text-xs font-semibold">{L.thStatus}</th>
                <th className="px-4 py-3 text-xs font-semibold">{L.thPhotos}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-950">
              {history.map((row) => {
                const st = rowStatusMeta(row);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200 bg-white text-inherit dark:border-zinc-700 dark:bg-zinc-950 even:bg-slate-50/80 dark:even:bg-zinc-900/70"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-inherit">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-inherit">{formatCompanyDateTime(row.checkedInAt, tz)}</td>
                    <td className="px-4 py-3 font-medium text-inherit">{formatCompanyDateTime(row.checkedOutAt, tz)}</td>
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
                            className="font-semibold text-sky-700 underline decoration-sky-600/40 underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:decoration-sky-400/50 dark:hover:text-sky-200"
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
                            className="font-semibold text-sky-700 underline decoration-sky-600/40 underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:decoration-sky-400/50 dark:hover:text-sky-200"
                            href={row.checkOutPhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={L.linkCheckOutPhoto}
                          >
                            {L.linkCheckOutPhoto}
                          </a>
                        )}
                        {!row.checkInPhotoUrl && !row.checkOutPhotoUrl && (
                          <span className="text-slate-600 dark:text-zinc-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && !loadError && (
                <tr>
                  <td className="px-4 py-4 font-medium text-inherit" colSpan={5}>
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
