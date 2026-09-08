import { listEmergencyFunds, getAvgMonthlyEssentialExpensesMinor } from "@/lib/actions/emergencyFund";
import { listAccounts } from "@/lib/actions/accounts";
import { PageHeader } from "@/components/finance/page-header";
import { FundsList } from "@/components/finance/emergency-fund/funds-list";

export default async function EmergencyFundPage() {
  const [funds, accounts, avgMonthlyEssentialMinor] = await Promise.all([
    listEmergencyFunds(),
    listAccounts(),
    getAvgMonthlyEssentialExpensesMinor(),
  ]);

  return (
    <div>
      <PageHeader title="Emergency Fund" description="Build a safety net based on your essential expenses." />
      <FundsList funds={funds} accounts={accounts} avgMonthlyEssentialMinor={avgMonthlyEssentialMinor} />
    </div>
  );
}
