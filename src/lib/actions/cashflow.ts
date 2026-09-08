"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { addFrequency, isOnOrBefore } from "@/lib/dates";

export type CashFlowEventType = "INCOME" | "EMI" | "SIP" | "BILL" | "CREDIT_CARD_DUE";

export interface CashFlowEvent {
  type: CashFlowEventType;
  date: Date;
  label: string;
  amountMinor: number; // signed: positive = inflow, negative = outflow, 0 = informational only
}

const LIQUID_ACCOUNT_TYPES = ["BANK", "CASH", "WALLET"] as const;

export async function getCashFlowForecast(days = 60) {
  const userId = await requireUserId();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + days);

  const [accounts, income, loans, investments, recurring, preference] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, isArchived: false } }),
    prisma.incomeTransaction.findMany({
      where: { userId, status: { in: ["EXPECTED", "DELAYED"] }, expectedDate: { gte: today, lte: windowEnd } },
    }),
    prisma.loan.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.investment.findMany({ where: { userId, isActive: true } }),
    prisma.recurringTransaction.findMany({ where: { userId, isActive: true, type: "EXPENSE" } }),
    prisma.userFinancialPreference.findUnique({ where: { userId } }),
  ]);

  const startingBalanceMinor = accounts
    .filter((a) => (LIQUID_ACCOUNT_TYPES as readonly string[]).includes(a.type))
    .reduce((s, a) => s + a.currentBalanceMinor, 0);

  const events: CashFlowEvent[] = [];

  for (const inc of income) {
    events.push({ type: "INCOME", date: new Date(inc.expectedDate), label: inc.sourceName, amountMinor: inc.plannedAmountMinor });
  }

  for (const loan of loans) {
    let date = new Date(loan.nextPaymentDate);
    while (isOnOrBefore(date, windowEnd)) {
      if (isOnOrBefore(today, date)) {
        events.push({ type: "EMI", date: new Date(date), label: `${loan.name} EMI`, amountMinor: -loan.currentEmiMinor });
      }
      date = addFrequency(date, "MONTHLY");
    }
  }

  for (const inv of investments) {
    let date = new Date(inv.nextContributionDate);
    while (isOnOrBefore(date, windowEnd)) {
      if (isOnOrBefore(today, date)) {
        events.push({ type: "SIP", date: new Date(date), label: inv.name, amountMinor: -inv.contributionAmountMinor });
      }
      date = addFrequency(date, inv.frequency);
    }
  }

  for (const r of recurring) {
    let date = new Date(r.nextOccurrenceDate);
    while (isOnOrBefore(date, windowEnd)) {
      if (isOnOrBefore(today, date)) {
        events.push({ type: "BILL", date: new Date(date), label: r.name, amountMinor: -r.amountMinor });
      }
      date = addFrequency(date, r.frequency, r.customIntervalDays);
    }
  }

  for (const account of accounts) {
    if (account.type !== "CREDIT_CARD" || !account.paymentDueDay) continue;
    const due = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), account.paymentDueDay));
    if (due < today) due.setUTCMonth(due.getUTCMonth() + 1);
    if (isOnOrBefore(due, windowEnd)) {
      events.push({ type: "CREDIT_CARD_DUE", date: due, label: `${account.name} bill due`, amountMinor: 0 });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const safeBufferMinor = preference?.safeCashBufferMinor ?? 0;
  let runningBalance = startingBalanceMinor;
  const timeline: Array<{ date: Date; balanceMinor: number; events: CashFlowEvent[] }> = [];
  const byDate = new Map<string, CashFlowEvent[]>();
  for (const e of events) {
    const key = e.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(e);
  }
  const sortedDays = [...byDate.keys()].sort();
  for (const day of sortedDays) {
    const dayEvents = byDate.get(day)!;
    runningBalance += dayEvents.reduce((s, e) => s + e.amountMinor, 0);
    timeline.push({ date: new Date(day), balanceMinor: runningBalance, events: dayEvents });
  }

  const warnings: string[] = [];
  for (const day of timeline) {
    if (day.balanceMinor < safeBufferMinor) {
      warnings.push(`Projected balance may fall below your safe limit around ${day.date.toLocaleDateString("en-IN")}.`);
      break;
    }
  }
  for (const day of timeline) {
    const debits = day.events.filter((e) => e.amountMinor < 0);
    if (debits.length >= 2) {
      warnings.push(`Multiple auto-debits are scheduled close together on ${day.date.toLocaleDateString("en-IN")}.`);
    }
  }

  return { startingBalanceMinor, safeBufferMinor, timeline, warnings };
}
