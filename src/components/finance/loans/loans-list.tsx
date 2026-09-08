"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { FinancialAccount, Loan } from "@prisma/client";

import { formatCurrency, formatPercent } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { detectLoanWarnings } from "@/lib/finance/emi";
import { archiveLoan } from "@/lib/actions/loans";
import { LoanFormDialog } from "@/components/finance/loans/loan-form-dialog";
import { RecordPaymentDialog } from "@/components/finance/loans/record-payment-dialog";
import { EmptyState } from "@/components/finance/empty-state";
import { SampleDataBadge } from "@/components/finance/status-badge";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, BadgeIndianRupee, Archive } from "lucide-react";

type SortView = "ALL" | "AVALANCHE" | "SNOWBALL" | "SHORTEST_TENURE" | "HIGHEST_EMI" | "PAID_OFF";

export function LoansList({ loans, accounts }: { loans: Loan[]; accounts: FinancialAccount[] }) {
  const [view, setView] = useState<SortView>("ALL");

  const sortedLoans = useMemo(() => {
    const active = loans.filter((l) => l.status === "ACTIVE");
    const paidOff = loans.filter((l) => l.status === "PAID_OFF");
    switch (view) {
      case "AVALANCHE":
        return [...active].sort((a, b) => b.annualInterestRatePercent - a.annualInterestRatePercent);
      case "SNOWBALL":
        return [...active].sort((a, b) => a.currentOutstandingPrincipalMinor - b.currentOutstandingPrincipalMinor);
      case "SHORTEST_TENURE":
        return [...active].sort((a, b) => a.remainingTenureMonths - b.remainingTenureMonths);
      case "HIGHEST_EMI":
        return [...active].sort((a, b) => b.currentEmiMinor - a.currentEmiMinor);
      case "PAID_OFF":
        return paidOff;
      default:
        return [...active, ...paidOff];
    }
  }, [loans, view]);

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={BadgeIndianRupee}
        title="No loans yet"
        description="Add your loans and credit cards to track EMIs and plan payoff."
        action={<LoanFormDialog />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <LoanFormDialog />
        <Select value={view} onValueChange={(v) => setView(v as SortView)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All loans</SelectItem>
            <SelectItem value="AVALANCHE">Avalanche (highest rate first)</SelectItem>
            <SelectItem value="SNOWBALL">Snowball (lowest balance first)</SelectItem>
            <SelectItem value="SHORTEST_TENURE">Shortest tenure first</SelectItem>
            <SelectItem value="HIGHEST_EMI">Highest EMI first</SelectItem>
            <SelectItem value="PAID_OFF">Paid off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {sortedLoans.map((loan) => {
          const warnings = detectLoanWarnings({
            principalMinor: loan.currentOutstandingPrincipalMinor,
            annualRatePercent: loan.annualInterestRatePercent,
            emiMinor: loan.currentEmiMinor,
            remainingTenureMonths: loan.remainingTenureMonths,
            rateType: loan.rateType,
          });
          const progress = loan.originalPrincipalMinor > 0
            ? 100 - (loan.currentOutstandingPrincipalMinor / loan.originalPrincipalMinor) * 100
            : 0;

          return (
            <Card key={loan.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{loan.name}</p>
                      {loan.status === "PAID_OFF" ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">Paid off</Badge> : null}
                      {loan.isSampleData ? <SampleDataBadge /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {loan.lender} · {loan.annualInterestRatePercent}% {loan.rateType === "FLOATING" ? "(floating)" : ""} · EMI {formatCurrency(loan.currentEmiMinor)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {loan.status === "ACTIVE" ? <RecordPaymentDialog loan={loan} accounts={accounts} /> : null}
                    <LoanFormDialog loan={loan} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                    {loan.status !== "ARCHIVED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={async () => {
                          const result = await archiveLoan(loan.id);
                          if (!result.success) toast.error(result.error);
                        }}
                      >
                        <Archive className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(loan.currentOutstandingPrincipalMinor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining tenure</p>
                    <p className="font-semibold tabular-nums">{loan.remainingTenureMonths} mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next payment</p>
                    <p className="font-semibold tabular-nums">{formatDateOnly(new Date(loan.nextPaymentDate))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="font-semibold tabular-nums">{formatPercent(progress, 0)}</p>
                  </div>
                </div>
                <Progress value={progress} />

                {warnings.map((w) => (
                  <Alert key={w.code} variant="destructive" className="py-2">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="text-xs">{w.message}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
