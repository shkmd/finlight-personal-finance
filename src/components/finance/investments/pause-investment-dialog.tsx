"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PauseCircle } from "lucide-react";

import { pauseInvestmentSchema, type PauseInvestmentInput } from "@/lib/validations/investments";
import { pauseInvestment } from "@/lib/actions/investments";
import { monthlyEquivalentMinor, taxLinkedPauseWarning } from "@/lib/finance/sip";
import { formatCurrency } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Investment } from "@prisma/client";

const ALLOCATION_TARGETS = [
  { value: "NEXT_DEBT", label: "Next debt repayment" },
  { value: "EMERGENCY_FUND", label: "Emergency fund" },
  { value: "SIP_RESUME", label: "Another SIP" },
  { value: "NEW_INVESTMENT", label: "A new investment" },
  { value: "CASH_BUFFER", label: "Monthly cash buffer" },
  { value: "UNALLOCATED", label: "Leave unallocated" },
];

export function PauseInvestmentDialog({ investment }: { investment: Investment }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const releasedMinor = monthlyEquivalentMinor(investment.contributionAmountMinor, investment.frequency);

  const form = useForm<PauseInvestmentInput>({
    resolver: zodResolver(pauseInvestmentSchema) as Resolver<PauseInvestmentInput>,
    defaultValues: {
      pauseDate: new Date(),
      plannedResumeDate: null,
      allocationChoice: "UNALLOCATED",
      reason: "",
      confirmedTaxLinkedWarning: false,
    },
  });

  async function onSubmit(values: PauseInvestmentInput) {
    if (investment.isTaxLinked && !confirmed) {
      toast.error("Please confirm the tax-linked warning first.");
      return;
    }
    const result = await pauseInvestment(investment.id, { ...values, confirmedTaxLinkedWarning: confirmed });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Paused. ${formatCurrency(result.data.releasedMonthlyEquivalentMinor)}/month released.`);
    setOpen(false);
    form.reset();
    setConfirmed(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PauseCircle className="mr-1 size-4" /> Pause
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pause {investment.name}</DialogTitle>
          <DialogDescription>
            Pausing releases <strong>{formatCurrency(releasedMinor)}/month</strong> from your budget. History is preserved.
          </DialogDescription>
        </DialogHeader>

        {investment.isTaxLinked ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Tax-linked investment</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{taxLinkedPauseWarning()}</p>
              {investment.lockInEndDate ? <p>Lock-in end date on record: {new Date(investment.lockInEndDate).toLocaleDateString("en-IN")}</p> : null}
              <label className="flex items-center gap-2 pt-1 text-foreground">
                <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
                I understand and want to continue
              </label>
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pauseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pause date</FormLabel>
                  <FormControl>
                    <Input type="date" value={new Date(field.value).toISOString().slice(0, 10)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plannedResumeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned resume date (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allocationChoice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where should the released cash go?</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALLOCATION_TARGETS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || (investment.isTaxLinked && !confirmed)}>
                {form.formState.isSubmitting ? "Pausing…" : "Pause investment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
