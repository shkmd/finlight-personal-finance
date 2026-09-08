import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import type { getCashFlowForecast } from "@/lib/actions/cashflow";
import { MoneyLineChart } from "@/components/finance/charts/money-line-chart";
import { EmptyState } from "@/components/finance/empty-state";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarDays } from "lucide-react";

type Forecast = Awaited<ReturnType<typeof getCashFlowForecast>>;

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EMI: "EMI",
  SIP: "SIP",
  BILL: "Bill",
  CREDIT_CARD_DUE: "Card due",
};

export function CashflowView({ forecast }: { forecast: Forecast }) {
  if (forecast.timeline.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No upcoming events found"
        description="Add income, loans, SIPs, or recurring bills to see your projected cash flow."
      />
    );
  }

  const chartData = forecast.timeline.map((day) => ({ label: formatDateOnly(day.date, "d MMM"), Balance: day.balanceMinor }));

  return (
    <div className="space-y-4">
      {forecast.warnings.map((w, i) => (
        <Alert key={i} variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>{w}</AlertDescription>
        </Alert>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Projected running balance</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyLineChart
            data={chartData}
            lines={[{ key: "Balance", label: "Projected balance", color: "#6366f1" }]}
            summary={`Projected cash balance starting at ${formatCurrency(forecast.startingBalanceMinor)}, based on upcoming income, EMIs, SIPs and bills.`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {forecast.timeline.map((day) => (
            <div key={day.date.toISOString()} className="border-b pb-2 last:border-0">
              <div className="mb-1 flex items-center justify-between text-sm font-medium">
                <span>{formatDateOnly(day.date)}</span>
                <span className={day.balanceMinor < forecast.safeBufferMinor ? "text-destructive" : ""}>{formatCurrency(day.balanceMinor)}</span>
              </div>
              <div className="space-y-1">
                {day.events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[e.type]}
                      </Badge>
                      {e.label}
                    </span>
                    {e.amountMinor !== 0 ? (
                      <span className={e.amountMinor > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>{formatCurrency(e.amountMinor)}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
