"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { loanSchema, type LoanInput } from "@/lib/validations/loans";
import { createLoan, updateLoan } from "@/lib/actions/loans";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Loan } from "@prisma/client";

const LOAN_TYPES = ["PERSONAL", "CREDIT_CARD", "VEHICLE", "HOME", "GOLD", "CONSUMER", "EDUCATION", "BUSINESS", "OTHER"];

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function LoanFormDialog({ loan, trigger }: { loan?: Loan; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!loan;

  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema) as Resolver<LoanInput>,
    defaultValues: {
      name: loan?.name ?? "",
      lender: loan?.lender ?? "",
      loanType: loan?.loanType ?? "PERSONAL",
      originalPrincipal: loan ? fromMinorUnits(loan.originalPrincipalMinor) : 0,
      currentOutstandingPrincipal: loan ? fromMinorUnits(loan.currentOutstandingPrincipalMinor) : 0,
      annualInterestRatePercent: loan?.annualInterestRatePercent ?? 10,
      rateType: loan?.rateType ?? "FIXED",
      currentEmi: loan ? fromMinorUnits(loan.currentEmiMinor) : 0,
      originalTenureMonths: loan?.originalTenureMonths ?? 12,
      remainingTenureMonths: loan?.remainingTenureMonths ?? 12,
      startDate: loan ? new Date(loan.startDate) : new Date(),
      nextPaymentDate: loan ? new Date(loan.nextPaymentDate) : new Date(),
      emiPaymentDay: loan?.emiPaymentDay ?? undefined,
      prepaymentChargePercent: loan?.prepaymentChargePercent ?? undefined,
      foreclosureChargePercent: loan?.foreclosureChargePercent ?? undefined,
      notes: loan?.notes ?? "",
      status: loan?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: LoanInput) {
    const result = isEdit ? await updateLoan(loan!.id, values) : await createLoan(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Loan updated" : "Loan added");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 size-4" /> Add Loan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit loan" : "Add loan"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan name</FormLabel>
                    <FormControl>
                      <Input placeholder="Home Loan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lender</FormLabel>
                    <FormControl>
                      <Input placeholder="HDFC Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="loanType"
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
                        {LOAN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
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
                name="rateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="FLOATING">Floating</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="originalPrincipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original principal</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentOutstandingPrincipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current outstanding</FormLabel>
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
                name="annualInterestRatePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual interest rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentEmi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current EMI</FormLabel>
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
                name="originalTenureMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original tenure (months)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remainingTenureMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remaining tenure (months)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextPaymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next payment date</FormLabel>
                    <FormControl>
                      <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="prepaymentChargePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prepayment charge (%)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="foreclosureChargePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foreclosure charge (%)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add loan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
