import Link from "next/link";
import { formatCurrency } from "@/lib/money";

export function DebtCountdownCard({
  monthsLeft,
  targetDateLabel,
  extraPerMonthMinor,
  interestSavedMinor,
}: {
  monthsLeft: number | null;
  targetDateLabel: string;
  extraPerMonthMinor: number;
  interestSavedMinor: number | null;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] bg-(--fl-green-deep) p-[22px] text-white">
      <div className="absolute -right-10 -bottom-[50px] size-[180px] rounded-full bg-[rgba(191,228,207,0.10)]" />
      <div className="text-[13px] font-bold text-(--fl-mint)">Debt-free countdown</div>
      <div className="mt-3.5 text-[44px] leading-none font-extrabold tracking-tight tabular-nums">
        {monthsLeft != null ? monthsLeft : "—"}
      </div>
      <div className="text-[12.5px] font-medium text-white/74">months left · {targetDateLabel}</div>
      <div className="my-3.5 h-px bg-white/16" />
      <div className="flex items-center justify-between gap-2.5 text-xs font-semibold text-white/78">
        <span>Extra per month</span>
        <span className="font-extrabold text-white tabular-nums">{formatCurrency(extraPerMonthMinor)}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2.5 text-xs font-semibold text-white/78">
        <span>Interest saved</span>
        <span className="font-extrabold text-(--fl-mint) tabular-nums">
          {interestSavedMinor != null ? formatCurrency(interestSavedMinor) : "—"}
        </span>
      </div>
      <Link
        href="/debt-planner"
        className="mt-4.5 block w-full rounded-full bg-(--fl-mint) py-2.5 text-center text-[12.5px] font-extrabold text-(--fl-green-deep) hover:bg-white"
      >
        Run a scenario
      </Link>
    </div>
  );
}
