"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import { L } from "@/lib/attendanceLabels";

type ReportMember = {
  id: string;
  name: string;
  email: string;
  summary: { complete: number; pending: number; absent: number; fake?: number };
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

/** Company dashboard: one continuous surface (hero + roster) — outer rounded shell lives on the page. */
export default function CompanyTeamAttendance() {
  const [days, setDays] = useState(21);
  const [members, setMembers] = useState<ReportMember[]>([]);
  const [timezone, setTimezone] = useState("");
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await apiFetch(`/api/company/attendance-reports?days=${days}`);
    const data =
      (await readJsonSafe<{
        members?: ReportMember[];
        timezone?: string;
        startDate?: string;
        endDate?: string;
        error?: string;
      }>(res)) || {};
    if (!res.ok) {
      setError(data.error || "Could not load report.");
      setMembers([]);
      return;
    }
    const list = (data.members || []) as ReportMember[];
    setMembers(list);
    setTimezone(data.timezone || "");
    setRange({ start: data.startDate || "", end: data.endDate || "" });
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="relative">
      {/* Role ribbon — same card, top band */}
      <div className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-6 py-6 text-white sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner ring-2 ring-white/30">
              🏢
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/90">Your role</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Company administrator</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/95">
                This area only shows your company data: review attendance, open any member’s record, and manage hires — all in this panel.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
              Reports
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
              Team
            </span>
          </div>
        </div>
      </div>

      {/* Main body — one surface */}
      <div className="relative bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 px-6 py-7 sm:px-8 sm:py-8 dark:from-zinc-900 dark:via-zinc-950 dark:to-emerald-950/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Attendance & team</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{L.coTeamTitle}</h2>
            {range && (
              <p className="mt-3 inline-flex items-center rounded-lg border border-emerald-200/60 bg-emerald-50/90 px-3 py-1.5 font-mono text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                {range.start} → {range.end}
                {timezone ? ` · ${timezone}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="company-report-days" className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              {L.coDuration}
            </label>
            <select
              id="company-report-days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {[7, 14, 21, 30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500"
              title={L.coRefresh}
            >
              {L.coRefresh}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {!members.length && !error && (
          <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white/60 py-12 text-center text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {L.coNoMembers}
          </p>
        )}

        {!!members.length && (
          <div className="mt-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{L.coMembersRosterTitle}</h3>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-inner ring-1 ring-slate-900/[0.04] dark:border-zinc-700 dark:bg-zinc-900/60 dark:ring-white/5">
              <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
                {members.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/company/dashboard/members/${m.id}`}
                      className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-emerald-50/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4 dark:hover:bg-emerald-950/25"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md ring-2 ring-white/30 dark:ring-emerald-400/20">
                          {initials(m.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 group-hover:text-emerald-800 dark:text-zinc-100 dark:group-hover:text-emerald-300">
                            {m.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-zinc-500">{m.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">{L.coOpenMemberPage}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
