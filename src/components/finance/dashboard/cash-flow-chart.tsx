"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CashFlowMonth {
  year: number;
  month: number;
  label: string;
  short: string;
  incomeMinor: number;
  expenseMinor: number;
}

export function CashFlowChart({ series }: { series: CashFlowMonth[] }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const selectedIndex = series.length - 1;
  const maxValue = Math.max(1, ...series.map((m) => Math.max(m.incomeMinor, m.expenseMinor)));

  return (
    <div>
      <div className="mt-5.5 flex h-[196px] items-end gap-1.5">
        {series.map((m, i) => {
          const isLit = hoverIndex === i || selectedIndex === i;
          const incomeHeight = Math.max((m.incomeMinor / maxValue) * 100, 3);
          const expenseHeight = Math.max((m.expenseMinor / maxValue) * 100, 3);
          const net = m.incomeMinor - m.expenseMinor;

          return (
            <div
              key={`${m.year}-${m.month}`}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => router.push(`/dashboard?year=${m.year}&month=${m.month}`)}
              className={cn(
                "relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center gap-1.5 rounded-2xl",
                hoverIndex === i && "bg-(--fl-fill)"
              )}
            >
              <div
                className="w-[26%] rounded-full transition-[height]"
                style={{ height: `${incomeHeight}%`, background: isLit ? "var(--fl-green)" : "var(--fl-hatch)" }}
              />
              <div
                className="w-[26%] rounded-full transition-[height]"
                style={{ height: `${expenseHeight}%`, background: isLit ? "var(--fl-red)" : "var(--fl-hatch)" }}
              />
              {hoverIndex === i ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 min-w-[154px] -translate-x-1/2 -translate-y-1.5 rounded-2xl bg-(--fl-green-deep) p-3 text-white shadow-[0_10px_24px_rgba(8,51,34,0.28)]">
                  <div className="text-[11px] font-extrabold tracking-wide text-(--fl-mint)">{m.label}</div>
                  <div className="mt-1.5 text-xs font-semibold tabular-nums">In {formatCurrency(m.incomeMinor)}</div>
                  <div className="text-xs font-semibold tabular-nums text-[#ffc4bd]">Out {formatCurrency(m.expenseMinor)}</div>
                  <div className="mt-1.5 border-t border-white/18 pt-1.5 text-xs font-extrabold tabular-nums">
                    Net {formatCurrency(net)}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {series.map((m, i) => (
          <div
            key={`${m.year}-${m.month}`}
            className={cn(
              "flex-1 text-center text-[11.5px] font-bold",
              selectedIndex === i ? "text-(--fl-green-dark)" : "text-(--fl-muted)"
            )}
          >
            {m.short}
          </div>
        ))}
      </div>
    </div>
  );
}
