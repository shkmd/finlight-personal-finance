import { formatCurrency } from "@/lib/money";

const ARC_LENGTH = 282.7;

export function DebtGauge({
  originalPrincipalMinor,
  clearedPrincipalMinor,
  outstandingMinor,
}: {
  originalPrincipalMinor: number;
  clearedPrincipalMinor: number;
  outstandingMinor: number;
}) {
  const clearedPct = originalPrincipalMinor > 0 ? (clearedPrincipalMinor / originalPrincipalMinor) * 100 : 0;
  const dash = `${((ARC_LENGTH * clearedPct) / 100).toFixed(1)} ${ARC_LENGTH}`;

  return (
    <div className="min-w-0 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
      <h2 className="text-[16px] font-extrabold tracking-tight">Debt cleared</h2>
      <p className="mt-0.5 text-xs font-medium text-(--fl-muted)">
        Of the {formatCurrency(originalPrincipalMinor)} you originally borrowed.
      </p>
      <div className="mt-2.5 flex justify-center">
        <div className="relative w-full max-w-[260px]">
          <svg viewBox="0 0 220 132" className="block w-full overflow-visible" style={{ height: "auto" }}>
            <path d="M20 120 A90 90 0 0 1 200 120" fill="none" stroke="var(--fl-track)" strokeWidth="26" strokeLinecap="round" />
            <path
              d="M20 120 A90 90 0 0 1 200 120"
              fill="none"
              stroke="var(--fl-green)"
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray={dash}
            />
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-[4%] text-center">
            <div className="text-[36px] leading-none font-extrabold tracking-tight tabular-nums">{Math.round(clearedPct)}%</div>
            <div className="mt-1.5 text-xs font-semibold text-(--fl-muted)">Principal repaid</div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-[11.5px] font-bold">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-(--fl-green)" />
          Cleared {formatCurrency(clearedPrincipalMinor)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#dfe3e0]" />
          Left {formatCurrency(outstandingMinor)}
        </span>
      </div>
    </div>
  );
}
