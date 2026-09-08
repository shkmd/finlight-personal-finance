"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { BudgetCategory, FinancialAccount, PaymentMethod, IncomeTransaction } from "@prisma/client";

import { formatCurrency } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { listExpenses, deleteExpense, duplicateExpense } from "@/lib/actions/expenses";
import { deleteIncome } from "@/lib/actions/income";
import { listRecurringTransactions, setRecurringActive, deleteRecurringTransaction } from "@/lib/actions/recurring";
import { ExpenseFormDialog } from "@/components/finance/transactions/expense-form-dialog";
import { IncomeFormDialog } from "@/components/finance/transactions/income-form-dialog";
import { RecurringFormDialog } from "@/components/finance/transactions/recurring-form-dialog";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { PageHeader } from "@/components/finance/page-header";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoreVertical, Repeat, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];
type RecurringRow = Awaited<ReturnType<typeof listRecurringTransactions>>[number];

interface UnifiedRow {
  id: string;
  date: Date;
  desc: string;
  catName: string;
  method: string;
  amountMinor: number;
  isIncome: boolean;
  raw: ExpenseRow | IncomeTransaction;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TransactionsClient({
  initialExpenses,
  initialIncome,
  initialRecurring,
  categories,
  accounts,
  paymentMethods,
  initialQuery,
  initialCategoryName,
  year,
  month,
}: {
  initialExpenses: ExpenseRow[];
  initialIncome: IncomeTransaction[];
  initialRecurring: RecurringRow[];
  categories: BudgetCategory[];
  accounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  initialQuery: string;
  initialCategoryName: string | null;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [income] = useState(initialIncome);
  const [recurring, setRecurring] = useState(initialRecurring);
  const [, startTransition] = useTransition();

  const [type, setType] = useState<"All types" | "Expense" | "Income">("All types");
  const [categoryFilter, setCategoryFilter] = useState(() =>
    initialCategoryName && categories.some((c) => c.name === initialCategoryName) ? initialCategoryName : "All categories"
  );
  const [scope, setScope] = useState<"month" | "all">("month");
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<ExpenseRow | null>(null);
  const [deleteIncomeTarget, setDeleteIncomeTarget] = useState<IncomeTransaction | null>(null);

  const rows: UnifiedRow[] = useMemo(() => {
    const expenseRows: UnifiedRow[] = expenses
      .filter((e) => e.status !== "CANCELLED")
      .map((e) => ({
        id: e.id,
        date: new Date(e.date),
        desc: e.name,
        catName: e.category?.name ?? "Uncategorized",
        method: e.paymentMethod?.name ?? e.account.name,
        amountMinor: e.amountMinor,
        isIncome: false,
        raw: e,
      }));
    const incomeRows: UnifiedRow[] = income.map((i) => ({
      id: i.id,
      date: new Date(i.receivedDate ?? i.expectedDate),
      desc: i.sourceName,
      catName: i.category,
      method: "Income",
      amountMinor: i.actualAmountMinor ?? i.plannedAmountMinor,
      isIncome: true,
      raw: i,
    }));
    return [...expenseRows, ...incomeRows].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses, income]);

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const query = initialQuery.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (scope === "month" && (r.date < monthStart || r.date >= monthEnd)) return false;
    if (type === "Expense" && r.isIncome) return false;
    if (type === "Income" && !r.isIncome) return false;
    if (categoryFilter !== "All categories" && r.catName !== categoryFilter) return false;
    if (query && !`${r.desc} ${r.catName} ${r.method}`.toLowerCase().includes(query)) return false;
    return true;
  });

  const moneyIn = filtered.filter((r) => r.isIncome).reduce((s, r) => s + r.amountMinor, 0);
  const moneyOut = filtered.filter((r) => !r.isIncome).reduce((s, r) => s + r.amountMinor, 0);
  const categoryNames = ["All categories", ...new Set(rows.map((r) => r.catName))].sort();

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every credit and debit, filterable down to a single category."
        actions={
          <>
            <ExpenseFormDialog categories={categories} accounts={accounts} paymentMethods={paymentMethods} />
            <IncomeFormDialog accounts={accounts} trigger={<Button variant="outline">Add income</Button>} />
          </>
        }
      />

      <Tabs defaultValue="transactions">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="recurring">
            <Repeat className="mr-1 size-3.5" /> Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded-full border-[1.5px] border-(--fl-line) bg-(--fl-card) px-4 py-2.75 text-[12.5px] font-bold"
            >
              <option>All types</option>
              <option>Expense</option>
              <option>Income</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-full border-[1.5px] border-(--fl-line) bg-(--fl-card) px-4 py-2.75 text-[12.5px] font-bold"
            >
              {categoryNames.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-1 rounded-full bg-(--fl-fill) p-1">
              <button
                onClick={() => setScope("month")}
                className="rounded-full px-3.5 py-2 text-xs font-bold"
                style={{ background: scope === "month" ? "var(--fl-green)" : "transparent", color: scope === "month" ? "#fff" : "var(--fl-ink)" }}
              >
                {MONTH_NAMES[month - 1].slice(0, 3)} {year}
              </button>
              <button
                onClick={() => setScope("all")}
                className="rounded-full px-3.5 py-2 text-xs font-bold"
                style={{ background: scope === "all" ? "var(--fl-green)" : "transparent", color: scope === "all" ? "#fff" : "var(--fl-ink)" }}
              >
                All months
              </button>
            </div>
            <span className="text-xs font-semibold text-(--fl-muted)">Search from the bar above</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-[18px_20px]">
              <div className="text-[12.5px] font-bold text-(--fl-muted)">Matching transactions</div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{filtered.length}</div>
            </div>
            <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-[18px_20px]">
              <div className="text-[12.5px] font-bold text-(--fl-muted)">Money in</div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-(--fl-green-dark) tabular-nums">{formatCurrency(moneyIn)}</div>
            </div>
            <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-[18px_20px]">
              <div className="text-[12.5px] font-bold text-(--fl-muted)">Money out</div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-(--fl-red) tabular-nums">{formatCurrency(moneyOut)}</div>
            </div>
          </div>

          <div className="rounded-[20px] border border-(--fl-line) bg-(--fl-card) p-[8px_20px_14px]">
            {filtered.length === 0 ? (
              <p className="p-5.5 text-[13px] font-medium text-(--fl-muted)">No transactions match these filters.</p>
            ) : (
              <div className="flex flex-col">
                {filtered.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-(--fl-line) py-3 last:border-0">
                    <div
                      className="grid size-[34px] shrink-0 place-items-center rounded-xl text-sm font-extrabold"
                      style={{
                        background: r.isIncome ? "var(--fl-mint-soft)" : "var(--fl-red-soft)",
                        color: r.isIncome ? "var(--fl-green-dark)" : "var(--fl-red)",
                      }}
                    >
                      {r.isIncome ? "+" : "−"}
                    </div>
                    <div className="min-w-[180px] flex-[2_1_180px]">
                      <div className="truncate text-[13.5px] font-bold">{r.desc}</div>
                      <div className="text-xs font-medium text-(--fl-muted)">
                        {formatDateOnly(r.date)} · {r.method}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-(--fl-fill) px-2.75 py-1.25 text-[11.5px] font-bold text-(--fl-muted)">
                      {r.catName}
                    </span>
                    <div
                      className="min-w-[96px] flex-none text-right text-sm font-extrabold tabular-nums"
                      style={{ color: r.isIncome ? "var(--fl-green-dark)" : "var(--fl-ink)" }}
                    >
                      {r.isIncome ? "+" : "−"}
                      {formatCurrency(r.amountMinor)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {r.isIncome ? (
                          <>
                            <IncomeFormDialog
                              accounts={accounts}
                              income={r.raw as IncomeTransaction}
                              trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>}
                            />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteIncomeTarget(r.raw as IncomeTransaction)}>
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <ExpenseFormDialog
                              categories={categories}
                              accounts={accounts}
                              paymentMethods={paymentMethods}
                              expense={r.raw as ExpenseRow}
                              trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>}
                            />
                            <DropdownMenuItem
                              onClick={() =>
                                startTransition(async () => {
                                  const result = await duplicateExpense(r.id);
                                  if (!result.success) toast.error(result.error);
                                  else {
                                    toast.success("Duplicated");
                                    const refreshed = await listExpenses({});
                                    setExpenses(refreshed);
                                  }
                                })
                              }
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteExpenseTarget(r.raw as ExpenseRow)}>
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <RecurringFormDialog categories={categories} accounts={accounts} />
          {recurring.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-(--fl-line) p-8 text-center text-sm text-(--fl-muted)">
              No recurring transactions. Add rent, salary, subscriptions, EMIs, or SIPs that repeat on a schedule.
            </p>
          ) : (
            <div className="space-y-2">
              {recurring.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-[20px] border border-(--fl-line) bg-(--fl-card) px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{r.name}</p>
                    <p className="truncate text-xs font-medium text-(--fl-muted)">
                      Next: {formatDateOnly(new Date(r.nextOccurrenceDate))} · {r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-extrabold tabular-nums ${r.type === "INCOME" ? "text-(--fl-green-dark)" : ""}`}>
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
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            router.refresh();
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
          else {
            toast.success("Income deleted");
            router.refresh();
          }
        }}
      />
    </div>
  );
}
