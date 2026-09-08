"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { createBudgetMonthSchema, type CreateBudgetMonthInput } from "@/lib/validations/budget";
import { createBudgetMonth } from "@/lib/actions/budget";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { BudgetTemplate } from "@prisma/client";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CreateBudgetDialog({
  year,
  month,
  hasPreviousMonth,
  templates,
}: {
  year: number;
  month: number;
  hasPreviousMonth: boolean;
  templates: BudgetTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<CreateBudgetMonthInput>({
    resolver: zodResolver(createBudgetMonthSchema) as Resolver<CreateBudgetMonthInput>,
    defaultValues: {
      year,
      month,
      budgetingMethod: "ZERO_BASED",
      needsPercent: 50,
      wantsPercent: 30,
      savingsDebtPercent: 20,
      copyFromPreviousMonth: false,
      templateId: null,
      autoIncludeEmis: true,
      autoIncludeSips: true,
      autoIncludeRecurringBills: true,
    },
  });

  const watchMethod = form.watch("budgetingMethod");

  async function onSubmit(values: CreateBudgetMonthInput) {
    const result = await createBudgetMonth(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Budget created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 size-4" /> Create budget for {MONTH_NAMES[month - 1]} {year}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Create budget — {MONTH_NAMES[month - 1]} {year}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="budgetingMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budgeting method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ZERO_BASED">Zero-based (every rupee assigned a job)</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage-based (needs/wants/savings)</SelectItem>
                      <SelectItem value="CUSTOM">Custom limits</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchMethod === "PERCENTAGE" ? (
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="needsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Needs %</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wantsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Wants %</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="savingsDebtPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Savings %</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {hasPreviousMonth ? (
              <FormField
                control={form.control}
                name="copyFromPreviousMonth"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <FormLabel className="mt-0!">Copy previous month&apos;s allocations</FormLabel>
                      <FormDescription>Start from last month&apos;s budget instead of a blank one.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : null}

            {templates.length > 0 ? (
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Or start from a template</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Automatically include</p>
              <FormField
                control={form.control}
                name="autoIncludeEmis"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <FormLabel className="mt-0! text-sm font-normal">Active loan EMIs</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoIncludeSips"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <FormLabel className="mt-0! text-sm font-normal">Active SIPs (paused ones excluded)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoIncludeRecurringBills"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <FormLabel className="mt-0! text-sm font-normal">Recurring bills</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
