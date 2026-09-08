"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { investmentSchema, isTaxLinkedType, type InvestmentInput } from "@/lib/validations/investments";
import { createInvestment, updateInvestment } from "@/lib/actions/investments";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Investment } from "@prisma/client";

const INVESTMENT_TYPES = ["MUTUAL_FUND", "ELSS", "GOLD", "SILVER", "STOCKS", "NPS", "PPF", "RECURRING_DEPOSIT", "FIXED_DEPOSIT", "OTHER"];
const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function InvestmentFormDialog({ investment, trigger }: { investment?: Investment; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!investment;

  const form = useForm<InvestmentInput>({
    resolver: zodResolver(investmentSchema) as Resolver<InvestmentInput>,
    defaultValues: {
      name: investment?.name ?? "",
      provider: investment?.provider ?? "",
      investmentType: investment?.investmentType ?? "MUTUAL_FUND",
      category: investment?.category ?? "",
      frequency: investment?.frequency ?? "MONTHLY",
      contributionAmount: investment ? fromMinorUnits(investment.contributionAmountMinor) : 0,
      startDate: investment ? new Date(investment.startDate) : new Date(),
      nextContributionDate: investment ? new Date(investment.nextContributionDate) : new Date(),
      currentInvestedValue: investment?.currentInvestedValueMinor != null ? fromMinorUnits(investment.currentInvestedValueMinor) : undefined,
      currentMarketValue: investment?.currentMarketValueMinor != null ? fromMinorUnits(investment.currentMarketValueMinor) : undefined,
      isTaxLinked: investment?.isTaxLinked ?? false,
      lockInEndDate: investment?.lockInEndDate ? new Date(investment.lockInEndDate) : undefined,
      autoDebit: investment?.autoDebit ?? true,
      notes: investment?.notes ?? "",
    },
  });

  const watchType = form.watch("investmentType");

  async function onSubmit(values: InvestmentInput) {
    const result = isEdit ? await updateInvestment(investment!.id, values) : await createInvestment(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Investment updated" : "Investment added");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 size-4" /> Add Investment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit investment" : "Add investment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Index Fund SIP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="investmentType"
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
                        {INVESTMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ")}
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contributionAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribution amount</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                name="nextContributionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next contribution</FormLabel>
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
                name="currentInvestedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total invested so far</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentMarketValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current market value</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {(watchType === "ELSS" || watchType === "NPS" || watchType === "PPF") ? (
              <FormField
                control={form.control}
                name="lockInEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lock-in end date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? toDateInputValue(field.value) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="isTaxLinked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value || isTaxLinkedType(watchType)} onCheckedChange={field.onChange} disabled={isTaxLinkedType(watchType)} />
                    </FormControl>
                    <FormLabel className="mt-0!">Tax-linked</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoDebit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mt-0!">Auto-debit</FormLabel>
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
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add investment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
