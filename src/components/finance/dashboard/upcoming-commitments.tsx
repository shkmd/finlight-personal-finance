import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import type { getDashboardSummary } from "@/lib/actions/dashboard";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CalendarClock } from "lucide-react";

type Summary = Awaited<ReturnType<typeof getDashboardSummary>>;

export function UpcomingCommitments({ upcoming }: { upcoming: Summary["upcoming"] }) {
  const items: Array<{ label: string; date: Date; amount?: number }> = [];

  if (upcoming.nextIncome) {
    items.push({ label: `Income: ${upcoming.nextIncome.sourceName}`, date: new Date(upcoming.nextIncome.expectedDate), amount: upcoming.nextIncome.plannedAmountMinor });
  }
  if (upcoming.nextEmi) {
    items.push({ label: `EMI: ${upcoming.nextEmi.loan.name}`, date: new Date(upcoming.nextEmi.date), amount: upcoming.nextEmi.loan.currentEmiMinor });
  }
  if (upcoming.nextSip) {
    items.push({ label: `SIP: ${upcoming.nextSip.investment.name}`, date: new Date(upcoming.nextSip.date), amount: upcoming.nextSip.investment.contributionAmountMinor });
  }
  if (upcoming.nextCreditCardDue) {
    items.push({ label: `Credit card due: ${upcoming.nextCreditCardDue.account.name}`, date: upcoming.nextCreditCardDue.dueDate });
  }
  for (const bill of upcoming.upcomingBills) {
    items.push({ label: `Bill: ${bill.name}`, date: new Date(bill.nextOccurrenceDate), amount: bill.amountMinor });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" /> Upcoming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.expectedCashShortage ? (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">Your projected balance may fall short this month.</AlertDescription>
          </Alert>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled right now.</p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 6).map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">{item.label}</span>
                <span className="ml-2 shrink-0 text-right text-xs text-muted-foreground">
                  {formatDateOnly(item.date)}
                  {item.amount != null ? <span className="ml-1 font-medium text-foreground">{formatCurrency(item.amount)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
