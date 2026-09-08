"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { emergencyFundTransactionSchema, type EmergencyFundTransactionInput } from "@/lib/validations/emergencyFund";
import { recordEmergencyFundTransaction } from "@/lib/actions/emergencyFund";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialAccount } from "@prisma/client";

export function FundTransactionDialog({
  fundId,
  type,
  accounts,
}: {
  fundId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  accounts: FinancialAccount[];
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<EmergencyFundTransactionInput>({
    resolver: zodResolver(emergencyFundTransactionSchema) as Resolver<EmergencyFundTransactionInput>,
    defaultValues: { type, date: new Date(), amount: 0, reason: "", accountId: accounts[0]?.id ?? null, notes: "" },
  });

  async function onSubmit(values: EmergencyFundTransactionInput) {
    const result = await recordEmergencyFundTransaction(fundId, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(type === "DEPOSIT" ? "Deposit recorded" : "Withdrawal recorded");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={type === "DEPOSIT" ? "default" : "outline"}>
          {type === "DEPOSIT" ? <ArrowUpCircle className="mr-1 size-4" /> : <ArrowDownCircle className="mr-1 size-4" />}
          {type === "DEPOSIT" ? "Deposit" : "Withdraw"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{type === "DEPOSIT" ? "Deposit to fund" : "Withdraw from fund"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" value={new Date(field.value).toISOString().slice(0, 10)} onChange={(e) => field.onChange(new Date(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {type === "WITHDRAWAL" ? (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Medical emergency, job loss, etc." {...field} />
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
                  <FormLabel>{type === "DEPOSIT" ? "From account" : "To account"}</FormLabel>
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
                {form.formState.isSubmitting ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
