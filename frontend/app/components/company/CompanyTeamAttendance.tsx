"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import SummaryPie from "@/app/components/charts/SummaryPie";
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

  const teamPie = useMemo(() => {
    const t = members.reduce(
      (a, m) => ({
        complete: a.complete + m.summary.complete,
        pending: a.pending + m.summary.pending,
        absent: a.absent + m.summary.absent,
        fake: a.fake + (m.summary.fake || 0),
      }),
      { complete: 0, pending: 0, absent: 0, fake: 0 },
    );
    return [
      { name: L.pieComplete, value: t.complete, color: "#22c55e" },
      { name: L.piePending, value: t.pending, color: "#f59e0b" },
      { name: L.pieFake, value: t.fake, color: "#ef4444" },
      { name: L.pieAbsent, value: t.absent, color: "#94a3b8" },
    ];
  }, [members]);

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200/40 bg-white text-slate-900 shadow-xl shadow-emerald-900/10 ring-1 ring-slate-900/5 dark:border-emerald-900/30 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="relative border-b border-emerald-100/80 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100/90">{L.coTeamHeader}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{L.coTeamTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/95">{L.coTeamRosterIntro}</p>
            {range && (
              <p className="mt-3 rounded-lg bg-black/15 px-3 py-1.5 text-xs font-medium text-emerald-50 backdrop-blur-sm">
                {range.start} → {range.end}
                {timezone ? ` · ${timezone}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="company-report-days" className="text-xs font-semibold text-emerald-100">
              {L.coDuration}
            </label>
            <select
              id="company-report-days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 text-sm font-medium text-white shadow-inner backdrop-blur outline-none ring-offset-2 ring-offset-emerald-700 focus:ring-2 focus:ring-white/60"
            >
              {[7, 14, 21, 30, 60, 90].map((d) => (
                <option key={d} value={d} className="text-slate-900">
                  {d} days
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-md transition hover:bg-emerald-50"
              title={L.coRefresh}
            >
              {L.coRefresh}
            </button>
          </div>
        </div>
        {error && (
          <p className="relative mt-4 rounded-xl border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-50">
            {error}
          </p>
        )}
      </div>

      <div className="border-b border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/80 px-5 py-3.5 dark:border-amber-900/40 dark:from-amber-950/50 dark:to-orange-950/30">
        <p className="text-center text-sm font-medium leading-relaxed text-amber-950/90 dark:text-amber-100/90">
          {L.coViewOnlyBanner}
        </p>
      </div>

      {!members.length && !error && (
        <p className="px-6 py-14 text-center text-sm text-slate-500 dark:text-zinc-400">{L.coNoMembers}</p>
      )}

      {!!members.length && (
        <div className="p-5 sm:p-7">
          <div className="mx-auto mb-8 max-w-[240px]">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {L.coTeamMixTitle}
            </p>
            <div className="mt-3">
              <SummaryPie data={teamPie} />
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">{L.coMembersRosterTitle}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{L.coMembersClickOpen}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/company/dashboard/members/${m.id}`}
                className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:hover:border-emerald-600"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-inner">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 group-hover:text-emerald-800 dark:text-zinc-100 dark:group-hover:text-emerald-300">
                      {m.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-zinc-500">{m.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        title={L.statusComplete}
                        className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                      >
                        {m.summary.complete} full
                      </span>
                      <span
                        title={L.statusPending}
                        className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950 dark:bg-amber-950/50 dark:text-amber-200"
                      >
                        {m.summary.pending} open
                      </span>
                      <span
                        title={L.statusFake}
                        className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-900 dark:bg-red-950/50 dark:text-red-200"
                      >
                        {m.summary.fake || 0} fake
                      </span>
                      <span
                        title={L.statusAbsent}
                        className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        {m.summary.absent} no mark
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{L.coOpenMemberPage}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
