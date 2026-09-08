"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/money";

export interface BarSeriesConfig {
  key: string;
  label: string;
  color: string;
}

export function MoneyBarChart({
  data,
  bars,
  height = 260,
  summary,
  stacked = false,
}: {
  data: Array<Record<string, number | string>>;
  bars: BarSeriesConfig[];
  height?: number;
  summary: string;
  stacked?: boolean;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough data yet to show this chart.</p>;
  }

  return (
    <div>
      <div style={{ width: "100%", height }} role="img" aria-label={summary}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {bars.map((bar) => (
              <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} stackId={stacked ? "stack" : undefined} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
