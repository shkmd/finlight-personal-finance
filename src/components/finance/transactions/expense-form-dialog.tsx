"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { expenseSchema, type ExpenseInput } from "@/lib/validations/expenses";
import { createExpense, updateExpense, findPossibleDuplicateExpenses } from "@/lib/actions/expenses";
import { fromMinorUnits, formatCurrency } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { BudgetCategory, FinancialAccount, PaymentMethod, ExpenseTransaction } from "@prisma/client";

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function ExpenseFormDialog({
  categories,
  accounts,
  paymentMethods,
  expense,
  trigger,
}: {
  categories: BudgetCategory[];
  accounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  expense?: ExpenseTransaction & { splits?: { categoryId: string; amountMinor: number; notes: string | null }[]; tags?: { tag: { name: string } }[] };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showSplits, setShowSplits] = useState(!!expense?.splits?.length);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const isEdit = !!expense;

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseInput>,
    defaultValues: {
      date: expense ? new Date(expense.date) : new Date(),
      amount: expense ? fromMinorUnits(expense.amountMinor) : 0,
      name: expense?.name ?? "",
      description: expense?.description ?? "",
      categoryId: expense?.categoryId ?? null,
      accountId: expense?.accountId ?? accounts[0]?.id ?? "",
      paymentMethodId: expense?.paymentMethodId ?? null,
      merchant: expense?.merchant ?? "",
      isRecurring: expense?.isRecurring ?? false,
      essentialType: expense?.essentialType ?? "DISCRETIONARY",
      reimbursable: expense?.reimbursable ?? false,
      status: expense?.status ?? "PAID",
      notes: expense?.notes ?? "",
      tagNames: expense?.tags?.map((t) => t.tag.name) ?? [],
      splits: expense?.splits?.map((s) => ({ categoryId: s.categoryId, amount: fromMinorUnits(s.amountMinor), notes: s.notes ?? "" })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "splits" });

  useEffect(() => {
    if (!open) return;
    setDuplicateWarning(null);
  }, [open]);

  async function checkDuplicate(values: ExpenseInput) {
    if (isEdit) return false;
    const duplicates = await findPossibleDuplicateExpenses({ name: values.name, amount: values.amount, accountId: values.accountId, date: values.date });
    if (duplicates.length) {
      setDuplicateWarning(`A similar transaction "${duplicates[0].name}" for ${formatCurrency(duplicates[0].amountMinor)} was recorded around this date.`);
      return true;
    }
    return false;
  }

  async function onSubmit(values: ExpenseInput) {
    if (!isEdit && duplicateWarning === null) {
      const foundDuplicate = await checkDuplicate(values);
      if (foundDuplicate) return; // show warning, require a second submit to proceed
    }

    const payload = { ...values, splits: showSplits ? values.splits : [] };
    const result = isEdit ? await updateExpense(expense!.id, payload) : await createExpense(payload);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Expense updated" : "Expense added");
    setOpen(false);
    setDuplicateWarning(null);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button className="rounded-full bg-(--fl-green) hover:bg-(--fl-green-dark)">
            <Plus className="mr-1 size-4" /> Add expense
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="inset-y-4 right-4 flex h-auto w-[min(410px,calc(100%-32px))] flex-col gap-0 overflow-hidden rounded-3xl border-0 shadow-[0_24px_60px_rgba(15,21,18,0.28)] sm:max-w-none">
        <SheetHeader className="p-[22px_22px_16px]">
          <SheetTitle className="text-[21px] font-extrabold tracking-tight">{isEdit ? "Edit expense" : "Add expense"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5.5">
            {duplicateWarning ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Possible duplicate</AlertTitle>
                <AlertDescription>{duplicateWarning} Submit again to save it anyway.</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Grocery run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant / payee</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!showSplits ? (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Split across categories</FormLabel>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ categoryId: "", amount: 0, notes: "" })}>
                    <Plus className="mr-1 size-3.5" /> Add split
                  </Button>
                </div>
                {fields.map((f, index) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Select value={form.watch(`splits.${index}.categoryId`)} onValueChange={(v) => form.setValue(`splits.${index}.categoryId`, v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="w-28"
                      value={form.watch(`splits.${index}.amount`)}
                      onChange={(e) => form.setValue(`splits.${index}.amount`, Number(e.target.value))}
                    />
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <FormDescription>Split amounts must add up to the total amount above.</FormDescription>
              </div>
            )}
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setShowSplits((s) => !s)}
            >
              {showSplits ? "Use a single category instead" : "Split across multiple categories"}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="essentialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Essential or discretionary</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ESSENTIAL">Essential</SelectItem>
                        <SelectItem value="DISCRETIONARY">Discretionary</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mt-0!">Recurring</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reimbursable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mt-0!">Reimbursable</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tagNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="comma, separated, tags"
                      value={field.value?.join(", ") ?? ""}
                      onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2.5 border-t border-(--fl-line) p-[16px_22px_20px]">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex-1 rounded-full bg-(--fl-green) hover:bg-(--fl-green-dark)"
            >
              {form.formState.isSubmitting ? "Saving…" : duplicateWarning ? "Save anyway" : isEdit ? "Save changes" : "Add expense"}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
