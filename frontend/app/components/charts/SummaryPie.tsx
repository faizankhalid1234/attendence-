"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number; color: string };

export default function SummaryPie({ data }: { data: Slice[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <p className="text-sm text-slate-500 dark:text-zinc-500">No data for this period.</p>;

  return (
    <div className="h-[240px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} paddingAngle={2}>
            {filtered.map((e) => (
              <Cell key={e.name} fill={e.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
