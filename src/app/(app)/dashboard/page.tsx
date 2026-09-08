import { getDashboardSummary } from "@/lib/actions/dashboard";
import { hasSampleData } from "@/lib/actions/sampleData";
import { listAccounts } from "@/lib/actions/accounts";
import { listCategories, listPaymentMethods } from "@/lib/actions/categories";
import { listExpenses } from "@/lib/actions/expenses";
import { listLoans } from "@/lib/actions/loans";
import { currentYearMonth } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/money";

import { PageHeader } from "@/components/finance/page-header";
import { StatCard } from "@/components/finance/stat-card";
import { SampleDataBanner } from "@/components/finance/dashboard/sample-data-banner";
import { QuickActions } from "@/components/finance/dashboard/quick-actions";
import { UpcomingCommitments } from "@/components/finance/dashboard/upcoming-commitments";
import { CategoryPieChart } from "@/components/finance/charts/category-pie-chart";
import { MoneyBarChart } from "@/components/finance/charts/money-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_COLORS = ["#6366f1", "#0891b2", "#16a34a", "#9333ea", "#dc2626", "#ea580c", "#64748b"];

export default async function DashboardPage() {
  const { year, month } = currentYearMonth();
  const [summary, sampleDataExists, accounts, categories, paymentMethods, expenses, loans] = await Promise.all([
    getDashboardSummary(),
    hasSampleData(),
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
    listExpenses({ from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 0)) }),
    listLoans(),
  ]);

  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    if (e.status !== "PAID") continue;
    const name = e.category?.name ?? "Uncategorized";
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + e.amountMinor);
  }
  const sortedCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topCategories = sortedCategories.slice(0, 6);
  const otherTotal = sortedCategories.slice(6).reduce((s, [, v]) => s + v, 0);
  const pieData = [
    ...topCategories.map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    ...(otherTotal > 0 ? [{ name: "Other", value: otherTotal, color: "#94a3b8" }] : []),
  ];

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const debtBarData = activeLoans.map((l) => ({ label: l.name, Balance: l.currentOutstandingPrincipalMinor }));

  const incomeExpenseData = [{ label: "This month", Income: summary.totalIncomeReceivedMinor, Expenses: summary.totalExpensesThisMonthMinor }];

  return (
    <div>
      <PageHeader title="Dashboard" description="Your complete financial picture at a glance." />
      <SampleDataBanner hasSampleData={sampleDataExists} />

      <div className="mb-6">
        <QuickActions categories={categories} accounts={accounts} paymentMethods={paymentMethods} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income received (month)" value={formatCurrency(summary.totalIncomeReceivedMinor)} tone="positive" />
        <StatCard label="Expenses (month)" value={formatCurrency(summary.totalExpensesThisMonthMinor)} />
        <StatCard label="Available cash" value={formatCurrency(summary.currentAvailableCashMinor)} />
        <StatCard
          label="Unallocated cash"
          value={summary.unallocatedCashMinor != null ? formatCurrency(summary.unallocatedCashMinor) : "No budget yet"}
          tone={summary.unallocatedCashMinor != null && summary.unallocatedCashMinor < 0 ? "negative" : "default"}
        />
        <StatCard
          label="Projected month-end balance"
          value={summary.projectedMonthEndBalanceMinor != null ? formatCurrency(summary.projectedMonthEndBalanceMinor) : "—"}
          tone={summary.projectedMonthEndBalanceMinor != null && summary.projectedMonthEndBalanceMinor < 0 ? "negative" : "default"}
        />
        <StatCard label="Actual month-end balance" value={summary.actualMonthEndBalanceMinor != null ? formatCurrency(summary.actualMonthEndBalanceMinor) : "—"} />
        <StatCard label="Total outstanding debt" value={formatCurrency(summary.totalOutstandingDebtMinor)} />
        <StatCard label="Total monthly EMI" value={formatCurrency(summary.totalMonthlyEmiMinor)} />
        <StatCard label="EMI-to-income ratio" value={formatPercent(summary.emiToIncomeRatio, 1)} tone={summary.emiToIncomeRatio > 40 ? "warning" : "default"} />
        <StatCard label="Weighted avg. interest rate" value={formatPercent(summary.weightedAvgInterestRate, 2)} />
        <StatCard label="Baseline debt-free date" value={summary.baselineDebtFreeDate ? summary.baselineDebtFreeDate.toLocaleDateString("en-IN") : "—"} />
        <StatCard label="Accelerated debt-free date" value={summary.acceleratedDebtFreeDate ? summary.acceleratedDebtFreeDate.toLocaleDateString("en-IN") : "No saved plan"} tone="positive" />
        <StatCard label="Months saved" value={summary.monthsSaved != null ? `${summary.monthsSaved}` : "—"} tone="positive" />
        <StatCard label="Interest saved (estimate)" value={summary.interestSavedMinor != null ? formatCurrency(summary.interestSavedMinor) : "—"} tone="positive" />
        <StatCard label="Active monthly SIP" value={formatCurrency(summary.activeSipMonthlyMinor)} />
        <StatCard label="Paused SIP (monthly)" value={formatCurrency(summary.pausedSipMonthlyMinor)} />
        <StatCard label="Emergency fund balance" value={formatCurrency(summary.emergencyFundBalanceMinor)} />
        <StatCard label="Emergency fund progress" value={formatPercent(summary.emergencyFundProgressPercent, 0)} />
        <StatCard label="Savings rate" value={formatPercent(summary.savingsRatePercent, 1)} tone={summary.savingsRatePercent >= 0 ? "positive" : "negative"} />
        {summary.budgetAdherenceScorePercent != null ? (
          <StatCard label="Budget adherence score" value={formatPercent(summary.budgetAdherenceScorePercent, 0)} />
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Income vs expenses (this month)</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyBarChart
                data={incomeExpenseData}
                bars={[
                  { key: "Income", label: "Income", color: "#16a34a" },
                  { key: "Expenses", label: "Expenses", color: "#dc2626" },
                ]}
                summary={`Income received this month: ${formatCurrency(summary.totalIncomeReceivedMinor)}. Expenses this month: ${formatCurrency(summary.totalExpensesThisMonthMinor)}.`}
              />
            </CardContent>
          </Card>

          {activeLoans.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Outstanding debt by loan</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyBarChart
                  data={debtBarData}
                  bars={[{ key: "Balance", label: "Outstanding balance", color: "#dc2626" }]}
                  summary="Bar chart of outstanding balance for each active loan."
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Expense breakdown by category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={pieData} summary="Pie chart of this month's paid expenses by category." />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <UpcomingCommitments upcoming={summary.upcoming} />
        </div>
      </div>
    </div>
  );
}
