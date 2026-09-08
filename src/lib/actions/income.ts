"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { incomeSchema, type IncomeInput } from "@/lib/validations/income";
import { toMinorUnits } from "@/lib/money";
import type { IncomeStatus } from "@prisma/client";

function appliedAmountMinor(status: IncomeStatus, actualAmountMinor: number | null): number {
  if (status === "RECEIVED" || status === "PARTIALLY_RECEIVED") return actualAmountMinor ?? 0;
  return 0;
}

export async function listIncome(params?: { year?: number; month?: number }) {
  const userId = await requireUserId();
  const where: Record<string, unknown> = { userId, isArchived: false };
  if (params?.year != null && params?.month != null) {
    const start = new Date(Date.UTC(params.year, params.month - 1, 1));
    const end = new Date(Date.UTC(params.year, params.month, 1));
    where.expectedDate = { gte: start, lt: end };
  }
  return prisma.incomeTransaction.findMany({
    where,
    include: { account: true },
    orderBy: { expectedDate: "desc" },
  });
}

export async function createIncome(input: IncomeInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = incomeSchema.parse(input);

    if (data.accountId) {
      const account = await prisma.financialAccount.findUnique({ where: { id: data.accountId } });
      if (!account || account.userId !== userId) throw new Error("Account not found.");
    }

    const plannedMinor = toMinorUnits(data.plannedAmount);
    const actualMinor = data.actualAmount != null ? toMinorUnits(data.actualAmount) : null;
    const applied = appliedAmountMinor(data.status, actualMinor);

    const income = await prisma.$transaction(async (tx) => {
      const created = await tx.incomeTransaction.create({
        data: {
          userId,
          sourceName: data.sourceName,
          category: data.category,
          plannedAmountMinor: plannedMinor,
          actualAmountMinor: actualMinor,
          expectedDate: data.expectedDate,
          receivedDate: data.receivedDate || null,
          accountId: data.accountId || null,
          isRecurring: data.isRecurring,
          status: data.status,
          notes: data.notes || null,
        },
      });

      if (applied > 0 && data.accountId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { increment: applied } },
        });
      }
      return created;
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { id: income.id };
  });
}

export async function updateIncome(id: string, input: IncomeInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.incomeTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Income record not found.");

    const data = incomeSchema.parse(input);
    if (data.accountId) {
      const account = await prisma.financialAccount.findUnique({ where: { id: data.accountId } });
      if (!account || account.userId !== userId) throw new Error("Account not found.");
    }

    const plannedMinor = toMinorUnits(data.plannedAmount);
    const actualMinor = data.actualAmount != null ? toMinorUnits(data.actualAmount) : null;
    const newApplied = appliedAmountMinor(data.status, actualMinor);
    const oldApplied = appliedAmountMinor(existing.status, existing.actualAmountMinor);

    await prisma.$transaction(async (tx) => {
      if (oldApplied > 0 && existing.accountId) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalanceMinor: { decrement: oldApplied } },
        });
      }
      if (newApplied > 0 && data.accountId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { increment: newApplied } },
        });
      }

      await tx.incomeTransaction.update({
        where: { id },
        data: {
          sourceName: data.sourceName,
          category: data.category,
          plannedAmountMinor: plannedMinor,
          actualAmountMinor: actualMinor,
          expectedDate: data.expectedDate,
          receivedDate: data.receivedDate || null,
          accountId: data.accountId || null,
          isRecurring: data.isRecurring,
          status: data.status,
          notes: data.notes || null,
        },
      });
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { id };
  });
}

export async function deleteIncome(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.incomeTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Income record not found.");

    const applied = appliedAmountMinor(existing.status, existing.actualAmountMinor);

    await prisma.$transaction(async (tx) => {
      if (applied > 0 && existing.accountId) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalanceMinor: { decrement: applied } },
        });
      }
      await tx.incomeTransaction.delete({ where: { id } });
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { id };
  });
}
