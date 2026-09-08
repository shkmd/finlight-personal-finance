"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { deletePayoffScenario, listPayoffScenarios } from "@/lib/actions/payoffScenarios";
import { EmptyState } from "@/components/finance/empty-state";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Trash2 } from "lucide-react";

type Scenario = Awaited<ReturnType<typeof listPayoffScenarios>>[number];

export function SavedScenariosList({ scenarios: initialScenarios }: { scenarios: Scenario[] }) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);
  const [, startTransition] = useTransition();

  if (scenarios.length === 0) {
    return <EmptyState icon={Target} title="No saved scenarios yet" description="Run and save a payoff plan above to compare it later." />;
  }

  return (
    <div className="space-y-3">
      {scenarios.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{s.name}</p>
                <Badge variant="outline">{s.strategy}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.scenarioLoans.map((sl) => sl.loan.name).join(", ")}
              </p>
            </div>
            {s.summary ? (
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Debt-free</p>
                  <p className="font-medium">{s.summary.acceleratedDebtFreeDate ? formatDateOnly(new Date(s.summary.acceleratedDebtFreeDate)) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Months saved</p>
                  <p className="font-medium">{s.summary.monthsSaved}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interest saved</p>
                  <p className="font-medium">{formatCurrency(s.summary.interestSavedMinor)}</p>
                </div>
              </div>
            ) : null}
            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteTarget(s)}>
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete scenario?"
        description="This only removes the saved plan — it does not affect your actual loans."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deletePayoffScenario(deleteTarget.id);
          if (!result.success) toast.error(result.error);
          else {
            toast.success("Scenario deleted");
            startTransition(() => setScenarios((prev) => prev.filter((x) => x.id !== deleteTarget.id)));
          }
        }}
      />
    </div>
  );
}
