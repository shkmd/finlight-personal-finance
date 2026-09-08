"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { BudgetCategory, FinancialAccount, PaymentMethod, IncomeTransaction, ExpenseStatus, EssentialType } from "@prisma/client";

import { formatCurrency, formatCurrencyPrecise } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { listExpenses, deleteExpense, duplicateExpense } from "@/lib/actions/expenses";
import { deleteIncome } from "@/lib/actions/income";
import { listRecurringTransactions, setRecurringActive, deleteRecurringTransaction } from "@/lib/actions/recurring";
import { ExpenseFormDialog } from "@/components/finance/transactions/expense-form-dialog";
import { IncomeFormDialog } from "@/components/finance/transactions/income-form-dialog";
import { RecurringFormDialog } from "@/components/finance/transactions/recurring-form-dialog";
import { EmptyState } from "@/components/finance/empty-state";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { SampleDataBadge } from "@/components/finance/status-badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeftRight, Copy, MoreVertical, Receipt, Repeat, Search, Trash2 } from "lucide-react";

type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];
type RecurringRow = Awaited<ReturnType<typeof listRecurringTransactions>>[number];

const STATUS_VARIANT: Record<ExpenseStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  REFUNDED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function TransactionsClient({
  initialExpenses,
  initialIncome,
  initialRecurring,
  categories,
  accounts,
  paymentMethods,
}: {
  initialExpenses: ExpenseRow[];
  initialIncome: IncomeTransaction[];
  initialRecurring: RecurringRow[];
  categories: BudgetCategory[];
  accounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [income] = useState(initialIncome);
  const [recurring, setRecurring] = useState(initialRecurring);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [essentialFilter, setEssentialFilter] = useState<string>("all");
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<ExpenseRow | null>(null);
  const [deleteIncomeTarget, setDeleteIncomeTarget] = useState<IncomeTransaction | null>(null);

  function refetch(filters: Parameters<typeof listExpenses>[0]) {
    startTransition(async () => {
      const rows = await listExpenses(filters);
      setExpenses(rows);
    });
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (search && !`${e.name} ${e.merchant ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && e.categoryId !== categoryFilter) return false;
      if (essentialFilter !== "all" && e.essentialType !== (essentialFilter as EssentialType)) return false;
      return true;
    });
  }, [expenses, search, categoryFilter, essentialFilter]);

  return (
    <Tabs defaultValue="expenses">
      <TabsList>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
        <TabsTrigger value="income">Income</TabsTrigger>
        <TabsTrigger value="recurring">Recurring</TabsTrigger>
      </TabsList>

      <TabsContent value="expenses" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ExpenseFormDialog categories={categories} accounts={accounts} paymentMethods={paymentMethods} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search…" className="w-40 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={essentialFilter} onValueChange={setEssentialFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Essential & discretionary</SelectItem>
              <SelectItem value="ESSENTIAL">Essential</SelectItem>
              <SelectItem value="DISCRETIONARY">Discretionary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses found" description="Try changing filters, or add your first expense." />
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className={isPending ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{expense.name}</p>
                      <Badge className={`border-0 text-xs ${STATUS_VARIANT[expense.status]}`}>{expense.status}</Badge>
                      {expense.essentialType === "ESSENTIAL" ? (
                        <Badge variant="outline" className="text-xs">
                          Essential
                        </Badge>
                      ) : null}
                      {expense.isSampleData ? <SampleDataBadge /> : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateOnly(new Date(expense.date))} · {expense.category?.name ?? "Uncategorized"} · {expense.account.name}
                      {expense.merchant ? ` · ${expense.merchant}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums" title={formatCurrencyPrecise(expense.amountMinor)}>
                    {formatCurrency(expense.amountMinor)}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ExpenseFormDialog
                        categories={categories}
                        accounts={accounts}
                        paymentMethods={paymentMethods}
                        expense={expense}
                        trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>}
                      />
                      <DropdownMenuItem
                        onClick={() =>
                          startTransition(async () => {
                            const result = await duplicateExpense(expense.id);
                            if (!result.success) toast.error(result.error);
                            else {
                              toast.success("Duplicated");
                              refetch({});
                            }
                          })
                        }
                      >
                        <Copy className="mr-2 size-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteExpenseTarget(expense)}
                      >
                        <Trash2 className="mr-2 size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="income" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <IncomeFormDialog accounts={accounts} />
        </div>
        {income.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No income recorded" description="Add your salary or other income sources." />
        ) : (
          <div className="space-y-2">
            {income.map((inc) => (
              <Card key={inc.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{inc.sourceName}</p>
                      <Badge variant="outline" className="text-xs">
                        {inc.status.replace("_", " ")}
                      </Badge>
                      {inc.isSampleData ? <SampleDataBadge /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateOnly(new Date(inc.expectedDate))} · {inc.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(inc.actualAmountMinor ?? inc.plannedAmountMinor)}
                    </p>
                    {inc.actualAmountMinor == null ? <p className="text-xs text-muted-foreground">Planned</p> : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <IncomeFormDialog accounts={accounts} income={inc} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>} />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteIncomeTarget(inc)}>
                        <Trash2 className="mr-2 size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="recurring" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <RecurringFormDialog categories={categories} accounts={accounts} />
        </div>
        {recurring.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring transactions" description="Add rent, salary, subscriptions, EMIs, or SIPs that repeat on a schedule." />
        ) : (
          <div className="space-y-2">
            {recurring.map((r) => (
              <Card key={r.id} className={!r.isActive ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{r.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {r.type === "INCOME" ? "Income" : "Expense"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      Next: {formatDateOnly(new Date(r.nextOccurrenceDate))}
                      {r.category ? ` · ${r.category.name}` : ""}
                      {r.account ? ` · ${r.account.name}` : ""}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold tabular-nums ${r.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {formatCurrency(r.amountMinor)}
                  </p>
                  <Switch
                    checked={r.isActive}
                    onCheckedChange={(checked) =>
                      startTransition(async () => {
                        const result = await setRecurringActive(r.id, checked);
                        if (!result.success) toast.error(result.error);
                        else setRecurring((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: checked } : x)));
                      })
                    }
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteRecurringTransaction(r.id);
                        if (!result.success) toast.error(result.error);
                        else setRecurring((prev) => prev.filter((x) => x.id !== r.id));
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <ConfirmDialog
        open={!!deleteExpenseTarget}
        onOpenChange={(o) => !o && setDeleteExpenseTarget(null)}
        title="Delete expense?"
        description="This will remove the transaction and reverse its effect on the account balance."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteExpenseTarget) return;
          const result = await deleteExpense(deleteExpenseTarget.id);
          if (!result.success) toast.error(result.error);
          else {
            toast.success("Expense deleted");
            setExpenses((prev) => prev.filter((e) => e.id !== deleteExpenseTarget.id));
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteIncomeTarget}
        onOpenChange={(o) => !o && setDeleteIncomeTarget(null)}
        title="Delete income record?"
        description="This will remove the record and reverse its effect on the account balance."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteIncomeTarget) return;
          const result = await deleteIncome(deleteIncomeTarget.id);
          if (!result.success) toast.error(result.error);
          else toast.success("Income deleted");
        }}
      />
    </Tabs>
  );
}
