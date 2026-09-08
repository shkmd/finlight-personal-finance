"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CategoryBreakdownItem {
  name: string;
  amountMinor: number;
  percentOfSpend: number;
  widthPercent: number;
  color: string;
  items: Array<{ date: string; desc: string; amountMinor: number }>;
}

export function CategoryBreakdown({ categories, monthLabel }: { categories: CategoryBreakdownItem[]; monthLabel: string }) {
  const router = useRouter();
  const [drill, setDrill] = useState<string | null>(null);
  const active = categories.find((c) => c.name === drill) ?? null;

  return (
    <div className="min-w-0 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <h2 className="text-[16px] font-extrabold tracking-tight">Where it went</h2>
        <span className="text-[11.5px] font-semibold text-(--fl-muted)">Tap to drill down</span>
      </div>

      {categories.length === 0 ? (
        <p className="mt-2.5 text-[13px] font-medium text-(--fl-muted)">No expenses recorded for {monthLabel}.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-0.5">
          {categories.map((c) => {
            const isActive = drill === c.name;
            return (
              <div
                key={c.name}
                onClick={() => setDrill(isActive ? null : c.name)}
                className={cn(
                  "cursor-pointer rounded-xl px-2.5 py-2.25 hover:bg-(--fl-fill)",
                  isActive && "bg-(--fl-mint-soft)"
                )}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{c.name}</span>
                  <span className="text-[11px] font-semibold text-(--fl-muted) tabular-nums">
                    {c.percentOfSpend.toFixed(0)}%
                  </span>
                  <span className="text-[12.5px] font-extrabold tabular-nums">{formatCurrency(c.amountMinor)}</span>
                </div>
                <div className="mt-1.75 h-1.75 overflow-hidden rounded-full bg-(--fl-track)">
                  <div
                    className="h-1.75 rounded-full"
                    style={{ width: `${c.widthPercent}%`, background: isActive ? "var(--fl-green)" : "var(--fl-green-dark)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active ? (
        <div className="mt-3.5 rounded-2xl bg-[#f7f9f8] p-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-[13.5px] font-extrabold tracking-tight">{active.name}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-(--fl-muted)">
                {active.items.length} transactions · {formatCurrency(active.amountMinor)} · {active.percentOfSpend.toFixed(0)}% of spend
              </div>
            </div>
            <button
              onClick={() => setDrill(null)}
              className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e7eae8] text-xs font-bold text-(--fl-muted) hover:bg-(--fl-mint)"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {active.items.slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-baseline gap-2.5">
                <span className="w-11 shrink-0 text-[11px] font-bold text-(--fl-muted)">{t.date}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{t.desc}</span>
                <span className="shrink-0 text-[12.5px] font-extrabold tabular-nums">{formatCurrency(t.amountMinor)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push(`/transactions?category=${encodeURIComponent(active.name)}`)}
            className="mt-3 rounded-full bg-(--fl-green) px-3.75 py-2.25 text-xs font-bold text-white hover:bg-(--fl-green-dark)"
          >
            See all in transactions
          </button>
        </div>
      ) : null}
    </div>
  );
}
