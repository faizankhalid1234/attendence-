"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayStatus } from "@/lib/attendanceSeries";
import { chartTooltip } from "@/lib/attendanceLabels";

const FILL: Record<DayStatus, string> = {
  complete: "#22c55e",
  pending: "#f59e0b",
  absent: "#94a3b8",
};

type Row = { day: string; full: string; status: DayStatus; statusValue: number };

export default function StatusBarChart({ data, title }: { data: Row[]; title?: string }) {
  if (!data.length) return null;

  return (
    <div className="w-full">
      {title && (
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">{title}</p>
      )}
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-zinc-700" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <YAxis type="number" domain={[0, 3.2]} hide />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
              formatter={(_v, _n, item) => {
                const s = (item?.payload as Row)?.status;
                return [s ? chartTooltip[s] : "", "Status"];
              }}
              labelFormatter={(_, p) =>
                Array.isArray(p) && p[0]?.payload ? `Date: ${(p[0].payload as Row).full}` : ""
              }
            />
            <Bar dataKey="statusValue" radius={[6, 6, 0, 0]} maxBarSize={28}>
              {data.map((e, i) => (
                <Cell key={`${e.full}-${i}`} fill={FILL[e.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-slate-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-emerald-500" />
          <span>Complete</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-amber-500" />
          <span>Pending</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-slate-400" />
          <span>Absent</span>
        </span>
      </div>
    </div>
  );
}
