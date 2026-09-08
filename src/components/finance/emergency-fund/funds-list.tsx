import type { FinancialAccount } from "@prisma/client";
import { formatCurrency, formatPercent } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import {
  estimatedCompletionDate,
  monthsOfExpensesCovered,
  progressPercent,
  recommendedTargetMinor,
  requiredMonthlyContributionMinor,
} from "@/lib/finance/emergencyFund";
import type { listEmergencyFunds } from "@/lib/actions/emergencyFund";
import { FundFormDialog } from "@/components/finance/emergency-fund/fund-form-dialog";
import { FundTransactionDialog } from "@/components/finance/emergency-fund/fund-transaction-dialog";
import { EmptyState } from "@/components/finance/empty-state";
import { SampleDataBadge } from "@/components/finance/status-badge";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

type Fund = Awaited<ReturnType<typeof listEmergencyFunds>>[number];

export function FundsList({
  funds,
  accounts,
  avgMonthlyEssentialMinor,
}: {
  funds: Fund[];
  accounts: FinancialAccount[];
  avgMonthlyEssentialMinor: number;
}) {
  if (funds.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No emergency fund set up"
        description="Set a target based on your essential expenses, and start tracking progress."
        action={<FundFormDialog accounts={accounts} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FundFormDialog accounts={accounts} />
      {funds.map((fund) => {
        const target = recommendedTargetMinor({
          targetMethod: fund.targetMethod,
          avgMonthlyEssentialExpensesMinor: avgMonthlyEssentialMinor,
          fixedTargetAmountMinor: fund.fixedTargetAmountMinor,
          targetMonths: fund.targetMonths,
        });
        const progress = progressPercent(fund.currentSavedAmountMinor, target);
        const monthsCovered = monthsOfExpensesCovered(fund.currentSavedAmountMinor, avgMonthlyEssentialMinor);
        const completion = estimatedCompletionDate({
          savedAmountMinor: fund.currentSavedAmountMinor,
          targetAmountMinor: target,
          monthlyContributionMinor: fund.currentMonthlyContributionMinor,
          fromDate: new Date(),
        });
        const requiredIfTargetDate = fund.targetDate
          ? requiredMonthlyContributionMinor({
              savedAmountMinor: fund.currentSavedAmountMinor,
              targetAmountMinor: target,
              targetDate: new Date(fund.targetDate),
              fromDate: new Date(),
            })
          : null;

        return (
          <Card key={fund.id}>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{fund.name}</p>
                  {fund.isSampleData ? <SampleDataBadge /> : null}
                </div>
                <div className="flex gap-2">
                  <FundTransactionDialog fundId={fund.id} type="DEPOSIT" accounts={accounts} />
                  <FundTransactionDialog fundId={fund.id} type="WITHDRAWAL" accounts={accounts} />
                  <FundFormDialog fund={fund} accounts={accounts} trigger={<Badge className="cursor-pointer" variant="outline">Edit</Badge>} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-semibold tabular-nums">{formatCurrency(fund.currentSavedAmountMinor)}</span>
                  <span className="text-muted-foreground">of {formatCurrency(target)} target</span>
                </div>
                <Progress value={progress} />
                <p className="mt-1 text-xs text-muted-foreground">{formatPercent(progress, 0)} funded · covers ~{monthsCovered.toFixed(1)} months of essentials</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly contribution</p>
                  <p className="font-semibold">{formatCurrency(fund.currentMonthlyContributionMinor)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated completion</p>
                  <p className="font-semibold">{completion ? formatDateOnly(completion) : "—"}</p>
                </div>
                {requiredIfTargetDate != null ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Needed for target date</p>
                    <p className="font-semibold">{formatCurrency(requiredIfTargetDate)}/mo</p>
                  </div>
                ) : null}
              </div>

              {fund.transactions.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent activity</p>
                  <div className="space-y-1">
                    {fund.transactions.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span>
                          {formatDateOnly(new Date(t.date))} · {t.type === "DEPOSIT" ? "Deposit" : "Withdrawal"} {t.reason ? `— ${t.reason}` : ""}
                        </span>
                        <span className={t.type === "DEPOSIT" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                          {t.type === "DEPOSIT" ? "+" : "-"}
                          {formatCurrency(t.amountMinor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
