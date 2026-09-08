"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { formatCurrency } from "@/lib/money";

export interface LineSeriesConfig {
  key: string;
  label: string;
  color: string;
}

export function MoneyLineChart({
  data,
  lines,
  height = 260,
  summary,
}: {
  data: Array<Record<string, number | string>>;
  lines: LineSeriesConfig[];
  height?: number;
  summary: string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough data yet to show this chart.</p>;
  }

  return (
    <div>
      <div style={{ width: "100%", height }} role="img" aria-label={summary}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lines.map((line) => (
              <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
