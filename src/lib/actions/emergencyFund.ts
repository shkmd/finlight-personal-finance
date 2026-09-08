"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import {
  emergencyFundSchema,
  emergencyFundTransactionSchema,
  type EmergencyFundInput,
  type EmergencyFundTransactionInput,
} from "@/lib/validations/emergencyFund";
import { toMinorUnits } from "@/lib/money";
import { ESSENTIAL_CATEGORY_NAMES } from "@/lib/defaults";

/** Average monthly essential spend over the last (up to) 3 complete months. */
export async function getAvgMonthlyEssentialExpensesMinor(): Promise<number> {
  const userId = await requireUserId();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const expenses = await prisma.expenseTransaction.findMany({
    where: { userId, status: "PAID", date: { gte: start, lt: end } },
    include: { category: true },
  });
  const essential = expenses.filter((e) => e.category && ESSENTIAL_CATEGORY_NAMES.has(e.category.name));
  if (essential.length === 0) return 0;
  return essential.reduce((s, e) => s + e.amountMinor, 0) / 3;
}

export async function listEmergencyFunds() {
  const userId = await requireUserId();
  return prisma.emergencyFund.findMany({
    where: { userId },
    include: { transactions: { orderBy: { date: "desc" }, take: 20 } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createEmergencyFund(input: EmergencyFundInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = emergencyFundSchema.parse(input);

    const fund = await prisma.emergencyFund.create({
      data: {
        userId,
        name: data.name,
        currentSavedAmountMinor: toMinorUnits(data.currentSavedAmount),
        currentMonthlyContributionMinor: toMinorUnits(data.currentMonthlyContribution),
        targetMethod: data.targetMethod,
        fixedTargetAmountMinor: data.fixedTargetAmount != null ? toMinorUnits(data.fixedTargetAmount) : null,
        targetMonths: data.targetMonths ?? null,
        targetDate: data.targetDate ?? null,
        accountId: data.accountId || null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/emergency-fund");
    revalidatePath("/dashboard");
    return { id: fund.id };
  });
}

export async function updateEmergencyFund(id: string, input: EmergencyFundInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.emergencyFund.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Emergency fund not found.");

    const data = emergencyFundSchema.parse(input);
    await prisma.emergencyFund.update({
      where: { id },
      data: {
        name: data.name,
        currentMonthlyContributionMinor: toMinorUnits(data.currentMonthlyContribution),
        targetMethod: data.targetMethod,
        fixedTargetAmountMinor: data.fixedTargetAmount != null ? toMinorUnits(data.fixedTargetAmount) : null,
        targetMonths: data.targetMonths ?? null,
        targetDate: data.targetDate ?? null,
        accountId: data.accountId || null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/emergency-fund");
    return { id };
  });
}

export async function recordEmergencyFundTransaction(
  emergencyFundId: string,
  input: EmergencyFundTransactionInput
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const fund = await prisma.emergencyFund.findUnique({ where: { id: emergencyFundId } });
    if (!fund || fund.userId !== userId) throw new Error("Emergency fund not found.");

    const data = emergencyFundTransactionSchema.parse(input);
    const amountMinor = toMinorUnits(data.amount);

    if (data.type === "WITHDRAWAL" && amountMinor > fund.currentSavedAmountMinor) {
      throw new Error("Withdrawal amount exceeds the fund's current saved balance.");
    }

    if (data.linkedExpenseId) {
      const expense = await prisma.expenseTransaction.findUnique({ where: { id: data.linkedExpenseId } });
      if (!expense || expense.userId !== userId) throw new Error("Linked expense not found.");
    }

    const delta = data.type === "DEPOSIT" ? amountMinor : -amountMinor;

    const created = await prisma.$transaction(async (tx) => {
      const txn = await tx.emergencyFundTransaction.create({
        data: {
          emergencyFundId,
          userId,
          type: data.type,
          date: data.date,
          amountMinor,
          reason: data.reason || null,
          linkedExpenseId: data.linkedExpenseId || null,
          accountId: data.accountId || null,
          notes: data.notes || null,
        },
      });

      await tx.emergencyFund.update({
        where: { id: emergencyFundId },
        data: { currentSavedAmountMinor: { increment: delta } },
      });

      // A withdrawal moves money out of the fund into an account; the
      // linked expense (if any) is the actual spend — this transfer itself
      // must not also count as income or a second expense.
      if (data.accountId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { increment: delta } },
        });
      }

      return txn;
    });

    revalidatePath("/emergency-fund");
    revalidatePath("/dashboard");
    return { id: created.id };
  });
}
