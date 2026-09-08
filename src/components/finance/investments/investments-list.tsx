"use client";

import { toast } from "sonner";
import type { FinancialAccount, Investment } from "@prisma/client";

import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { monthlyEquivalentMinor, FREQUENCY_LABELS } from "@/lib/finance/sip";
import { resumeInvestment } from "@/lib/actions/investments";
import { InvestmentFormDialog } from "@/components/finance/investments/investment-form-dialog";
import { PauseInvestmentDialog } from "@/components/finance/investments/pause-investment-dialog";
import { ContributionDialog } from "@/components/finance/investments/contribution-dialog";
import { EmptyState } from "@/components/finance/empty-state";
import { SampleDataBadge } from "@/components/finance/status-badge";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PiggyBank, PlayCircle } from "lucide-react";

export function InvestmentsList({ investments, accounts }: { investments: Investment[]; accounts: FinancialAccount[] }) {
  const active = investments.filter((i) => i.isActive);
  const paused = investments.filter((i) => !i.isActive);

  if (investments.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="No investments yet"
        description="Track SIPs, ELSS, PPF, gold, and other recurring investments."
        action={<InvestmentFormDialog />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <InvestmentFormDialog />

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Active ({active.length})</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {active.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{inv.name}</p>
                      {inv.isTaxLinked ? <Badge variant="outline">Tax-linked</Badge> : null}
                      {inv.isSampleData ? <SampleDataBadge /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.investmentType.replace(/_/g, " ")} · {inv.provider ?? "—"}
                    </p>
                  </div>
                  <InvestmentFormDialog investment={inv} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{FREQUENCY_LABELS[inv.frequency]} contribution</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(inv.contributionAmountMinor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly equivalent</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(monthlyEquivalentMinor(inv.contributionAmountMinor, inv.frequency))}</p>
                  </div>
                  {inv.currentMarketValueMinor != null ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Market value</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(inv.currentMarketValueMinor)}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs text-muted-foreground">Next contribution</p>
                    <p className="font-semibold tabular-nums">{formatDateOnly(new Date(inv.nextContributionDate))}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ContributionDialog investmentId={inv.id} accounts={accounts} />
                  <PauseInvestmentDialog investment={inv} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {paused.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Paused ({paused.length})</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {paused.map((inv) => (
              <Card key={inv.id} className="opacity-80">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{inv.name}</p>
                        <Badge variant="outline">Paused</Badge>
                        {inv.isSampleData ? <SampleDataBadge /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paused {inv.pauseDate ? formatDateOnly(new Date(inv.pauseDate)) : "—"}
                        {inv.plannedResumeDate ? ` · resume planned ${formatDateOnly(new Date(inv.plannedResumeDate))}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const result = await resumeInvestment(inv.id, new Date());
                      if (!result.success) toast.error(result.error);
                      else toast.success("Investment resumed");
                    }}
                  >
                    <PlayCircle className="mr-1 size-4" /> Resume
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
