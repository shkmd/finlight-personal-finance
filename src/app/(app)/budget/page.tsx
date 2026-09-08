import { getBudgetVsActual, listBudgetMonths, listBudgetTemplates } from "@/lib/actions/budget";
import { listCategories } from "@/lib/actions/categories";
import { currentYearMonth } from "@/lib/dates";
import { PageHeader } from "@/components/finance/page-header";
import { CreateBudgetDialog } from "@/components/finance/budget/create-budget-dialog";
import { BudgetMonthView } from "@/components/finance/budget/budget-month-view";
import { EmptyState } from "@/components/finance/empty-state";
import { Wallet } from "lucide-react";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const current = currentYearMonth();
  const year = params.year ? parseInt(params.year, 10) : current.year;
  const month = params.month ? parseInt(params.month, 10) : current.month;

  const [summary, categories, budgetMonths, templates] = await Promise.all([
    getBudgetVsActual(year, month),
    listCategories(),
    listBudgetMonths(),
    listBudgetTemplates(),
  ]);

  const hasPreviousMonth = budgetMonths.some((b) => (b.year === year && b.month < month) || b.year < year);

  return (
    <div>
      <PageHeader title="Budget" description="Plan your month, then track it against actual spending." />
      {summary ? (
        <BudgetMonthView summary={summary} year={year} month={month} allCategories={categories} />
      ) : (
        <EmptyState
          icon={Wallet}
          title={`No budget for this month yet`}
          description="Create a budget to plan income, expenses, debt repayment and savings."
          action={<CreateBudgetDialog year={year} month={month} hasPreviousMonth={hasPreviousMonth} templates={templates} />}
        />
      )}
    </div>
  );
}
