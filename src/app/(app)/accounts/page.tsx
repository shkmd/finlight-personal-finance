import { listAccounts } from "@/lib/actions/accounts";
import { PageHeader } from "@/components/finance/page-header";
import { AccountsList } from "@/components/finance/accounts/accounts-list";

export default async function AccountsPage() {
  const accounts = await listAccounts(true);

  return (
    <div>
      <PageHeader title="Accounts" description="Bank accounts, cash, wallets, and credit cards." />
      <AccountsList accounts={accounts} />
    </div>
  );
}
