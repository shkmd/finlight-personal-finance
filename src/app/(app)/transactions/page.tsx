import { listExpenses } from "@/lib/actions/expenses";
import { listIncome } from "@/lib/actions/income";
import { listRecurringTransactions } from "@/lib/actions/recurring";
import { listAccounts } from "@/lib/actions/accounts";
import { listCategories, listPaymentMethods } from "@/lib/actions/categories";
import { currentYearMonth } from "@/lib/dates";
import { TransactionsClient } from "@/components/finance/transactions/transactions-client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const current = currentYearMonth();
  const [expenses, income, recurring, accounts, categories, paymentMethods] = await Promise.all([
    listExpenses({}),
    listIncome(),
    listRecurringTransactions(),
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
  ]);

  return (
    <TransactionsClient
      key={params.category ?? "all"}
      initialExpenses={expenses}
      initialIncome={income}
      initialRecurring={recurring}
      categories={categories}
      accounts={accounts}
      paymentMethods={paymentMethods}
      initialQuery={params.q ?? ""}
      initialCategoryName={params.category ?? null}
      year={params.year ? Number(params.year) : current.year}
      month={params.month ? Number(params.month) : current.month}
    />
  );
}
