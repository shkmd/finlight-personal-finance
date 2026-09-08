import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import type { getDashboardSummary } from "@/lib/actions/dashboard";
import Link from "next/link";

type Summary = Awaited<ReturnType<typeof getDashboardSummary>>;

interface UpcomingItem {
  label: string;
  when: string;
  kind: string;
  date: Date;
  amountMinor?: number;
}

export function UpcomingCommitments({ upcoming }: { upcoming: Summary["upcoming"] }) {
  const items: UpcomingItem[] = [];

  if (upcoming.nextIncome) {
    items.push({
      label: upcoming.nextIncome.sourceName,
      when: formatDateOnly(new Date(upcoming.nextIncome.expectedDate), "d MMM"),
      kind: "Income",
      date: new Date(upcoming.nextIncome.expectedDate),
      amountMinor: upcoming.nextIncome.plannedAmountMinor,
    });
  }
  if (upcoming.nextEmi) {
    items.push({
      label: `${upcoming.nextEmi.loan.name} EMI`,
      when: formatDateOnly(new Date(upcoming.nextEmi.date), "d MMM"),
      kind: `Auto-debit · ${upcoming.nextEmi.loan.lender}`,
      date: new Date(upcoming.nextEmi.date),
      amountMinor: upcoming.nextEmi.loan.currentEmiMinor,
    });
  }
  if (upcoming.nextSip) {
    items.push({
      label: upcoming.nextSip.investment.name,
      when: formatDateOnly(new Date(upcoming.nextSip.date), "d MMM"),
      kind: `Investment · ${upcoming.nextSip.investment.provider ?? "SIP"}`,
      date: new Date(upcoming.nextSip.date),
      amountMinor: upcoming.nextSip.investment.contributionAmountMinor,
    });
  }
  if (upcoming.nextCreditCardDue) {
    items.push({
      label: `${upcoming.nextCreditCardDue.account.name} due`,
      when: formatDateOnly(upcoming.nextCreditCardDue.dueDate, "d MMM"),
      kind: "Credit card",
      date: upcoming.nextCreditCardDue.dueDate,
    });
  }
  for (const bill of upcoming.upcomingBills) {
    items.push({
      label: bill.name,
      when: formatDateOnly(new Date(bill.nextOccurrenceDate), "d MMM"),
      kind: "Recurring bill",
      date: new Date(bill.nextOccurrenceDate),
      amountMinor: bill.amountMinor,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  const [first, ...rest] = items;

  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="text-[16px] font-extrabold tracking-tight">Upcoming</h2>
        <span className="text-[11.5px] font-semibold text-(--fl-muted)">Next 30 days</span>
      </div>

      {!first ? (
        <p className="text-[13px] font-medium text-(--fl-muted)">Nothing scheduled right now.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl bg-(--fl-mint-soft) p-[14px_16px]">
            <div className="text-[11px] font-bold tracking-[0.08em] text-(--fl-green-dark) uppercase">Due first</div>
            <div className="mt-1.5 text-[16px] leading-[1.3] font-extrabold tracking-tight">{first.label}</div>
            <div className="mt-0.5 text-xs font-medium text-(--fl-muted)">
              {first.when} · {first.kind}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2.5">
              <span className="text-xl font-extrabold tracking-tight tabular-nums">
                {first.amountMinor != null ? formatCurrency(first.amountMinor) : "—"}
              </span>
              <Link
                href="/calendar"
                className="rounded-full bg-(--fl-green) px-3.5 py-2.25 text-xs font-bold text-white hover:bg-(--fl-green-dark)"
              >
                Calendar
              </Link>
            </div>
          </div>
          {rest.slice(0, 3).map((u, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="grid size-[38px] shrink-0 place-items-center rounded-xl bg-(--fl-fill) text-center">
                <div>
                  <div className="text-xs leading-none font-extrabold">{u.date.getUTCDate()}</div>
                  <div className="text-[8.5px] font-bold tracking-wide text-(--fl-muted)">
                    {u.date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{u.label}</div>
                <div className="text-[11px] font-medium text-(--fl-muted)">{u.kind}</div>
              </div>
              <div className="shrink-0 text-[13px] font-extrabold tabular-nums">
                {u.amountMinor != null ? formatCurrency(u.amountMinor) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
