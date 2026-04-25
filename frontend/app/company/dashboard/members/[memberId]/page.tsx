"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, readJsonSafe } from "@/lib/api";
import type { DayStatus } from "@/lib/attendanceSeries";
import { L } from "@/lib/attendanceLabels";

type SeriesPoint = { date: string; status: DayStatus };
type ReportMember = {
  id: string;
  name: string;
  email: string;
  series: SeriesPoint[];
  summary: { complete: number; pending: number; absent: number; fake?: number };
};

function weekdayShort(ymd: string, timeZone: string): string {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", timeZone: timeZone || "UTC" });
  } catch {
    return "";
  }
}

function statusPillClass(s: DayStatus): string {
  switch (s) {
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "fake":
      return "border-red-200 bg-red-50 text-red-900";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function statusWord(s: DayStatus): string {
  switch (s) {
    case "complete":
      return L.statusComplete;
    case "pending":
      return L.statusPending;
    case "fake":
      return L.statusFake;
    default:
      return L.statusAbsent;
  }
}

export default function CompanyMemberAttendancePage() {
  const params = useParams();
  const memberId = typeof params?.memberId === "string" ? params.memberId : "";

  const [days, setDays] = useState(30);
  const [member, setMember] = useState<ReportMember | null>(null);
  const [timezone, setTimezone] = useState("");
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!memberId) return;
    setError("");
    const q = new URLSearchParams({ days: String(days), memberId });
    const res = await apiFetch(`/api/company/attendance-reports?${q.toString()}`);
    const data =
      (await readJsonSafe<{
        members?: ReportMember[];
        timezone?: string;
        startDate?: string;
        endDate?: string;
        error?: string;
      }>(res)) || {};
    if (!res.ok) {
      setError(data.error || "Could not load this member’s record.");
      setMember(null);
      return;
    }
    const list = (data.members || []) as ReportMember[];
    setMember(list[0] || null);
    setTimezone(data.timezone || "");
    setRange({ start: data.startDate || "", end: data.endDate || "" });
  }, [days, memberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const presentDays = member ? member.summary.complete + member.summary.pending : 0;

  const companyName =
    typeof window !== "undefined" ? sessionStorage.getItem("portalCompanyName") : null;

  const title = useMemo(() => {
    if (member) return member.name;
    return "Member";
  }, [member]);

  if (!memberId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-slate-600 dark:text-zinc-400">
        <p>Missing member.</p>
        <Link href="/company/dashboard" className="mt-4 inline-block font-semibold text-emerald-600">
          {L.coBackToTeam}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/company/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-200 dark:hover:bg-zinc-800"
        >
          {L.coBackToTeam}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="member-report-days" className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {L.coDuration}
          </label>
          <select
            id="member-report-days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {L.coRefresh}
          </button>
        </div>
      </div>

      <header className="overflow-hidden rounded-3xl border border-emerald-200/40 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100/90">{L.coMemberReportTitle}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        {member && <p className="mt-2 text-sm text-emerald-50/95">{member.email}</p>}
        {companyName ? <p className="mt-1 text-xs text-emerald-100/80">{companyName}</p> : null}
        {range && (
          <p className="mt-4 inline-block rounded-lg bg-black/20 px-3 py-1.5 text-xs font-medium">
            {range.start} → {range.end}
            {timezone ? ` · ${timezone}` : ""}
          </p>
        )}
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/95">{L.coMemberReportSubtitle}</p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {member && !error && (
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <span className="text-2xl font-black tabular-nums text-emerald-800 dark:text-emerald-200">{presentDays}</span>
            <span className="text-left text-xs font-semibold leading-tight text-emerald-900/90 dark:text-emerald-100/90">
              {L.coStatPresent}
              <span className="mt-0.5 block font-normal text-emerald-800/80 dark:text-emerald-200/80">{L.coStatPresentSub}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-zinc-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{L.coStatFullDays}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-800 dark:text-emerald-200">{member.summary.complete}</p>
              <p className="mt-0.5 text-[11px] text-emerald-800/70 dark:text-emerald-300/80">{L.coStatFullDaysSub}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400">{L.coStatPending}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-amber-900 dark:text-amber-200">{member.summary.pending}</p>
              <p className="mt-0.5 text-[11px] text-amber-900/70 dark:text-amber-200/80">{L.coStatPendingSub}</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm dark:border-red-900/40 dark:bg-zinc-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">{L.coStatFake}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-red-800 dark:text-red-200">{member.summary.fake || 0}</p>
              <p className="mt-0.5 text-[11px] text-red-800/70 dark:text-red-300/80">{L.coStatFakeSub}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-400">{L.coStatAbsent}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-800 dark:text-zinc-100">{member.summary.absent}</p>
              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-zinc-500">{L.coStatAbsentSub}</p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{L.coDailyTableTitle}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{L.coPickMemberHelp}</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-700">
              <div className="max-h-[min(520px,55vh)] overflow-auto">
                <table className="w-full min-w-[280px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-3">{L.coThDate}</th>
                      <th className="px-3 py-3">{L.coThDay}</th>
                      <th className="px-3 py-3">{L.coThStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {member.series.map((p) => (
                      <tr key={p.date} className="bg-white dark:bg-zinc-950">
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-800 dark:text-zinc-200">
                          {p.date}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-zinc-400">
                          {weekdayShort(p.date, timezone || "Asia/Karachi")}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(p.status)}`}
                          >
                            {statusWord(p.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
