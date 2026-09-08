"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { preferenceSchema, type PreferenceInput } from "@/lib/validations/preferences";
import { updatePreference } from "@/lib/actions/preferences";
import { fromMinorUnits } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserFinancialPreference } from "@prisma/client";

export function PreferencesForm({ preference }: { preference: UserFinancialPreference }) {
  const form = useForm<PreferenceInput>({
    resolver: zodResolver(preferenceSchema) as Resolver<PreferenceInput>,
    defaultValues: {
      currency: preference.currency,
      locale: preference.locale,
      timezone: preference.timezone,
      defaultBudgetingMethod: preference.defaultBudgetingMethod,
      needsPercent: preference.needsPercent,
      wantsPercent: preference.wantsPercent,
      savingsDebtPercent: preference.savingsDebtPercent,
      safeCashBuffer: fromMinorUnits(preference.safeCashBufferMinor),
      creditUtilizationWarningPct: preference.creditUtilizationWarningPct,
      emiBurdenWarningPct: preference.emiBurdenWarningPct,
    },
  });

  async function onSubmit(values: PreferenceInput) {
    const result = await updatePreference(values);
    if (!result.success) toast.error(result.error);
    else toast.success("Preferences saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultBudgetingMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default budgeting method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ZERO_BASED">Zero-based</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage-based</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="safeCashBuffer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Safe cash buffer</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditUtilizationWarningPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Credit utilization warning %</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emiBurdenWarningPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">EMI burden warning %</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save preferences"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
