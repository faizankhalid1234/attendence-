"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import { getBrowserPosition } from "@/lib/liveLocation";
import { L } from "@/lib/attendanceLabels";
import { mediaSrc } from "@/lib/mediaUrl";
import SummaryPie from "@/app/components/charts/SummaryPie";
import { buildMemberDaySeries, datesInMonthOf, summarizeSeries } from "@/lib/attendanceSeries";

type CompanyOption = { id: string; name: string };

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

type Row = {
  id: string;
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkInDistanceMeters?: number | null;
  checkOutDistanceMeters?: number | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
  isFake?: boolean;
};

/** API may send full ISO for `date`; charts already normalize with slice(0,10). */
function normDateYmd(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().slice(0, 10);
}

function pickNum(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    if (typeof v === "string") return v || null;
    return String(v);
  }
  return null;
}

function normalizeHistoryRow(raw: unknown): Row {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dateRaw = pickStr(o, "date") || "";
  return {
    id: String(o.id ?? ""),
    date: normDateYmd(dateRaw),
    checkedInAt: pickStr(o, "checkedInAt", "checked_in_at"),
    checkedOutAt: pickStr(o, "checkedOutAt", "checked_out_at"),
    checkInLatitude: pickNum(o, "checkInLatitude", "check_in_latitude"),
    checkInLongitude: pickNum(o, "checkInLongitude", "check_in_longitude"),
    checkOutLatitude: pickNum(o, "checkOutLatitude", "check_out_latitude"),
    checkOutLongitude: pickNum(o, "checkOutLongitude", "check_out_longitude"),
    checkInDistanceMeters: pickNum(o, "checkInDistanceMeters", "check_in_distance_meters"),
    checkOutDistanceMeters: pickNum(o, "checkOutDistanceMeters", "check_out_distance_meters"),
    checkInPhotoUrl: pickStr(o, "checkInPhotoUrl", "check_in_photo_url"),
    checkOutPhotoUrl: pickStr(o, "checkOutPhotoUrl", "check_out_photo_url"),
    isFake: Boolean(o.isFake ?? o.is_fake),
  };
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

function weekdayShort(ymd: string, timeZone: string): string {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", timeZone });
  } catch {
    return "";
  }
}

function ymAddMonths(ym: string, delta: number): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymAddOne(ym: string): string {
  return ymAddMonths(ym, 1);
}

/** YYYY-MM → "April 2026" (calendar label). */
function formatMonthHeading(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return ym;
  return new Date(y, mo - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function rowStatusMeta(row: Row): { primary: string; detail: string; className: string } {
  if (row.isFake) {
    return {
      primary: L.statusFake,
      detail: L.statusFakeDetail,
      className: "border border-red-200 bg-red-50 text-red-800",
    };
  }
  if (row.checkedInAt && row.checkedOutAt) {
    return {
      primary: L.statusComplete,
      detail: L.statusCompleteDetail,
      className: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }
  if (row.checkedInAt) {
    return {
      primary: L.statusPending,
      detail: L.statusPendingDetail,
      className: "border border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    primary: L.statusAbsent,
    detail: L.statusAbsentDetail,
    className: "border border-gray-200 bg-gray-100 text-gray-600",
  };
}

function fmtCoord(lat?: number | string | null, lng?: number | string | null): string {
  const a = lat == null || lat === "" ? NaN : Number(lat);
  const b = lng == null || lng === "" ? NaN : Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "-";
  return `${a.toFixed(5)}, ${b.toFixed(5)}`;
}

function osmHref(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(lat))}&mlon=${encodeURIComponent(String(lng))}#map=16/${lat}/${lng}`;
}

function geoPair(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = lat == null || lat === "" ? NaN : Number(lat);
  const b = lng == null || lng === "" ? NaN : Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
}

/** Month table: GPS only (Check-out | Location | Status). */
function MonthLocationCell({ row }: { row: Row | undefined }) {
  if (!row?.checkedInAt) {
    return <span className="text-slate-400">—</span>;
  }

  const linkCls =
    "inline-block font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800";

  const block = (label: string, latKey: keyof Row, lngKey: keyof Row, dmKey: keyof Row) => {
    const g = geoPair(row[latKey], row[lngKey]);
    const dm = row[dmKey];
    return (
      <div className="rounded-md border border-slate-100/90 bg-slate-50/50 px-2 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {g ? (
          <>
            <p className="mt-0.5 font-mono text-[11px] leading-snug tabular-nums text-slate-800">{fmtCoord(g.lat, g.lng)}</p>
            {dm != null && Number.isFinite(Number(dm)) ? (
              <p className="mt-0.5 text-[11px] text-slate-600">{Math.round(Number(dm))} m</p>
            ) : null}
            <p className="mt-1">
              <a className={linkCls} href={osmHref(g.lat, g.lng)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                {L.mapLink}
              </a>
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[11px] text-amber-900/90">{L.coordNotRecorded}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[14rem] space-y-2">
      {block("IN", "checkInLatitude", "checkInLongitude", "checkInDistanceMeters")}
      {row.checkedOutAt ? block("OUT", "checkOutLatitude", "checkOutLongitude", "checkOutDistanceMeters") : null}
    </div>
  );
}

async function acquireCameraStream(): Promise<MediaStream> {
  const tryStream = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints);
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  for (const c of attempts) {
    try {
      return await tryStream(c);
    } catch {
      /* try next */
    }
  }
  throw new Error("CAMERA_DENIED");
}

function jpegFileFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<File> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w <= 0 || h <= 0) return Promise.reject(new Error("NO_FRAMES"));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("NO_CANVAS"));
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("ENCODE_FAIL"));
        else resolve(new File([blob], `attendance-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85,
    );
  });
}

type AttendancePanelProps = { embedded?: boolean };

export default function AttendancePanel({ embedded = false }: AttendancePanelProps) {
  const [history, setHistory] = useState<Row[]>([]);
  const [company, setCompany] = useState<CompanyRules | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [isDemoViewer, setIsDemoViewer] = useState(false);
  const [permissionModal, setPermissionModal] = useState<null | "location" | "camera">(null);
  const [permissionExtra, setPermissionExtra] = useState("");
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [viewMonthYm, setViewMonthYm] = useState<string | null>(null);
  /** Live preview for check-in / check-out (visible in modal). */
  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [liveSession, setLiveSession] = useState<null | { action: "check_in" | "check_out"; lat: number; lng: number }>(
    null,
  );
  const [livePhase, setLivePhase] = useState<"connecting" | "live">("connecting");
  const [liveSaving, setLiveSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "check_in" | "check_out">(null);

  const tz = company?.timezone || "Asia/Karachi";

  const load = useCallback(async () => {
    setLoadError("");
    const res = await apiFetch("/api/member/attendance");
    const data = ((await readJsonSafe(res)) || {}) as {
      history?: unknown[];
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
      setSelectedCompanyId("");
      return;
    }
    if (typeof data.setupError === "string" && data.setupError.trim()) {
      setLoadError(data.setupError.trim());
      setHistory((Array.isArray(data.history) ? data.history : []).map(normalizeHistoryRow));
      setCompany(null);
      setSelectedCompanyId("");
      setIsDemoViewer(Boolean(data.demoMode));
      return;
    }
    setLoadError("");
    setHistory((Array.isArray(data.history) ? data.history : []).map(normalizeHistoryRow));
    setIsDemoViewer(Boolean(data.demoMode));
    const c = data.company || null;
    setCompany(c);
    if (c?.id) setSelectedCompanyId(String(c.id));
    else setSelectedCompanyId("");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const todayYm = company?.localToday?.slice(0, 7) ?? "";

  const monthChoices = useMemo(() => {
    if (!todayYm) return [];
    const capEarly = ymAddMonths(todayYm, -23);
    let historyMin = todayYm;
    for (const r of history) {
      const ym = r.date?.slice(0, 7);
      if (ym && ym < historyMin) historyMin = ym;
    }
    const minYm = capEarly < historyMin ? capEarly : historyMin;
    const out: string[] = [];
    let cur = minYm;
    while (cur <= todayYm) {
      out.push(cur);
      cur = ymAddOne(cur);
    }
    return out.reverse();
  }, [todayYm, history]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (livePreviewRef.current) livePreviewRef.current.srcObject = null;
  };

  useEffect(() => () => stopCamera(), []);

  /** Start live camera when modal session is active. */
  useEffect(() => {
    if (!liveSession) return;
    let cancelled = false;
    const run = async () => {
      try {
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        const stream = await acquireCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const el = livePreviewRef.current;
        if (!el) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        el.srcObject = stream;
        try {
          await el.play();
        } catch {
          /* some browsers still show frames */
        }
        const deadline = Date.now() + 15000;
        while (!cancelled && el.videoWidth === 0 && Date.now() < deadline) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
        if (cancelled) return;
        if (el.videoWidth === 0) {
          stopCamera();
          setLivePhase("connecting");
          setLiveSession(null);
          setPermissionExtra(
            "Camera opened but no video frames yet. Close other apps using the camera, allow camera for this site, and try again.",
          );
          setPermissionModal("camera");
          return;
        }
        setLivePhase("live");
      } catch {
        if (!cancelled) {
          stopCamera();
          setLivePhase("connecting");
          setLiveSession(null);
          setPermissionExtra(
            "Could not open the camera. In the address bar: Site settings → Camera → Allow for this site, then try again.",
          );
          setPermissionModal("camera");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [liveSession]);

  const closeLiveCapture = useCallback(() => {
    stopCamera();
    setLiveSession(null);
    setLivePhase("connecting");
    setLiveSaving(false);
  }, []);

  const dismissPermissionModal = useCallback(() => {
    setPermissionModal(null);
    setPermissionExtra("");
  }, []);

  const beginMarkAttendance = async (action: "check_in" | "check_out") => {
    setMessage("");
    if (isDemoViewer) {
      setMessage("Demo user is view-only. Attendance marking is disabled.");
      return;
    }

    const rowToday =
      company?.localToday != null
        ? history.find((r) => normDateYmd(r.date) === normDateYmd(company.localToday))
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

    if (company?.id && selectedCompanyId && selectedCompanyId !== company.id) {
      setMessage("The selected company does not match your account company.");
      return;
    }

    const effectiveCompanyId = String(company?.id || selectedCompanyId || "");
    if (!effectiveCompanyId) {
      setMessage("Your company is missing on this account. Contact admin.");
      return;
    }

    setPendingAction(action);
    setLocating(true);
    try {
      const coords = await getBrowserPosition();
      setPermissionExtra("");
      setLivePhase("connecting");
      setLiveSession({ action, lat: coords.lat, lng: coords.lng });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read your location.";
      setPermissionExtra(msg);
      setPermissionModal("location");
    } finally {
      setLocating(false);
      setPendingAction(null);
    }
  };

  const submitLiveCapture = async () => {
    if (!liveSession || livePhase !== "live" || !livePreviewRef.current || !canvasRef.current) return;
    const v = livePreviewRef.current;
    const canvas = canvasRef.current;
    if (v.videoWidth <= 0 || v.videoHeight <= 0) {
      setMessage("Camera is not ready yet — wait a moment and try again.");
      return;
    }

    const effectiveCompanyId = String(company?.id || selectedCompanyId || "");
    setLiveSaving(true);
    setMessage("");
    try {
      const photoFile = await jpegFileFromVideo(v, canvas);

      const form = new FormData();
      form.append("companyId", effectiveCompanyId);
      form.append("latitude", String(liveSession.lat));
      form.append("longitude", String(liveSession.lng));
      form.append("action", liveSession.action);
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
      stopCamera();
      if (livePreviewRef.current) livePreviewRef.current.srcObject = null;
      if (Boolean(data.isFake)) {
        setMessage(`${String(data.message || "Saved")} — Status: Fake (outside company radius).`);
      } else {
        setMessage(String(data.message || "Saved"));
      }
      setLiveSession(null);
      setLivePhase("connecting");
      await load();
    } catch {
      setMessage("Could not capture photo — try again.");
    } finally {
      setLiveSaving(false);
    }
  };

  const todayRow = company?.localToday
    ? history.find((r) => normDateYmd(r.date) === normDateYmd(company.localToday))
    : undefined;
  const canSubmitCheckIn = Boolean(company?.localToday && !todayRow?.checkedInAt);
  const canSubmitCheckOut = Boolean(company?.localToday && todayRow?.checkedInAt && !todayRow?.checkedOutAt);
  const todayAttendanceDone = Boolean(todayRow?.checkedInAt && todayRow?.checkedOutAt);

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

  const ymEffective = useMemo(() => {
    if (!todayYm) return "";
    if (monthChoices.length === 0) return todayYm;
    if (viewMonthYm == null || viewMonthYm === "") return todayYm;
    if (viewMonthYm > todayYm) return todayYm;
    if (!monthChoices.includes(viewMonthYm)) return monthChoices[0]!;
    return viewMonthYm;
  }, [todayYm, viewMonthYm, monthChoices]);

  const monthDates = useMemo(() => {
    if (!ymEffective) return [];
    return datesInMonthOf(`${ymEffective}-01`);
  }, [ymEffective]);

  const detailRow = useMemo(() => {
    if (!detailDate) return undefined;
    return history.find((r) => normDateYmd(r.date) === detailDate);
  }, [detailDate, history]);

  const cell =
    "border-b border-slate-200/90 bg-white/90 px-3 py-2.5 align-top text-sm text-slate-800 last:border-b-0 sm:px-4";
  const head =
    "border-b border-indigo-100/90 bg-gradient-to-r from-indigo-50/90 to-violet-50/70 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-950/90 sm:px-4";
  const panelShell = embedded
    ? "w-full overflow-hidden text-sm text-slate-800"
    : "w-full overflow-hidden rounded-2xl border border-indigo-100/80 bg-gradient-to-b from-white via-indigo-50/20 to-violet-50/25 text-sm text-slate-800 shadow-lg shadow-indigo-950/10 ring-1 ring-slate-900/5";

  return (
    <div className={panelShell}>
      {loadError && (
        <div className="border-b border-red-200/80 bg-gradient-to-r from-red-50 to-amber-50/40 px-4 py-3 text-sm font-medium text-red-900">
          {loadError}
        </div>
      )}

      <table className="w-full border-collapse">
        <tbody>
          {company?.localToday && (
            <>
              <tr>
                <th colSpan={2} className={head}>
                  {L.field1Title}
                </th>
              </tr>
              <tr>
                <td colSpan={2} className={cell}>
                  <p className="mb-3 rounded-lg bg-white/80 px-2 py-1.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200/60">
                    {L.statusComplete}: {memberSummary.complete} · {L.statusPending}: {memberSummary.pending} ·{" "}
                    {L.statusFake}: {memberSummary.fake} · {L.statusAbsent}: {memberSummary.absent}
                  </p>
                  <div className="mx-auto max-w-md rounded-2xl border border-indigo-100/80 bg-white/90 p-3 shadow-inner shadow-indigo-950/5">
                    <SummaryPie data={memberPie} />
                  </div>
                </td>
              </tr>

              <tr>
                <th colSpan={2} className={head}>
                  {L.submitSectionTitle}
                </th>
              </tr>
              <tr>
                <td colSpan={2} className={`${cell} !bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40`}>
                  <div className="rounded-2xl border border-indigo-100/90 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                    {company && (
                      <p className="text-xs leading-relaxed text-slate-600">
                        <span className="font-semibold text-indigo-950/90">Shift</span> {company.workStart}–{company.workEnd}{" "}
                        <span className="rounded-md bg-indigo-100/80 px-1.5 py-0.5 font-mono text-[11px] text-indigo-900">
                          {company.timezone}
                        </span>
                        . {L.submitSectionHelp}
                      </p>
                    )}
                    {company?.localToday && (
                      <p className="mt-3 text-sm font-medium text-indigo-950/90">
                        {todayAttendanceDone && L.hintSubmitComplete}
                        {!todayAttendanceDone && canSubmitCheckIn && L.submitNextCheckIn}
                        {!todayAttendanceDone && canSubmitCheckOut && L.submitNextCheckOut}
                      </p>
                    )}
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={
                          locating ||
                          liveSession !== null ||
                          liveSaving ||
                          isDemoViewer ||
                          !company?.localToday ||
                          !canSubmitCheckIn
                        }
                        onClick={() => void beginMarkAttendance("check_in")}
                        className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                      >
                        {locating && pendingAction === "check_in" ? L.liveCaptureLocating : L.btnSubmitCheckIn}
                      </button>
                      <button
                        type="button"
                        disabled={
                          locating ||
                          liveSession !== null ||
                          liveSaving ||
                          isDemoViewer ||
                          !company?.localToday ||
                          !canSubmitCheckOut
                        }
                        onClick={() => void beginMarkAttendance("check_out")}
                        className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-indigo-200/90 bg-white px-4 py-3 text-center text-sm font-semibold text-indigo-900 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                      >
                        {locating && pendingAction === "check_out" ? L.liveCaptureLocating : L.btnSubmitCheckOut}
                      </button>
                    </div>
                    {message && (
                      <p className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs leading-relaxed text-slate-800">
                        {message}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {company?.localToday && monthDates.length > 0 && (
        <div className="overflow-x-auto border-t border-indigo-100/80 bg-white/40">
          <table className="w-full min-w-[48rem] border-collapse">
            <thead>
              <tr>
                <th colSpan={5} className={`${head} font-semibold normal-case tracking-normal`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <span className="block text-sm normal-case">{L.monthByDateTitle}</span>
                      <span className="mt-0.5 block text-xs font-normal normal-case text-gray-600">{L.monthByDateHelp}</span>
                    </div>
                    <label className="flex flex-wrap items-center gap-2 text-xs font-normal normal-case">
                      <span className="whitespace-nowrap text-gray-800">{L.monthPickerLabel}</span>
                      <select
                        value={ymEffective}
                        onChange={(e) => setViewMonthYm(e.target.value)}
                        className="max-w-[14rem] rounded-lg border border-indigo-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25"
                      >
                        {monthChoices.map((ym) => (
                          <option key={ym} value={ym}>
                            {formatMonthHeading(ym)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </th>
              </tr>
              <tr>
                <th className={`${head} w-[10rem]`}>{L.thDay}</th>
                <th className={head}>{L.thCheckInTime}</th>
                <th className={head}>{L.thCheckOutTime}</th>
                <th className={`${head} w-[14rem]`}>{L.thLocation}</th>
                <th className={`${head} w-[7.5rem] text-right`}>{L.thStatus}</th>
              </tr>
            </thead>
            <tbody>
              {monthDates.map((dateYmd, idx) => {
                const row = history.find((r) => normDateYmd(r.date) === dateYmd);
                const synthetic: Row = row || {
                  id: `absent-${dateYmd}`,
                  date: dateYmd,
                  checkedInAt: null,
                  checkedOutAt: null,
                  checkInLatitude: null,
                  checkInLongitude: null,
                  checkOutLatitude: null,
                  checkOutLongitude: null,
                  checkInDistanceMeters: null,
                  checkOutDistanceMeters: null,
                  checkInPhotoUrl: null,
                  checkOutPhotoUrl: null,
                  isFake: false,
                };
                const st = rowStatusMeta(synthetic);
                const stripe = idx % 2 === 0 ? "bg-white/95" : "bg-indigo-50/25";
                return (
                  <tr
                    key={dateYmd}
                    className={`cursor-pointer border-t border-indigo-100/50 transition hover:bg-violet-50/40 ${stripe}`}
                    onClick={() => setDetailDate(dateYmd)}
                  >
                    <td className={cell}>
                      <span className="text-gray-500">{weekdayShort(dateYmd, tz)}</span>{" "}
                      <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">{dateYmd}</span>
                    </td>
                    <td className={`${cell} text-xs tabular-nums text-gray-800`}>
                      {row?.checkedInAt ? formatCompanyDateTime(row.checkedInAt, tz) : "—"}
                    </td>
                    <td className={`${cell} text-xs tabular-nums text-gray-800`}>
                      {!row?.checkedInAt ? "—" : row.checkedOutAt ? formatCompanyDateTime(row.checkedOutAt, tz) : L.checkOutNotYet}
                    </td>
                    <td className={`${cell} align-top`}>
                      <MonthLocationCell row={row} />
                    </td>
                    <td className={`${cell} text-right align-top`}>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${st.className}`}>{st.primary}</span>
                      <span className="mt-0.5 block text-right text-[10px] font-normal leading-tight text-gray-500">{st.detail}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {liveSession && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-capture-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !liveSaving) closeLiveCapture();
          }}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-indigo-100/90 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
              <h2 id="live-capture-title" className="text-base font-bold text-white sm:text-lg">
                {liveSession.action === "check_in" ? L.liveCaptureTitleCheckIn : L.liveCaptureTitleCheckOut}
              </h2>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-center">
                <p className="text-xs font-semibold text-emerald-900">{L.liveCaptureGotLocation}</p>
                <p className="mt-1 font-mono text-[11px] text-emerald-800/90">
                  {liveSession.lat.toFixed(5)}, {liveSession.lng.toFixed(5)}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video
                  ref={livePreviewRef}
                  className="mx-auto max-h-[min(55vh,420px)] w-full object-contain"
                  playsInline
                  muted
                  autoPlay
                />
                {livePhase === "connecting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 px-4 text-center">
                    <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                    <p className="text-sm font-medium text-white">{L.liveCaptureStartingCamera}</p>
                  </div>
                )}
              </div>
              <p className="text-center text-xs leading-relaxed text-slate-600">{L.liveCaptureHelp}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={liveSaving}
                  onClick={() => closeLiveCapture()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {L.btnCancelLiveCapture}
                </button>
                <button
                  type="button"
                  disabled={livePhase !== "live" || liveSaving}
                  onClick={() => void submitLiveCapture()}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40"
                >
                  {liveSaving ? L.liveCaptureSaving : L.btnCaptureSubmit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {permissionModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissPermissionModal();
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-indigo-100/90 bg-white shadow-2xl shadow-indigo-950/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                {permissionModal === "location" ? L.permModalLocationTitle : L.permModalCameraTitle}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-slate-600">
                {permissionModal === "location" ? L.permModalLocationBody : L.permModalCameraBody}
              </p>
              {permissionExtra.trim() ? (
                <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-900">{L.permModalDetailLabel}</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-950/90">{permissionExtra}</p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => dismissPermissionModal()}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500"
              >
                {L.permModalClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailDate && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailDate(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-indigo-100/90 bg-white text-slate-800 shadow-2xl shadow-indigo-950/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 sm:px-5">
              <h2 id="day-detail-title" className="text-sm font-bold text-white sm:text-base">
                {detailDate} · {weekdayShort(detailDate, tz)}
              </h2>
              <button
                type="button"
                onClick={() => setDetailDate(null)}
                className="shrink-0 rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
              >
                {L.dayDetailClose}
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              {detailRow ? (
                <div className="space-y-5">
                  {detailRow.checkInPhotoUrl ? (
                    <figure className="overflow-hidden rounded-xl border border-indigo-100/90 bg-slate-50/80 shadow-inner">
                      <figcaption className="border-b border-indigo-100/80 bg-white/90 px-3 py-2 text-xs font-semibold text-indigo-950">
                        {L.linkCheckInPhoto}
                      </figcaption>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaSrc(detailRow.checkInPhotoUrl)}
                        alt=""
                        className="max-h-64 w-full object-contain bg-white"
                      />
                      <div className="border-t border-indigo-100/80 bg-white/90 px-3 py-2">
                        <a
                          className="text-xs font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                          href={mediaSrc(detailRow.checkInPhotoUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {L.dayDetailOpenFull}
                        </a>
                      </div>
                    </figure>
                  ) : null}
                  {detailRow.checkOutPhotoUrl ? (
                    <figure className="overflow-hidden rounded-xl border border-violet-100/90 bg-slate-50/80 shadow-inner">
                      <figcaption className="border-b border-violet-100/80 bg-white/90 px-3 py-2 text-xs font-semibold text-violet-950">
                        {L.linkCheckOutPhoto}
                      </figcaption>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaSrc(detailRow.checkOutPhotoUrl)}
                        alt=""
                        className="max-h-64 w-full object-contain bg-white"
                      />
                      <div className="border-t border-violet-100/80 bg-white/90 px-3 py-2">
                        <a
                          className="text-xs font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                          href={mediaSrc(detailRow.checkOutPhotoUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {L.dayDetailOpenFull}
                        </a>
                      </div>
                    </figure>
                  ) : null}
                  {!detailRow.checkInPhotoUrl && !detailRow.checkOutPhotoUrl && (
                    <p className="rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                      {L.dayDetailNoPhotos}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-4 text-sm text-slate-600">{L.statusAbsentDetail}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
