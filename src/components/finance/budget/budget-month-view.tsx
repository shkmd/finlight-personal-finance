"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lock, LockOpen, Save } from "lucide-react";

import { formatCurrency, formatPercent } from "@/lib/money";
import { setBudgetMonthLock, saveAsTemplate, type BudgetVsActualSummary } from "@/lib/actions/budget";
import { StatCard } from "@/components/finance/stat-card";
import { AllocationRow } from "@/components/finance/budget/allocation-row";
import { AddAllocationDialog } from "@/components/finance/budget/add-allocation-dialog";
import { MoneyBarChart } from "@/components/finance/charts/money-bar-chart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BudgetCategory } from "@prisma/client";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BudgetMonthView({
  summary,
  year,
  month,
  allCategories,
}: {
  summary: BudgetVsActualSummary;
  year: number;
  month: number;
  allCategories: BudgetCategory[];
}) {
  const router = useRouter();
  const prevDate = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextDate = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const allocatedCategoryIds = new Set(summary.rows.map((r) => r.categoryId));
  const availableCategories = allCategories.filter((c) => !allocatedCategoryIds.has(c.id));
  const locked = summary.budgetMonth.isLocked;

  async function toggleLock() {
    const result = await setBudgetMonthLock(summary.budgetMonth.id, !locked);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  async function handleSaveTemplate() {
    const name = window.prompt("Template name?", `${MONTH_NAMES[month - 1]} ${year} template`);
    if (!name) return;
    const result = await saveAsTemplate(summary.budgetMonth.id, name);
    if (!result.success) toast.error(result.error);
    else toast.success("Template saved");
  }

  const chartData = summary.rows
    .slice()
    .sort((a, b) => b.budgetedMinor - a.budgetedMinor)
    .slice(0, 8)
    .map((r) => ({ label: r.categoryName, Budgeted: r.budgetedMinor, Actual: r.actualPaidMinor }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={`/budget?year=${prevDate.y}&month=${prevDate.m}`}>
            <Button size="icon-sm" variant="ghost">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <h2 className="w-40 text-center text-lg font-semibold">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Link href={`/budget?year=${nextDate.y}&month=${nextDate.m}`}>
            <Button size="icon-sm" variant="ghost">
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveTemplate}>
            <Save className="mr-1.5 size-4" /> Save as template
          </Button>
          <Button size="sm" variant="outline" onClick={toggleLock}>
            {locked ? <LockOpen className="mr-1.5 size-4" /> : <Lock className="mr-1.5 size-4" />}
            {locked ? "Unlock month" : "Lock month"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Planned income" value={formatCurrency(summary.totalPlannedIncomeMinor)} />
        <StatCard label="Total planned allocation" value={formatCurrency(summary.totalPlannedAllocationMinor)} />
        <StatCard
          label="Unallocated cash"
          value={formatCurrency(summary.unallocatedCashMinor)}
          tone={summary.unallocatedCashMinor < 0 ? "negative" : "positive"}
          hint={summary.unallocatedCashMinor >= 0 ? "Not yet assigned a job" : "Allocations exceed planned income"}
        />
        <StatCard
          label="Projected month-end balance"
          value={formatCurrency(summary.projectedMonthEndBalanceMinor)}
          tone={summary.projectedMonthEndBalanceMinor < 0 ? "negative" : "default"}
          hint="Estimate — expected income minus paid & pending"
        />
        <StatCard label="Actual paid so far" value={formatCurrency(summary.totalActualPaidMinor)} />
        <StatCard label="Pending commitments" value={formatCurrency(summary.totalPendingMinor)} />
        <StatCard
          label="Actual month-end balance"
          value={formatCurrency(summary.actualMonthEndBalanceMinor)}
          hint="Received income minus actual outflows"
        />
        <StatCard label="Budget adherence score" value={formatPercent(summary.budgetAdherenceScorePercent, 0)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget vs actual by category</CardTitle>
          <AddAllocationDialog budgetMonthId={summary.budgetMonth.id} availableCategories={availableCategories} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Planned</th>
                  <th className="py-2 pr-3 font-medium">Actual</th>
                  <th className="py-2 pr-3 font-medium">Pending</th>
                  <th className="py-2 pr-3 font-medium">Remaining</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Pace</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <AllocationRow key={row.categoryId} row={row} budgetMonthId={summary.budgetMonth.id} locked={locked} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top categories: planned vs actual</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyBarChart
            data={chartData}
            bars={[
              { key: "Budgeted", label: "Planned", color: "#94a3b8" },
              { key: "Actual", label: "Actual", color: "#6366f1" },
            ]}
            summary="Bar chart comparing planned versus actual spending for the largest budget categories."
          />
        </CardContent>
      </Card>
    </div>
  );
}
