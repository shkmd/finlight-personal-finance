"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { payoffScenarioInputSchema, type PayoffScenarioFormInput } from "@/lib/validations/payoff";
import { toMinorUnits } from "@/lib/money";
import {
  comparePayoffPlans,
  simulateMinimumPaymentsBaseline,
  simulatePayoffPlan,
  type PayoffComparison,
  type PayoffLoanInput,
} from "@/lib/finance/payoff";

async function loadScenarioLoans(userId: string, loanIds: string[]): Promise<PayoffLoanInput[]> {
  const loans = await prisma.loan.findMany({ where: { id: { in: loanIds }, userId } });
  if (loans.length !== loanIds.length) throw new Error("One or more selected loans were not found.");

  return loans.map((l) => ({
    loanId: l.id,
    name: l.name,
    balanceMinor: l.currentOutstandingPrincipalMinor,
    annualRatePercent: l.annualInterestRatePercent,
    emiMinor: l.currentEmiMinor,
    prepaymentChargePercent: l.prepaymentChargePercent,
    foreclosureChargePercent: l.foreclosureChargePercent,
  }));
}

export interface PayoffRunResult {
  comparison: PayoffComparison;
  loanNames: Record<string, string>;
}

export async function runPayoffScenario(input: PayoffScenarioFormInput): Promise<ActionResult<PayoffRunResult>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = payoffScenarioInputSchema.parse(input);
    const loans = await loadScenarioLoans(userId, data.loanIds);

    const baseline = simulateMinimumPaymentsBaseline(loans, data.planStartMonth);
    const accelerated = simulatePayoffPlan({
      loans,
      strategy: data.strategy,
      customOrder: data.customOrder,
      extraMonthlyAmountMinor: toMinorUnits(data.extraMonthlyAmount) + toMinorUnits(data.includeReleasedSip),
      annualIncreasePercent: data.annualIncreasePercent ?? 0,
      lumpSumAmountMinor: data.lumpSumAmount ? toMinorUnits(data.lumpSumAmount) : undefined,
      lumpSumMonthIndex: data.lumpSumMonthIndex ?? undefined,
      planStartMonth: data.planStartMonth,
    });

    const comparison = comparePayoffPlans(baseline, accelerated);
    const loanNames = Object.fromEntries(loans.map((l) => [l.loanId, l.name]));

    return { comparison, loanNames };
  });
}

export async function savePayoffScenario(input: PayoffScenarioFormInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = payoffScenarioInputSchema.parse(input);
    const loans = await loadScenarioLoans(userId, data.loanIds);

    const extraMinor = toMinorUnits(data.extraMonthlyAmount) + toMinorUnits(data.includeReleasedSip);
    const accelerated = simulatePayoffPlan({
      loans,
      strategy: data.strategy,
      customOrder: data.customOrder,
      extraMonthlyAmountMinor: extraMinor,
      annualIncreasePercent: data.annualIncreasePercent ?? 0,
      lumpSumAmountMinor: data.lumpSumAmount ? toMinorUnits(data.lumpSumAmount) : undefined,
      lumpSumMonthIndex: data.lumpSumMonthIndex ?? undefined,
      planStartMonth: data.planStartMonth,
    });
    const baseline = simulateMinimumPaymentsBaseline(loans, data.planStartMonth);
    const comparison = comparePayoffPlans(baseline, accelerated);

    const scenario = await prisma.$transaction(async (tx) => {
      const created = await tx.payoffScenario.create({
        data: {
          userId,
          name: data.name,
          strategy: data.strategy,
          extraMonthlyAmountMinor: toMinorUnits(data.extraMonthlyAmount),
          includeReleasedSipMinor: toMinorUnits(data.includeReleasedSip),
          lumpSumAmountMinor: data.lumpSumAmount ? toMinorUnits(data.lumpSumAmount) : null,
          lumpSumMonthIndex: data.lumpSumMonthIndex ?? null,
          annualIncreasePercent: data.annualIncreasePercent ?? null,
          planStartMonth: data.planStartMonth,
          minCashBufferMinor: toMinorUnits(data.minCashBuffer),
          resultsSummaryJson: JSON.stringify({
            monthsSaved: comparison.monthsSaved,
            interestSavedMinor: comparison.interestSavedMinor,
            netInterestSavedMinor: comparison.netInterestSavedMinor,
            baselineMonths: comparison.baseline.totalMonths,
            acceleratedMonths: comparison.accelerated.totalMonths,
            baselineDebtFreeDate: comparison.baseline.debtFreeDate,
            acceleratedDebtFreeDate: comparison.accelerated.debtFreeDate,
            payoffOrder: comparison.accelerated.payoffOrder,
          }),
        },
      });

      await tx.payoffScenarioLoan.createMany({
        data: data.loanIds.map((loanId, index) => ({
          scenarioId: created.id,
          loanId,
          priorityOrder: data.customOrder ? data.customOrder.indexOf(loanId) : index,
        })),
      });

      if (accelerated.schedule.length) {
        await tx.payoffScheduleEntry.createMany({
          data: accelerated.schedule.map((row) => ({
            scenarioId: created.id,
            loanId: row.loanId,
            monthIndex: row.monthIndex,
            date: row.date,
            openingBalanceMinor: row.openingBalanceMinor,
            interestMinor: row.interestMinor,
            principalMinor: row.regularPrincipalMinor,
            extraPaymentMinor: row.extraPaymentMinor,
            closingBalanceMinor: row.closingBalanceMinor,
            isClosed: row.isClosed,
          })),
        });
      }

      return created;
    });

    revalidatePath("/debt-planner");
    return { id: scenario.id };
  });
}

export async function listPayoffScenarios() {
  const userId = await requireUserId();
  const scenarios = await prisma.payoffScenario.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { scenarioLoans: { include: { loan: true } } },
  });
  return scenarios.map((s) => ({
    ...s,
    summary: s.resultsSummaryJson ? JSON.parse(s.resultsSummaryJson) : null,
  }));
}

export async function getPayoffScenario(id: string) {
  const userId = await requireUserId();
  const scenario = await prisma.payoffScenario.findUnique({
    where: { id },
    include: {
      scenarioLoans: { include: { loan: true } },
      scheduleEntries: { orderBy: [{ monthIndex: "asc" }] },
    },
  });
  if (!scenario || scenario.userId !== userId) throw new Error("Scenario not found.");
  return {
    ...scenario,
    summary: scenario.resultsSummaryJson ? JSON.parse(scenario.resultsSummaryJson) : null,
  };
}

export async function deletePayoffScenario(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.payoffScenario.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Scenario not found.");
    await prisma.payoffScenario.delete({ where: { id } });
    revalidatePath("/debt-planner");
    return { id };
  });
}
