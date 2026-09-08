"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { FinancialAccount } from "@prisma/client";

import { formatCurrency } from "@/lib/money";
import { archiveAccount, deleteAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/components/finance/account-type-labels";
import { AccountFormDialog } from "@/components/finance/accounts/account-form-dialog";
import { TransferDialog } from "@/components/finance/accounts/transfer-dialog";
import { EmptyState } from "@/components/finance/empty-state";
import { SampleDataBadge } from "@/components/finance/status-badge";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { creditUtilizationPercent } from "@/lib/finance/creditCard";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Landmark, MoreVertical, Archive, ArchiveRestore, Trash2 } from "lucide-react";

export function AccountsList({ accounts }: { accounts: FinancialAccount[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<FinancialAccount | null>(null);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No accounts yet"
        description="Add your bank accounts, cash, wallets, and credit cards to start tracking balances."
        action={<AccountFormDialog />}
      />
    );
  }

  function toggleArchive(account: FinancialAccount) {
    startTransition(async () => {
      const result = await archiveAccount(account.id, !account.isArchived);
      if (!result.success) toast.error(result.error);
      else toast.success(account.isArchived ? "Account restored" : "Account archived");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AccountFormDialog />
        <TransferDialog accounts={accounts.filter((a) => !a.isArchived)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const isCreditCard = account.type === "CREDIT_CARD";
          const utilization = isCreditCard && account.creditLimitMinor ? creditUtilizationPercent(account.currentBalanceMinor, account.creditLimitMinor) : null;

          return (
            <Card key={account.id} className={account.isArchived ? "opacity-60" : ""}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]} {account.institution ? `· ${account.institution}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {account.isSampleData ? <SampleDataBadge /> : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <AccountFormDialog account={account} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>} />
                        <DropdownMenuItem onClick={() => toggleArchive(account)} disabled={isPending}>
                          {account.isArchived ? (
                            <>
                              <ArchiveRestore className="mr-2 size-4" /> Restore
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 size-4" /> Archive
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(account)}>
                          <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <p className={`text-2xl font-semibold tabular-nums ${isCreditCard ? "text-destructive" : ""}`}>
                  {formatCurrency(account.currentBalanceMinor, { currency: account.currency })}
                </p>

                {isCreditCard && account.creditLimitMinor ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Utilization</span>
                      <span>{utilization?.toFixed(0)}%</span>
                    </div>
                    <Progress value={utilization ?? 0} className={utilization && utilization > 30 ? "[&>div]:bg-amber-500" : ""} />
                    <p className="text-xs text-muted-foreground">
                      Limit {formatCurrency(account.creditLimitMinor)} · Due day {account.paymentDueDay ?? "—"}
                    </p>
                  </div>
                ) : null}

                {account.isArchived ? <Badge variant="outline">Archived</Badge> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete account?"
        description="This can't be undone. Accounts with existing transactions can't be deleted — archive them instead."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteAccount(deleteTarget.id);
          if (!result.success) toast.error(result.error);
          else toast.success("Account deleted");
        }}
      />
    </div>
  );
}
