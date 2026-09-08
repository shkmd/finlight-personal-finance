import { getDashboardSummary } from "@/lib/actions/dashboard";
import { hasSampleData } from "@/lib/actions/sampleData";
import { listAccounts } from "@/lib/actions/accounts";
import { listCategories, listPaymentMethods } from "@/lib/actions/categories";
import { currentYearMonth, monthsBetween } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/money";

import { PageHeader } from "@/components/finance/page-header";
import { SampleDataBanner } from "@/components/finance/dashboard/sample-data-banner";
import { HeadlineTile } from "@/components/finance/dashboard/headline-tile";
import { CashFlowChart } from "@/components/finance/dashboard/cash-flow-chart";
import { UpcomingCommitments } from "@/components/finance/dashboard/upcoming-commitments";
import { DebtGauge } from "@/components/finance/dashboard/debt-gauge";
import { DebtCountdownCard } from "@/components/finance/dashboard/debt-countdown-card";
import { CategoryBreakdown } from "@/components/finance/dashboard/category-breakdown";
import { LatestActivity } from "@/components/finance/dashboard/latest-activity";
import { ExpenseFormDialog } from "@/components/finance/transactions/expense-form-dialog";
import { IncomeFormDialog } from "@/components/finance/transactions/income-form-dialog";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const current = currentYearMonth();
  const year = params.year ? Number(params.year) : current.year;
  const month = params.month ? Number(params.month) : current.month;

  const [summary, sampleDataExists, accounts, categories, paymentMethods] = await Promise.all([
    getDashboardSummary({ year, month }),
    hasSampleData(),
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
  ]);

  const isEmpty = summary.totalIncomeReceivedMinor === 0 && summary.totalExpensesThisMonthMinor === 0 && summary.totalOutstandingDebtMinor === 0;
  const net = summary.totalIncomeReceivedMinor - summary.totalExpensesThisMonthMinor;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Your money this month, and how fast the debt is clearing."
        actions={
          <>
            <ExpenseFormDialog categories={categories} accounts={accounts} paymentMethods={paymentMethods} />
            <IncomeFormDialog accounts={accounts} trigger={<Button variant="outline" className="rounded-full">Add income</Button>} />
          </>
        }
      />

      {isEmpty ? <SampleDataBanner hasSampleData={sampleDataExists} /> : null}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <HeadlineTile
          variant="filled"
          label="Net this month"
          value={isEmpty ? "—" : formatCurrency(net)}
          pill={isEmpty ? "No data" : `${formatPercent(summary.savingsRatePercent, 0)} saved`}
          sub={isEmpty ? "Load sample data" : "Income minus everything paid"}
          href="/transactions"
        />
        <HeadlineTile
          label="Available cash"
          value={formatCurrency(summary.currentAvailableCashMinor)}
          pill={summary.liquidAccountsCount ? `${summary.liquidAccountsCount} accounts` : "No accounts"}
          sub={summary.unallocatedCashMinor != null ? `${formatCurrency(summary.unallocatedCashMinor)} unallocated` : "Add an account"}
          href="/accounts"
        />
        <HeadlineTile
          label="Outstanding debt"
          value={formatCurrency(summary.totalOutstandingDebtMinor)}
          valueColor="var(--fl-red)"
          pill={summary.totalMonthlyEmiMinor ? `${formatCurrency(summary.totalMonthlyEmiMinor)} EMI` : "No loans"}
          sub={summary.totalMonthlyEmiMinor ? `${formatPercent(summary.emiToIncomeRatio, 0)} of income` : "Add a loan"}
          href="/debt-planner"
        />
        <HeadlineTile
          label="Emergency fund"
          value={formatCurrency(summary.emergencyFundBalanceMinor)}
          pill={`${formatPercent(summary.emergencyFundProgressPercent, 0)} funded`}
          sub={summary.emergencyFundTargetMinor ? "Of your target" : "Set a target"}
          href="/emergency-fund"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-3">
        <div className="min-w-0 rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight">Cash flow</h2>
              <p className="mt-0.5 text-xs font-medium text-(--fl-muted)">Six months of money in and out. Hover a month for detail.</p>
            </div>
            <div className="flex gap-3.5 text-[11.5px] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-(--fl-green)" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-(--fl-red)" />
                Expenses
              </span>
            </div>
          </div>
          <CashFlowChart series={summary.series} />
        </div>
        <UpcomingCommitments upcoming={summary.upcoming} />
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-3">
        <DebtGauge
          originalPrincipalMinor={summary.originalPrincipalMinor}
          clearedPrincipalMinor={summary.clearedPrincipalMinor}
          outstandingMinor={summary.totalOutstandingDebtMinor}
        />
        <DebtCountdownCard
          monthsLeft={
            summary.acceleratedDebtFreeDate || summary.baselineDebtFreeDate
              ? Math.max(0, monthsBetween(new Date(), (summary.acceleratedDebtFreeDate ?? summary.baselineDebtFreeDate)!))
              : null
          }
          targetDateLabel={
            summary.acceleratedDebtFreeDate
              ? summary.acceleratedDebtFreeDate.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })
              : summary.baselineDebtFreeDate
                ? summary.baselineDebtFreeDate.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })
                : "No plan yet"
          }
          extraPerMonthMinor={summary.extraMonthlyAmountMinor}
          interestSavedMinor={summary.interestSavedMinor}
        />
        <CategoryBreakdown categories={summary.categories} monthLabel={summary.monthLabel} />
      </div>

      <LatestActivity
        items={summary.activity.map((a) => ({
          id: a.id,
          description: a.description,
          meta: a.meta,
          amountMinor: a.amountMinor,
          isIncome: a.isIncome,
        }))}
      />
    </div>
  );
}
