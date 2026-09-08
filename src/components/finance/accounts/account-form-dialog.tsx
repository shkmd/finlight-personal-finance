"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { accountSchema, type AccountInput } from "@/lib/validations/accounts";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/components/finance/account-type-labels";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import type { FinancialAccount } from "@prisma/client";

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as Array<keyof typeof ACCOUNT_TYPE_LABELS>;

export function AccountFormDialog({ account, trigger }: { account?: FinancialAccount; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!account;

  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema) as Resolver<AccountInput>,
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "BANK",
      institution: account?.institution ?? "",
      openingBalance: account ? fromMinorUnits(account.openingBalanceMinor) : 0,
      currency: account?.currency ?? "INR",
      creditLimit: account?.creditLimitMinor != null ? fromMinorUnits(account.creditLimitMinor) : undefined,
      statementDay: account?.statementDay ?? undefined,
      billingDay: account?.billingDay ?? undefined,
      paymentDueDay: account?.paymentDueDay ?? undefined,
      notes: account?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset(form.getValues());
  }, [open, form]);

  const watchType = form.watch("type");

  async function onSubmit(values: AccountInput) {
    const result = isEdit ? await updateAccount(account!.id, values) : await createAccount(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Account updated" : "Account created");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 size-4" /> Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "Add account"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="HDFC Savings" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ACCOUNT_TYPE_LABELS[type]}
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
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank / institution</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? "Opening balance" : "Opening balance"}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchType === "CREDIT_CARD" ? (
              <>
                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit limit</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="statementDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statement day</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={31} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentDueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment due day</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={31} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : null}
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
