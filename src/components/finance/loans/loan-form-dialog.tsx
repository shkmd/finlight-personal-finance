"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { loanSchema, type LoanInput } from "@/lib/validations/loans";
import { createLoan, updateLoan } from "@/lib/actions/loans";
import { fromMinorUnits, formatCurrency, toMinorUnits } from "@/lib/money";
import { calculateEmiMinor, generateAmortizationSchedule } from "@/lib/finance/emi";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

  // Original principal, rate, and tenure are the loan's real terms — EMI is
  // a function of those, not an independent fact, so it is derived here with
  // the same reducing-balance formula lenders use rather than left for the
  // user to compute by hand.
  const [emiTouched, setEmiTouched] = useState(false);
  const [outstandingTouched, setOutstandingTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setEmiTouched(false);
      setOutstandingTouched(false);
    }
  }, [open]);

  // Inputs are plain HTML number fields, so react-hook-form's watched value
  // is the raw string the user is typing (coerced to a number only by zod at
  // submit time) — Number(...) here is required, not cosmetic.
  const watchPrincipal = Number(form.watch("originalPrincipal")) || 0;
  const watchRate = Number(form.watch("annualInterestRatePercent")) || 0;
  const watchTenure = Number(form.watch("originalTenureMonths")) || 0;

  const calculatedEmiMinor = calculateEmiMinor(toMinorUnits(watchPrincipal), watchRate, watchTenure);
  const totalPayableMinor = calculatedEmiMinor * watchTenure;
  const totalInterestMinor = Math.max(0, totalPayableMinor - toMinorUnits(watchPrincipal));

  const watchOutstanding = Number(form.watch("currentOutstandingPrincipal")) || 0;
  const watchCurrentEmi = Number(form.watch("currentEmi")) || 0;
  const watchRemainingTenure = Number(form.watch("remainingTenureMonths")) || 0;

  // Remaining tenure below original tenure means EMIs have already been
  // paid before this loan was entered — the outstanding balance for a new
  // loan should reflect that amortization, not sit at the full principal.
  const monthsElapsed = Math.max(0, watchTenure - watchRemainingTenure);
  const emiForElapsed = watchCurrentEmi > 0 ? watchCurrentEmi : fromMinorUnits(calculatedEmiMinor);
  const elapsedSchedule =
    monthsElapsed > 0 && watchPrincipal > 0 && emiForElapsed > 0
      ? generateAmortizationSchedule({
          principalMinor: toMinorUnits(watchPrincipal),
          annualRatePercent: watchRate,
          emiMinor: toMinorUnits(emiForElapsed),
          maxMonths: monthsElapsed,
        })
      : null;
  const impliedOutstandingMinor =
    monthsElapsed > 0 && elapsedSchedule && elapsedSchedule.rows.length > 0
      ? elapsedSchedule.rows[elapsedSchedule.rows.length - 1].closingBalanceMinor
      : toMinorUnits(watchPrincipal);

  // "Current outstanding" is deliberately principal-only — every other
  // calculation in the app (interest accrual, payoff simulations, the debt
  // gauge) depends on that. The total money still owed, principal plus the
  // interest yet to accrue, is a derived read-only figure computed from the
  // real remaining balance and the actual EMI on record (not the original
  // loan terms), simulated month by month so a final smaller payment is
  // accounted for correctly.
  const remainingSchedule =
    watchOutstanding > 0 && watchCurrentEmi > 0
      ? generateAmortizationSchedule({
          principalMinor: toMinorUnits(watchOutstanding),
          annualRatePercent: watchRate,
          emiMinor: toMinorUnits(watchCurrentEmi),
        })
      : null;
  const totalRemainingInclInterestMinor =
    remainingSchedule && !remainingSchedule.neverAmortizes
      ? remainingSchedule.totalPrincipalMinor + remainingSchedule.totalInterestMinor
      : null;

  // New loans have no real-world EMI recorded yet, so the calculated figure
  // fills the field automatically until the user types their own value —
  // once they do, their entry is authoritative (e.g. the lender rounds EMIs
  // to the nearest 100) and this stops overwriting it. Existing loans keep
  // whatever EMI is already on record; the summary below just offers the
  // calculated figure for comparison, applied only on request.
  useEffect(() => {
    if (isEdit || emiTouched || calculatedEmiMinor <= 0) return;
    form.setValue("currentEmi", fromMinorUnits(calculatedEmiMinor), { shouldValidate: true });
  }, [isEdit, emiTouched, calculatedEmiMinor, form]);

  function useCalculatedEmi() {
    form.setValue("currentEmi", fromMinorUnits(calculatedEmiMinor), { shouldValidate: true, shouldDirty: true });
    setEmiTouched(true);
  }

  // A brand-new loan with no elapsed tenure hasn't had a single payment yet,
  // so its outstanding balance is the principal itself; one entered with
  // remaining tenure already below the original tenure implies EMIs were
  // already paid before today, so the balance is amortized down from the
  // principal by that many months instead. Either way this only fills the
  // field in — the user's own entry always wins once they touch it.
  useEffect(() => {
    if (isEdit || outstandingTouched || watchPrincipal <= 0) return;
    form.setValue("currentOutstandingPrincipal", fromMinorUnits(impliedOutstandingMinor), { shouldValidate: true });
  }, [isEdit, outstandingTouched, impliedOutstandingMinor, watchPrincipal, form]);

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
                      <Input
                        type="number"
                        inputMode="decimal"
                        {...field}
                        onChange={(e) => {
                          setOutstandingTouched(true);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    {!isEdit ? (
                      <FormDescription>
                        {monthsElapsed > 0
                          ? `Estimated from principal, rate & EMI after ${monthsElapsed} elapsed month(s) — edit if the lender's figure differs.`
                          : "Defaults to the original principal for a new loan — edit if some has already been paid."}
                      </FormDescription>
                    ) : null}
                    {totalRemainingInclInterestMinor != null ? (
                      <FormDescription className="text-(--fl-green-dark)">
                        Total outstanding incl. interest: {formatCurrency(totalRemainingInclInterestMinor)}
                        {remainingSchedule ? ` over ${remainingSchedule.monthsToPayoff} more month(s)` : ""}
                      </FormDescription>
                    ) : remainingSchedule?.neverAmortizes ? (
                      <FormDescription className="text-(--fl-red)">
                        This EMI doesn&apos;t cover the monthly interest on the outstanding balance.
                      </FormDescription>
                    ) : null}
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
                      <Input
                        type="number"
                        inputMode="decimal"
                        {...field}
                        onChange={(e) => {
                          setEmiTouched(true);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    {!isEdit ? (
                      <FormDescription>Calculated automatically from principal, rate & tenure — edit to override.</FormDescription>
                    ) : null}
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
            {calculatedEmiMinor > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-(--fl-mint-soft) px-3.5 py-3 text-[12.5px]">
                <div className="space-y-0.5">
                  <div className="font-semibold text-(--fl-green-dark)">
                    Calculated EMI: {formatCurrency(calculatedEmiMinor)} / month
                  </div>
                  <div className="text-(--fl-muted)">
                    Total payable {formatCurrency(totalPayableMinor)} over {watchTenure} months · Total interest{" "}
                    {formatCurrency(totalInterestMinor)}
                  </div>
                </div>
                {isEdit ? (
                  <Button type="button" size="sm" variant="outline" onClick={useCalculatedEmi}>
                    Use calculated EMI
                  </Button>
                ) : null}
              </div>
            ) : null}
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
