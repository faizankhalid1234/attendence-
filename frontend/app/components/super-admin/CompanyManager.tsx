"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { COMMON_TIMEZONES } from "@/lib/timezones";

type Company = {
  id: string;
  name: string;
  email: string;
  membersCount: number;
  workStart: string;
  workEnd: string;
  timezone: string;
  officeLatitude: number;
  officeLongitude: number;
  locationRadiusMeters: number;
};

export default function CompanyManager() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [officeLatitude, setOfficeLatitude] = useState("24.860966");
  const [officeLongitude, setOfficeLongitude] = useState("67.001100");
  const [locationRadiusMeters, setLocationRadiusMeters] = useState("200");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await apiFetch("/api/super-admin/companies");
    const data = await res.json();
    if (res.ok) {
      setCompanies(data.companies || []);
      return;
    }
    const hint = typeof data.hint === "string" ? data.hint : "";
    setMessage([data.error || "Could not load companies", hint].filter(Boolean).join(" — "));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await apiFetch("/api/super-admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        companyEmail,
        adminName,
        workStart,
        workEnd,
        timezone,
        officeLatitude: Number(officeLatitude),
        officeLongitude: Number(officeLongitude),
        locationRadiusMeters: Number(locationRadiusMeters),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const hint = typeof data.hint === "string" ? data.hint : "";
      setMessage([data.error || "Could not create company", hint].filter(Boolean).join(" — "));
      return;
    }

    let msg = `Company created. Temporary password: ${data.company.tempPassword}`;
    if (data.emailWarning) msg += ` | ${data.emailWarning}`;
    setMessage(msg);
    setCompanyName("");
    setCompanyEmail("");
    setAdminName("");
    await load();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-3xl border border-slate-200/80 bg-[var(--card)] p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Company</h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Office map coordinates aur shift timings yahan set karein. Member shift window ke andar kahin se bhi live
          location + photo se attendance laga sakta hai; radius ab enforce nahi hota.
        </p>
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Company Email (login)"
          type="email"
          value={companyEmail}
          onChange={(e) => setCompanyEmail(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Company Admin Name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Shift start (24h)</label>
            <input
              type="time"
              step={60}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Shift end (24h)</label>
            <input
              type="time"
              step={60}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Timezone (IANA)</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
          >
            {COMMON_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Office latitude</label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={officeLatitude}
              onChange={(e) => setOfficeLatitude(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Office longitude</label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={officeLongitude}
              onChange={(e) => setOfficeLongitude(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">Reference radius (meters)</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={locationRadiusMeters}
            onChange={(e) => setLocationRadiusMeters(e.target.value)}
            required
          />
        </div>
        <button className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow hover:bg-indigo-500">
          Create Company
        </button>
        {message && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            {message}
          </p>
        )}
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-[var(--card)] shadow-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Time window</th>
              <th className="px-4 py-3">Radius</th>
              <th className="px-4 py-3">Members</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-t border-slate-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-zinc-100">{company.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{company.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">
                  {company.workStart} - {company.workEnd}
                  <div className="text-xs text-slate-400 dark:text-zinc-500">{company.timezone}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{company.locationRadiusMeters}m</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{company.membersCount}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={5}>
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
