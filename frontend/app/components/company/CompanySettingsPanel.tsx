"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { COMMON_TIMEZONES } from "@/lib/timezones";

type Settings = {
  name: string;
  email: string;
  workStart: string;
  workEnd: string;
  timezone: string;
  officeLatitude: number;
  officeLongitude: number;
  locationRadiusMeters: number;
};

export default function CompanySettingsPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [officeLatitude, setOfficeLatitude] = useState("");
  const [officeLongitude, setOfficeLongitude] = useState("");
  const [locationRadiusMeters, setLocationRadiusMeters] = useState("200");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await apiFetch("/api/company/settings");
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Load failed");
      return;
    }
    const c = data.company as Settings;
    setS(c);
    setWorkStart(c.workStart);
    setWorkEnd(c.workEnd);
    setTimezone(c.timezone);
    setOfficeLatitude(String(c.officeLatitude));
    setOfficeLongitude(String(c.officeLongitude));
    setLocationRadiusMeters(String(c.locationRadiusMeters));
    if (data.timezoneWarning) setMessage(String(data.timezoneWarning));
    else setMessage("");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await apiFetch("/api/company/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workStart,
        workEnd,
        timezone,
        ...(officeLatitude.trim() ? { officeLatitude: Number(officeLatitude) } : {}),
        ...(officeLongitude.trim() ? { officeLongitude: Number(officeLongitude) } : {}),
        ...(locationRadiusMeters.trim() ? { locationRadiusMeters: Number(locationRadiusMeters) } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setMessage(data.message || "Saved");
    await load();
  };

  return (
    <div className="rounded-3xl border border-emerald-200/80 bg-[var(--card)] p-6 shadow-lg dark:border-emerald-900/50 dark:bg-zinc-900/80">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Company timings & optional map settings</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
        Attendance shift ke time window ke andar hi lag sakti hai; live GPS kahin se bhi ho sakti hai. Office map /
        radius sirf reference / reporting ke liye. Time format: 24-hour (browser &quot;time&quot; picker).
      </p>
      {s && (
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
          Company: <span className="font-medium text-slate-700 dark:text-zinc-200">{s.name}</span> ({s.email})
        </p>
      )}

      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Shift start</label>
          <input
            type="time"
            step={60}
            placeholder="Optional"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Shift end</label>
          <input
            type="time"
            step={60}
            placeholder="Optional"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Timezone (IANA)</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {!COMMON_TIMEZONES.some((z) => z.value === timezone) && (
              <option value={timezone}>
                {timezone} (current — change if wrong)
              </option>
            )}
            {COMMON_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Gujranwala = Pakistan → <strong>Asia/Karachi</strong> select karein (&quot;gujranwala&quot; likhne se time galat
            ho sakta tha).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Office latitude</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={officeLatitude}
            onChange={(e) => setOfficeLatitude(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Office longitude</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={officeLongitude}
            onChange={(e) => setOfficeLongitude(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Reference radius (meters)</label>
          <input
            type="number"
            min={20}
            max={5000}
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={locationRadiusMeters}
            onChange={(e) => setLocationRadiusMeters(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            Save company settings
          </button>
        </div>
      </form>
      {message && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
