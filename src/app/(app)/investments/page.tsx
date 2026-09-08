import { listInvestments } from "@/lib/actions/investments";
import { listAccounts } from "@/lib/actions/accounts";
import { PageHeader } from "@/components/finance/page-header";
import { InvestmentsList } from "@/components/finance/investments/investments-list";

export default async function InvestmentsPage() {
  const [investments, accounts] = await Promise.all([listInvestments(), listAccounts()]);

  return (
    <div>
      <PageHeader title="Investments" description="SIPs, ELSS, PPF, gold and other recurring investments." />
      <InvestmentsList investments={investments} accounts={accounts} />
    </div>
  );
}
