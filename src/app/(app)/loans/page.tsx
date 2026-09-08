import { listLoans } from "@/lib/actions/loans";
import { listAccounts } from "@/lib/actions/accounts";
import { PageHeader } from "@/components/finance/page-header";
import { LoansList } from "@/components/finance/loans/loans-list";

export default async function LoansPage() {
  const [loans, accounts] = await Promise.all([listLoans(true), listAccounts()]);

  return (
    <div>
      <PageHeader title="Loans" description="Track EMIs, balances, and payoff progress." />
      <LoansList loans={loans} accounts={accounts} />
    </div>
  );
}
