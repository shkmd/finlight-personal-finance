"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { loanPaymentSchema, type LoanPaymentInput } from "@/lib/validations/loans";
import { recordLoanPayment } from "@/lib/actions/loans";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialAccount, Loan } from "@prisma/client";

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function RecordPaymentDialog({ loan, accounts }: { loan: Loan; accounts: FinancialAccount[] }) {
  const [open, setOpen] = useState(false);
  const defaultInterest = Math.round((loan.currentOutstandingPrincipalMinor * (loan.annualInterestRatePercent / 12 / 100)) / 100) * 100;

  const form = useForm<LoanPaymentInput>({
    resolver: zodResolver(loanPaymentSchema) as Resolver<LoanPaymentInput>,
    defaultValues: {
      paymentDate: new Date(),
      totalAmount: fromMinorUnits(loan.currentEmiMinor),
      principal: fromMinorUnits(loan.currentEmiMinor) - fromMinorUnits(defaultInterest),
      interest: fromMinorUnits(defaultInterest),
      fee: 0,
      extraAmount: 0,
      outstandingBalanceAfter: null,
      accountId: accounts[0]?.id ?? null,
      notes: "",
    },
  });

  async function onSubmit(values: LoanPaymentInput) {
    const result = await recordLoanPayment(loan.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Payment recorded");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CreditCard className="mr-1 size-4" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {loan.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment date</FormLabel>
                  <FormControl>
                    <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="extraAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extra repayment</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total amount paid</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="outstandingBalanceAfter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lender-reported balance after (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>If provided, this becomes the source of truth instead of the calculated balance.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid from account</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Optional" />
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
                {form.formState.isSubmitting ? "Saving…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
