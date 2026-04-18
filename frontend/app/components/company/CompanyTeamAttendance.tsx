"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import StatusBarChart from "@/app/components/charts/StatusBarChart";
import SummaryPie from "@/app/components/charts/SummaryPie";
import type { DayStatus } from "@/lib/attendanceSeries";
import { L } from "@/lib/attendanceLabels";

type SeriesPoint = { date: string; status: DayStatus };
type ReportMember = {
  id: string;
  name: string;
  email: string;
  series: SeriesPoint[];
  summary: { complete: number; pending: number; absent: number };
};

const card =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-6";

export default function CompanyTeamAttendance() {
  const [days, setDays] = useState(21);
  const [members, setMembers] = useState<ReportMember[]>([]);
  const [timezone, setTimezone] = useState("");
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await apiFetch(`/api/company/attendance-reports?days=${days}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load report.");
      setMembers([]);
      return;
    }
    const list = (data.members || []) as ReportMember[];
    setMembers(list);
    setTimezone(data.timezone || "");
    setRange({ start: data.startDate, end: data.endDate });
    setSelectedId((id) => {
      if (id && list.some((m) => m.id === id)) return id;
      return list[0]?.id || "";
    });
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => members.find((m) => m.id === selectedId) || members[0],
    [members, selectedId],
  );

  const barData = useMemo(() => {
    if (!selected?.series) return [];
    return selected.series.map((p) => ({
      day: p.date.slice(5),
      full: p.date,
      status: p.status,
      statusValue: p.status === "complete" ? 3 : p.status === "pending" ? 2 : 1,
    }));
  }, [selected]);

  const teamPie = useMemo(() => {
    const t = members.reduce(
      (a, m) => ({
        complete: a.complete + m.summary.complete,
        pending: a.pending + m.summary.pending,
        absent: a.absent + m.summary.absent,
      }),
      { complete: 0, pending: 0, absent: 0 },
    );
    return [
      { name: L.pieComplete, value: t.complete, color: "#22c55e" },
      { name: L.piePending, value: t.pending, color: "#f59e0b" },
      { name: L.pieAbsent, value: t.absent, color: "#94a3b8" },
    ];
  }, [members]);

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              {L.coTeamHeader}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{L.coTeamTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{L.coTeamHelp}</p>
            {range && (
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Range: {range.start} → {range.end}
                {timezone ? ` · ${timezone}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="company-report-days" className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              {L.coDuration}
            </label>
            <select
              id="company-report-days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
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
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              title={L.coRefresh}
            >
              {L.coRefresh}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {!members.length && !error && <p className="mt-6 text-sm text-slate-500 dark:text-zinc-500">{L.coNoMembers}</p>}
      </section>

      {!!members.length && (
        <>
          <section className={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">{L.coF1}</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{L.coF1Title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{L.coF1Desc}</p>
            <div className="mt-6 max-w-md">
              <SummaryPie data={teamPie} />
            </div>
          </section>

          <section className={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">{L.coF2}</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{L.coF2Title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{L.coF2Desc}</p>
            <label htmlFor="company-member-report" className="mt-4 block text-xs font-semibold text-slate-600 dark:text-zinc-400">
              {L.coMemberLabel}
            </label>
            <select
              id="company-member-report"
              value={selected?.id || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.email}
                </option>
              ))}
            </select>
          </section>

          {selected && (
            <>
              <section className={card}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300">{L.coF3}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{selected.name}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{selected.email}</p>
                <p className="mt-3 text-xs font-medium text-slate-600 dark:text-zinc-400">{L.coF3Title}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-800 dark:text-emerald-300">
                    {L.statusComplete}: {selected.summary.complete}
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-900 dark:text-amber-200">
                    {L.statusPending}: {selected.summary.pending}
                  </span>
                  <span className="rounded-full bg-slate-500/15 px-3 py-1 font-semibold text-slate-700 dark:text-zinc-300">
                    {L.statusAbsent}: {selected.summary.absent}
                  </span>
                </div>
              </section>

              <section className={card}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900 dark:text-violet-300">{L.coF4}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{L.coF4Title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{L.coF4Desc}</p>
                <div className="mt-6">{barData.length > 0 && <StatusBarChart data={barData} />}</div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
