"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/money";

export function CategoryPieChart({
  data,
  height = 240,
  summary,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  summary: string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No spending recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div style={{ width: "100%", maxWidth: 220, height }} role="img" aria-label={summary}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{formatCurrency(d.value)}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
