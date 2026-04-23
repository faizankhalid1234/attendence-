"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type LocationHelpKind = "permission" | "services" | "timeout" | "unsupported" | "unknown";

function classifyLocationError(err: unknown): LocationHelpKind {
  if (err instanceof Error && err.message === "no geolocation") return "unsupported";
  const geoErr = err as GeolocationPositionError | undefined;
  if (geoErr && typeof geoErr.code === "number") {
    if (geoErr.code === 1) return "permission";
    if (geoErr.code === 2) return "services";
    if (geoErr.code === 3) return "timeout";
  }
  return "unknown";
}

type SavedMemberGps = {
  companyId: string;
  lat: number;
  lng: number;
  acc?: number;
  label: string;
  detail: string;
  savedAt: number;
};

const GPS_SESSION_PREFIX = "attendance_member_live_gps:";
const GPS_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MOBILE_LOC_TIP_KEY = "attendance_mobile_location_tip_dismissed_v1";

function gpsSessionKey(companyId: string) {
  return `${GPS_SESSION_PREFIX}${companyId}`;
}

function readGpsSession(companyId: string | undefined): SavedMemberGps | null {
  if (typeof window === "undefined" || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(gpsSessionKey(companyId));
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedMemberGps;
    if (!v || String(v.companyId) !== String(companyId)) return null;
    if (typeof v.lat !== "number" || typeof v.lng !== "number") return null;
    if (Date.now() - (v.savedAt || 0) > GPS_SESSION_MAX_AGE_MS) return null;
    return v;
  } catch {
    return null;
  }
}

function writeGpsSession(payload: SavedMemberGps) {
  try {
    sessionStorage.setItem(gpsSessionKey(payload.companyId), JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

/** Human hint when GPS ring is wide — place name can be a nearby area, not exact plot. */
function gpsAccuracyNote(acc: number | undefined | null): string | null {
  if (acc == null) return null;
  if (acc > 400) {
    return "GPS accuracy bahut weak hai (±400m+). Attendance isi GPS point par save hogi — jagah ka naam map ka nazdeeki ilaqa ho sakta hai. Behtar ke liye khuli jagah par dubara Live GPS dabayein.";
  }
  if (acc > 200) {
    return "GPS accuracy medium hai. Neeche wala naam OpenStreetMap ka is point ke qareeb ka address hai — agar lagta hai galat ilaqa hai to dubara Live GPS try karein (window / bahir).";
  }
  if (acc > 80) {
    return "Chhoti GPS error ho sakti hai — naam thora aas paas ka area dikha sakta hai; lat/long hi aapka exact lock hai.";
  }
  return null;
}

function posToGps(pos: GeolocationPosition): { lat: number; lng: number; acc?: number } {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    acc: pos.coords.accuracy ?? undefined,
  };
}

function pickBetterFix(a: GeolocationPosition, b: GeolocationPosition): GeolocationPosition {
  const aa = a.coords.accuracy ?? 1e9;
  const bb = b.coords.accuracy ?? 1e9;
  return bb < aa ? b : a;
}

/**
 * Live device fix: fresh read (`maximumAge: 0`). If accuracy is weak (common indoors / Wi‑Fi),
 * briefly samples `watchPosition` and keeps the **tightest accuracy** reading — closer to where you actually are.
 */
function acquireRefinedLivePosition(totalTimeoutMs: number): Promise<{ lat: number; lng: number; acc?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no geolocation"));
      return;
    }
    const geo = navigator.geolocation;
    const firstTimeout = Math.max(5000, Math.min(totalTimeoutMs, 30000));
    const goodEnoughM = 85;
    const refineMaxMs = Math.min(6000, Math.max(2800, Math.floor(firstTimeout / 4)));

    geo.getCurrentPosition(
      (first) => {
        const firstAcc = first.coords.accuracy ?? 1e9;
        if (firstAcc <= goodEnoughM) {
          resolve(posToGps(first));
          return;
        }

        let best = first;
        let settled = false;
        let watchId: number | null = null;
        let timerId: number | null = null;

        const cleanup = () => {
          if (watchId !== null) {
            geo.clearWatch(watchId);
            watchId = null;
          }
          if (timerId !== null) {
            window.clearTimeout(timerId);
            timerId = null;
          }
        };

        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(posToGps(best));
        };

        watchId = geo.watchPosition(
          (pos) => {
            best = pickBetterFix(best, pos);
            const acc = pos.coords.accuracy ?? 1e9;
            if (acc <= 45) finish();
          },
          () => {
            /* ignore transient watch errors */
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: refineMaxMs + 4000 },
        ) as unknown as number;

        timerId = window.setTimeout(finish, refineMaxMs) as unknown as number;
      },
      (err) => reject(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: firstTimeout },
    );
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
  const [locationLabelLoading, setLocationLabelLoading] = useState(false);
  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  const [locationHelpKind, setLocationHelpKind] = useState<LocationHelpKind>("unknown");
  const [showMobileLocTip, setShowMobileLocTip] = useState(false);
  const [locationQualityNote, setLocationQualityNote] = useState<string | null>(null);
  const [isDemoViewer, setIsDemoViewer] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const getLocationRef = useRef<(opts?: { suppressRepeatedPermissionModal?: boolean }) => void>(() => {});
  const retryGpsOnVisibleRef = useRef(false);
  /** After "Allow this site location", avoid reopening the same modal in a loop if still blocked. */
  const skipNextPermissionDeniedModalRef = useRef(false);

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
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(MOBILE_LOC_TIP_KEY);
      const mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setShowMobileLocTip(Boolean(mobile && !dismissed));
    } catch {
      setShowMobileLocTip(false);
    }
  }, []);

  /** Restore last successful live GPS lock for this company (same browser tab session). */
  useEffect(() => {
    const id = company?.id;
    if (!id) return;
    const saved = readGpsSession(String(id));
    if (!saved) return;
    setCoords({ lat: saved.lat, lng: saved.lng, acc: saved.acc });
    setLocationLabel(saved.label);
    setLocationDetail(saved.detail);
    setLocationQualityNote(gpsAccuracyNote(saved.acc));
    setGpsPhase("ready");
    setLocationLabelLoading(false);
  }, [company?.id]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (!retryGpsOnVisibleRef.current) return;
      retryGpsOnVisibleRef.current = false;
      getLocationRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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

  const openLocationHelp = (kind: LocationHelpKind) => {
    setLocationHelpKind(kind);
    setLocationHelpOpen(true);
  };

  const dismissMobileLocTip = () => {
    try {
      sessionStorage.setItem(MOBILE_LOC_TIP_KEY, "1");
    } catch {
      /* noop */
    }
    setShowMobileLocTip(false);
  };

  const getLocation = (options?: { suppressRepeatedPermissionModal?: boolean }) => {
    const suppressRepeated = Boolean(options?.suppressRepeatedPermissionModal);
    skipNextPermissionDeniedModalRef.current = suppressRepeated;

    if (!navigator.geolocation) {
      skipNextPermissionDeniedModalRef.current = false;
      setMessage("");
      setLocationHelpOpen(false);
      setLocationQualityNote(null);
      openLocationHelp("unsupported");
      return;
    }

    const companyIdForSave = String(company?.id || selectedCompanyId || "");

    // Register getCurrentPosition BEFORE any setState. Some mobile browsers only show
    // the native Allow prompt if geolocation is requested in the same synchronous
    // stack as the user tap — setState first can break that activation chain.
    const pending = acquireRefinedLivePosition(20000);

    setMessage("");
    setLocationHelpOpen(false);
    setLocationQualityNote(null);
    retryGpsOnVisibleRef.current = false;
    setGpsPhase("getting");
    setLocationLabel("");
    setLocationDetail("");
    setLocationLabelLoading(false);
    setCoords(null);

    void pending
      .then(async (next) => {
        setCoords(next);
        setGpsPhase("ready");
        setLocationLabelLoading(true);
        let main = "";
        let detail = "";
        try {
          const res = await apiFetch(
            `/api/member/location-label?latitude=${encodeURIComponent(String(next.lat))}&longitude=${encodeURIComponent(String(next.lng))}`,
          );
          const data = ((await readJsonSafe(res)) || {}) as {
            label?: string;
            displayName?: string;
            latitude?: number;
            longitude?: number;
          };
          const fallback = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
          main = res.ok && data.label?.trim() ? data.label.trim() : fallback;
          const dn = data.displayName?.trim() || "";
          detail = dn && dn.toLowerCase() !== main.toLowerCase() ? dn : "";
          setLocationLabel(main);
          setLocationDetail(detail);
        } catch {
          main = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
          detail = "";
          setLocationLabel(main);
          setLocationDetail("");
        } finally {
          setLocationLabelLoading(false);
        }
        setLocationQualityNote(gpsAccuracyNote(next.acc));
        if (companyIdForSave) {
          writeGpsSession({
            companyId: companyIdForSave,
            lat: next.lat,
            lng: next.lng,
            acc: next.acc,
            label: main,
            detail,
            savedAt: Date.now(),
          });
        }
        retryGpsOnVisibleRef.current = false;
        skipNextPermissionDeniedModalRef.current = false;
      })
      .catch((err: unknown) => {
        setGpsPhase("none");
        const kind = classifyLocationError(err);
        if (kind === "services" || kind === "timeout") {
          retryGpsOnVisibleRef.current = true;
        }
        if (kind === "permission" && skipNextPermissionDeniedModalRef.current) {
          skipNextPermissionDeniedModalRef.current = false;
          setMessage(
            "Site location abhi bhi allow nahi hui (ya pehle Block ho chuki hai). Address bar ka lock / info icon → Site settings → Location → Allow. Phir neeche \"Live GPS — location lock\" dubara dabayein.",
          );
          return;
        }
        skipNextPermissionDeniedModalRef.current = false;
        openLocationHelp(kind);
      });
  };

  getLocationRef.current = getLocation;

  const markAttendance = async () => {
    setLoading(true);
    setMessage("");
    if (isDemoViewer) {
      setMessage("Demo user is view-only. Attendance marking is disabled.");
      setLoading(false);
      return;
    }
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

    const effectiveCompanyId = String(company?.id || selectedCompanyId || "");
    if (!effectiveCompanyId) {
      setMessage("Your company is missing on this account. Contact admin.");
      setLoading(false);
      return;
    }

    const form = new FormData();
    form.append("companyId", effectiveCompanyId);
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

  const locationHelpCopy: Record<LocationHelpKind, { title: string; body: ReactNode }> = {
    permission: {
      title: "Is site ko location allow karein",
      body: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
          <p>
            <strong className="text-slate-800 dark:text-zinc-100">Allow this site location</strong> sirf browser se
            ijazat mangta hai (native Allow / Block). Phone / laptop ki <strong>Location / GPS</strong> alag se ON honi
            chahiye — phir hi sahi current point milta hai.
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            Agar pehle <strong>Block</strong> kar diya tha to browser dubara bar bar popup nahi dikhata — site settings
            se Allow karna padta hai; is button se dobara spam nahi hoga.
          </p>
          <details className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800/60">
            <summary className="cursor-pointer font-semibold text-slate-800 dark:text-zinc-200">
              Block / settings se kaise Allow karein?
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-slate-700 dark:text-zinc-300">
              <li>
                <strong>Chrome / Edge:</strong> lock icon → Site settings → Location → <strong>Allow</strong> → refresh.
              </li>
              <li>
                <strong>Firefox:</strong> permission icon → Location → Allow.
              </li>
              <li>
                <strong>Safari:</strong> Settings → Safari → Location → Ask / Allow.
              </li>
            </ul>
          </details>
        </div>
      ),
    },
    services: {
      title: "Device par Location / GPS band hai",
      body: (
        <div className="space-y-3 text-sm text-slate-600 dark:text-zinc-300">
          <p>
            Browser theek hai, lekin system ne location fix nahi di. Apne phone / laptop par{" "}
            <strong>Location services ON</strong> karein. Settings se wapas is tab par aate hi app{" "}
            <strong>ek dafa khud</strong> location dubara read karne ki koshish karegi; warna{" "}
            <strong>Live GPS</strong> dubara dabayein.
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-slate-700 dark:text-zinc-200">
            <li>
              <strong>Android:</strong> Settings → Location → <strong>On</strong> (High accuracy / Google Location
              Accuracy on rakhein).
            </li>
            <li>
              <strong>iPhone:</strong> Settings → Privacy &amp; Security → Location Services → <strong>On</strong> →
              Safari / Chrome me bhi Allow.
            </li>
            <li>
              <strong>Windows:</strong> Settings → Privacy &amp; security → Location → Location services{" "}
              <strong>On</strong>.
            </li>
          </ul>
        </div>
      ),
    },
    timeout: {
      title: "Location abhi mili nahi (timeout)",
      body: (
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          Signal weak ho sakta hai — thodi der baad dubara try karein; behtar ke liye khuli jagah / window ke paas
          khade ho kar <strong>Live GPS</strong> dubara dabayein.
        </p>
      ),
    },
    unsupported: {
      title: "Is browser me location support nahi",
      body: (
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          Secure context (HTTPS / localhost) me Chrome / Edge / Safari try karein — ya browser update karein.
        </p>
      ),
    },
    unknown: {
      title: "Location nahi mil saki",
      body: (
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          Neeche <strong>Allow this site location</strong> se dubara koshish karein. Phir bhi masla ho to phone ki
          Location ON karein aur <strong>Live GPS</strong> dubara dabayein.
        </p>
      ),
    },
  };

  const locationHelpPrimaryLabel =
    locationHelpKind === "unsupported"
      ? "Theek"
      : locationHelpKind === "services" || locationHelpKind === "timeout"
        ? "Dobara location lo"
        : "Allow this site location";

  const onLocationHelpPrimary = () => {
    if (locationHelpKind === "unsupported") {
      setLocationHelpOpen(false);
      return;
    }
    // Do not setState here before getLocation — let getLocation register GPS first (same tap).
    getLocation({
      suppressRepeatedPermissionModal:
        locationHelpKind === "permission" || locationHelpKind === "unknown",
    });
  };

  return (
    <div className="space-y-6">
      {showMobileLocTip && !loadError && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-md dark:border-amber-600 dark:bg-amber-950/35"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-100">Pehle location sahi ON karein (mobile web)</p>
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-amber-950/95 dark:text-amber-100/95">
                <li>Phone <strong>Settings → Location</strong> ON (High accuracy / Google Location Accuracy ON rakhein).</li>
                <li>
                  <strong>Live GPS</strong> dabate waqt browser ka popup aaye to <strong>Allow / While using the app</strong>{" "}
                  zaroor choose karein.
                </li>
                <li>Mumkin ho to <strong>khuli jagah / window</strong> ke paas — taake current point sahi aaye.</li>
              </ol>
              <p className="mt-2 text-xs text-amber-900/90 dark:text-amber-200/90">
                Attendance me <strong>lat / long wahi save</strong> hoti hai jo device deta hai; neeche wala naam map ka
                nazdeeki pata ho sakta hai.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissMobileLocTip}
              className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Samajh gaya
            </button>
          </div>
        </div>
      )}

      {locationHelpOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-stretch justify-start bg-slate-900/55 px-3 pb-6 pt-3 backdrop-blur-md sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-help-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLocationHelpOpen(false);
          }}
        >
          <div
            className="mx-auto max-h-[min(92vh,720px)] w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 sm:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-5 pb-5 pt-6 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100/90">Attendance</p>
              <h2 id="location-help-title" className="mt-1 text-xl font-bold leading-snug">
                {locationHelpCopy[locationHelpKind].title}
              </h2>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-5 py-4 sm:max-h-[45vh]">
              {locationHelpCopy[locationHelpKind].body}
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-950/80">
              <button
                type="button"
                onClick={onLocationHelpPrimary}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.99]"
              >
                {locationHelpPrimaryLabel}
              </button>
              <button
                type="button"
                onClick={() => setLocationHelpOpen(false)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

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
              disabled={isDemoViewer}
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
            Tap <strong>Live GPS</strong> below — browser ka <strong>native</strong> prompt (Allow / Block) pehli dafa
            aa sakta hai; <strong>Allow</strong> karein taake current location mile. Phir yahan place name dikhega.
          </p>
        )}

        {gpsPhase === "getting" && (
          <p className="mt-3 text-base font-medium text-slate-800">
            Aapki <strong>live location</strong> le rahe hain (purani cache nahi). Agar pehla pin door lage to 2–6
            second tak GPS thori refine hoti hai taake <strong>zyada sahi point</strong> save ho. Khuli jagah / window
            behtar hai.
          </p>
        )}

        {gpsPhase === "ready" && coords && locationLabelLoading && (
          <p className="mt-3 text-base font-medium text-slate-800">Looking up place name…</p>
        )}

        {gpsPhase === "ready" && coords && !locationLabelLoading && (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-zinc-600 dark:bg-zinc-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Device GPS point (attendance isi par save hoti hai)
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Ye lat/lng <strong>phone / browser ki live reading</strong> hai — app khud coordinates nahi banati.
                Weak GPS par ghar ke Wi‑Fi se pin door bhi aa sakta hai; dubara <strong>Live GPS</strong> bahir try
                karein.
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              {coords.acc != null && (
                <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                  Accuracy (device): ±{Math.round(coords.acc)}m — ye circle ke andar aap ho sakte hain.
                </p>
              )}
              <a
                href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(coords.lat))}&mlon=${encodeURIComponent(String(coords.lng))}#map=19/${coords.lat}/${coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
              >
                Map par ye point khud check karein →
              </a>
            </div>

            {locationQualityNote && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {locationQualityNote}
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Jagah ka naam (map — nazdeeki pata ho sakta hai)
              </p>
              <p className="mt-1 text-xl font-bold leading-snug text-slate-900 sm:text-2xl dark:text-white">
                {locationLabel}
              </p>
            </div>
            {locationDetail && (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400" title={locationDetail}>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Poora pata: </span>
                {locationDetail.length > 220 ? `${locationDetail.slice(0, 220)}…` : locationDetail}
              </p>
            )}
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Lock ho chuka — attendance inhi coordinates ke sath jayegi.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={gpsPhase === "getting"}
          onClick={() => getLocation()}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow hover:bg-slate-800 disabled:opacity-60"
        >
          {gpsPhase === "getting" ? "Getting location…" : "Live GPS — location lock"}
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
            ({company.timezone})
            <span className="block pt-1 text-xs font-normal text-slate-500">
              Attendance aapki live location par hoti hai — user jahan bhi ho, location name capture ho jata hai.
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
