"use client";

import Link from "next/link";
import type { BudgetCategory, FinancialAccount, PaymentMethod } from "@prisma/client";

import { ExpenseFormDialog } from "@/components/finance/transactions/expense-form-dialog";
import { IncomeFormDialog } from "@/components/finance/transactions/income-form-dialog";
import { LoanFormDialog } from "@/components/finance/loans/loan-form-dialog";
import { InvestmentFormDialog } from "@/components/finance/investments/investment-form-dialog";
import { TransferDialog } from "@/components/finance/accounts/transfer-dialog";

import { Button } from "@/components/ui/button";
import { Wallet, Target } from "lucide-react";

export function QuickActions({
  categories,
  accounts,
  paymentMethods,
}: {
  categories: BudgetCategory[];
  accounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ExpenseFormDialog categories={categories} accounts={accounts} paymentMethods={paymentMethods} trigger={<Button size="sm">Add Expense</Button>} />
      <IncomeFormDialog accounts={accounts} trigger={<Button size="sm" variant="outline">Add Income</Button>} />
      <LoanFormDialog trigger={<Button size="sm" variant="outline">Add Loan</Button>} />
      <InvestmentFormDialog trigger={<Button size="sm" variant="outline">Add Investment</Button>} />
      {accounts.length >= 2 ? <TransferDialog accounts={accounts} /> : null}
      <Link href="/budget">
        <Button size="sm" variant="outline">
          <Wallet className="mr-1.5 size-4" /> Create Budget
        </Button>
      </Link>
      <Link href="/debt-planner">
        <Button size="sm" variant="outline">
          <Target className="mr-1.5 size-4" /> Run Debt Scenario
        </Button>
      </Link>
    </div>
  );
}
