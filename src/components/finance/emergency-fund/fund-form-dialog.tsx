"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { emergencyFundSchema, type EmergencyFundInput } from "@/lib/validations/emergencyFund";
import { createEmergencyFund, updateEmergencyFund } from "@/lib/actions/emergencyFund";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmergencyFund, FinancialAccount } from "@prisma/client";

export function FundFormDialog({ fund, accounts, trigger }: { fund?: EmergencyFund; accounts: FinancialAccount[]; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!fund;

  const form = useForm<EmergencyFundInput>({
    resolver: zodResolver(emergencyFundSchema) as Resolver<EmergencyFundInput>,
    defaultValues: {
      name: fund?.name ?? "Emergency Fund",
      currentSavedAmount: fund ? fromMinorUnits(fund.currentSavedAmountMinor) : 0,
      currentMonthlyContribution: fund ? fromMinorUnits(fund.currentMonthlyContributionMinor) : 0,
      targetMethod: fund?.targetMethod ?? "SIX_MONTHS",
      fixedTargetAmount: fund?.fixedTargetAmountMinor != null ? fromMinorUnits(fund.fixedTargetAmountMinor) : undefined,
      targetMonths: fund?.targetMonths ?? undefined,
      targetDate: fund?.targetDate ? new Date(fund.targetDate) : undefined,
      accountId: fund?.accountId ?? accounts[0]?.id ?? null,
      notes: fund?.notes ?? "",
    },
  });

  const watchMethod = form.watch("targetMethod");

  async function onSubmit(values: EmergencyFundInput) {
    const result = isEdit ? await updateEmergencyFund(fund!.id, values) : await createEmergencyFund(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Fund updated" : "Fund created");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 size-4" /> New Emergency Fund
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit emergency fund" : "New emergency fund"}</DialogTitle>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit ? (
              <FormField
                control={form.control}
                name="currentSavedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current saved amount</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="currentMonthlyContribution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current monthly contribution</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="THREE_MONTHS">3 months of essential expenses</SelectItem>
                      <SelectItem value="SIX_MONTHS">6 months of essential expenses</SelectItem>
                      <SelectItem value="CUSTOM_MONTHS">Custom number of months</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchMethod === "CUSTOM_MONTHS" ? (
              <FormField
                control={form.control}
                name="targetMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of months</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            {watchMethod === "FIXED_AMOUNT" ? (
              <FormField
                control={form.control}
                name="fixedTargetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target amount</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Held in account</FormLabel>
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
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create fund"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
