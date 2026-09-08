import { listExpenses } from "@/lib/actions/expenses";
import { listIncome } from "@/lib/actions/income";
import { listRecurringTransactions } from "@/lib/actions/recurring";
import { listAccounts } from "@/lib/actions/accounts";
import { listCategories, listPaymentMethods } from "@/lib/actions/categories";
import { PageHeader } from "@/components/finance/page-header";
import { TransactionsClient } from "@/components/finance/transactions/transactions-client";

export default async function TransactionsPage() {
  const [expenses, income, recurring, accounts, categories, paymentMethods] = await Promise.all([
    listExpenses({}),
    listIncome(),
    listRecurringTransactions(),
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
  ]);

  return (
    <div>
      <PageHeader title="Transactions" description="Track every rupee in and out." />
      <TransactionsClient
        initialExpenses={expenses}
        initialIncome={income}
        initialRecurring={recurring}
        categories={categories}
        accounts={accounts}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
