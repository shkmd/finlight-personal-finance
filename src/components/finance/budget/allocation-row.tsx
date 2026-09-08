"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { formatCurrency, fromMinorUnits } from "@/lib/money";
import { upsertBudgetAllocation, deleteBudgetAllocation } from "@/lib/actions/budget";
import { BudgetStatusBadge } from "@/components/finance/status-badge";
import type { BudgetVsActualRow } from "@/lib/actions/budget";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Trash2, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AllocationRow({ row, budgetMonthId, locked }: { row: BudgetVsActualRow; budgetMonthId: string; locked: boolean }) {
  const [amount, setAmount] = useState(fromMinorUnits(row.budgetedMinor));
  const router = useRouter();

  async function saveAmount() {
    const result = await upsertBudgetAllocation(budgetMonthId, { categoryId: row.categoryId, plannedAmount: amount });
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-3">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: row.categoryColor }} />
          {row.categoryName}
          <Tooltip>
            <TooltipTrigger>
              <History className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Last month: {formatCurrency(row.previousMonthActualMinor)}</TooltipContent>
          </Tooltip>
        </span>
      </td>
      <td className="py-2.5 pr-3">
        <Input
          type="number"
          inputMode="decimal"
          className="h-8 w-28"
          value={amount}
          disabled={locked}
          onChange={(e) => setAmount(Number(e.target.value))}
          onBlur={saveAmount}
        />
      </td>
      <td className="py-2.5 pr-3 tabular-nums">{formatCurrency(row.actualPaidMinor)}</td>
      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatCurrency(row.pendingMinor)}</td>
      <td className={`py-2.5 pr-3 tabular-nums ${row.remainingMinor < 0 ? "text-destructive" : ""}`}>{formatCurrency(row.remainingMinor)}</td>
      <td className="py-2.5 pr-3">
        <BudgetStatusBadge status={row.status} />
      </td>
      <td className="py-2.5 pr-3">
        {row.spendingPace.paceStatus === "AHEAD_OF_PACE" ? (
          <Tooltip>
            <TooltipTrigger>
              <TrendingUp className="size-4 text-amber-500" />
            </TooltipTrigger>
            <TooltipContent>
              {row.spendingPace.percentOfMonthElapsed.toFixed(0)}% of the month has passed; {row.spendingPace.percentOfBudgetUsed.toFixed(0)}% of this budget is used.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </td>
      <td className="py-2.5 text-right">
        {!locked ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={async () => {
              const result = await deleteBudgetAllocation(row.allocationId);
              if (!result.success) toast.error(result.error);
              else router.refresh();
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
