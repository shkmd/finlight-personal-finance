import Link from "next/link";
import { formatCurrency } from "@/lib/money";

export interface ActivityItem {
  id: string;
  description: string;
  meta: string;
  amountMinor: number;
  isIncome: boolean;
}

export function LatestActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-extrabold tracking-tight">Latest activity</h2>
        <Link
          href="/transactions"
          className="rounded-full border-[1.5px] border-(--fl-line) px-3.5 py-2 text-xs font-bold hover:border-(--fl-green) hover:text-(--fl-green-dark)"
        >
          View all
        </Link>
      </div>
      <div className="mt-2 flex flex-col">
        {items.length === 0 ? (
          <p className="py-4 text-[13px] font-medium text-(--fl-muted)">No transactions recorded yet.</p>
        ) : (
          items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-(--fl-line) py-2.75 last:border-0">
              <div
                className="grid size-[34px] shrink-0 place-items-center rounded-xl text-sm font-extrabold"
                style={{
                  background: t.isIncome ? "var(--fl-mint-soft)" : "var(--fl-red-soft)",
                  color: t.isIncome ? "var(--fl-green-dark)" : "var(--fl-red)",
                }}
              >
                {t.isIncome ? "+" : "−"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{t.description}</div>
                <div className="text-[11px] font-medium text-(--fl-muted)">{t.meta}</div>
              </div>
              <div
                className="shrink-0 text-[13.5px] font-extrabold tabular-nums"
                style={{ color: t.isIncome ? "var(--fl-green-dark)" : "var(--fl-ink)" }}
              >
                {t.isIncome ? "+" : "−"}
                {formatCurrency(t.amountMinor)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
