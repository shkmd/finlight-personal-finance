"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { expenseSchema, expenseFilterSchema, type ExpenseInput, type ExpenseFilterInput } from "@/lib/validations/expenses";
import { toMinorUnits } from "@/lib/money";
import type { ExpenseStatus, Prisma } from "@prisma/client";

function expenseBalanceEffectMinor(status: ExpenseStatus, amountMinor: number, isRefund: boolean): number {
  if (isRefund) return status === "PAID" ? amountMinor : 0;
  return status === "PAID" ? -amountMinor : 0;
}

async function upsertTags(userId: string, expenseId: string, tagNames: string[]) {
  await prisma.transactionTagAssignment.deleteMany({ where: { expenseTransactionId: expenseId } });
  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;
    const tag = await prisma.transactionTag.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
    await prisma.transactionTagAssignment.create({
      data: { tagId: tag.id, expenseTransactionId: expenseId },
    });
  }
}

function validateSplits(totalAmountMinor: number, splits: { amount: number }[]): void {
  if (splits.length === 0) return;
  const splitTotalMinor = splits.reduce((sum, s) => sum + toMinorUnits(s.amount), 0);
  if (Math.abs(splitTotalMinor - totalAmountMinor) > 1) {
    throw new Error("Split amounts must add up to the total transaction amount.");
  }
}

export async function listExpenses(filters: ExpenseFilterInput = {}) {
  const userId = await requireUserId();
  const data = expenseFilterSchema.parse(filters);

  const where: Prisma.ExpenseTransactionWhereInput = { userId };
  if (data.from || data.to) {
    where.date = {};
    if (data.from) (where.date as Prisma.DateTimeFilter).gte = data.from;
    if (data.to) (where.date as Prisma.DateTimeFilter).lte = data.to;
  }
  if (data.categoryId) where.categoryId = data.categoryId;
  if (data.accountId) where.accountId = data.accountId;
  if (data.status) where.status = data.status;
  if (data.essentialType) where.essentialType = data.essentialType;
  if (data.recurringOnly) where.isRecurring = true;
  if (data.merchant) where.merchant = { contains: data.merchant };
  if (data.minAmount != null || data.maxAmount != null) {
    where.amountMinor = {};
    if (data.minAmount != null) (where.amountMinor as Prisma.IntFilter).gte = toMinorUnits(data.minAmount);
    if (data.maxAmount != null) (where.amountMinor as Prisma.IntFilter).lte = toMinorUnits(data.maxAmount);
  }
  if (data.search) {
    where.OR = [
      { name: { contains: data.search } },
      { merchant: { contains: data.search } },
      { description: { contains: data.search } },
    ];
  }

  return prisma.expenseTransaction.findMany({
    where,
    include: {
      category: true,
      account: true,
      paymentMethod: true,
      tags: { include: { tag: true } },
      splits: { include: { category: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function findPossibleDuplicateExpenses(params: {
  name: string;
  amount: number;
  accountId: string;
  date: Date;
}) {
  const userId = await requireUserId();
  const amountMinor = toMinorUnits(params.amount);
  const dayStart = new Date(params.date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 2);
  const dayBefore = new Date(dayStart);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

  return prisma.expenseTransaction.findMany({
    where: {
      userId,
      accountId: params.accountId,
      amountMinor,
      status: { not: "CANCELLED" },
      date: { gte: dayBefore, lt: dayEnd },
    },
    take: 5,
    orderBy: { date: "desc" },
  });
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = expenseSchema.parse(input);

    const account = await prisma.financialAccount.findUnique({ where: { id: data.accountId } });
    if (!account || account.userId !== userId) throw new Error("Account not found.");

    const amountMinor = toMinorUnits(data.amount);
    validateSplits(amountMinor, data.splits);
    const isRefund = !!data.refundOfExpenseId;

    if (data.refundOfExpenseId) {
      const original = await prisma.expenseTransaction.findUnique({ where: { id: data.refundOfExpenseId } });
      if (!original || original.userId !== userId) throw new Error("Original expense to refund was not found.");
    }

    const effect = expenseBalanceEffectMinor(data.status, amountMinor, isRefund);

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expenseTransaction.create({
        data: {
          userId,
          date: data.date,
          amountMinor,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId || null,
          accountId: data.accountId,
          paymentMethodId: data.paymentMethodId || null,
          merchant: data.merchant || null,
          isRecurring: data.isRecurring,
          essentialType: data.essentialType,
          linkedLoanId: data.linkedLoanId || null,
          linkedInvestmentId: data.linkedInvestmentId || null,
          reimbursable: data.reimbursable,
          refundOfExpenseId: data.refundOfExpenseId || null,
          status: data.status,
          notes: data.notes || null,
          splits: data.splits.length
            ? { create: data.splits.map((s) => ({ categoryId: s.categoryId, amountMinor: toMinorUnits(s.amount), notes: s.notes || null })) }
            : undefined,
        },
      });

      if (effect !== 0) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { increment: effect } },
        });
      }

      if (data.refundOfExpenseId) {
        await tx.expenseTransaction.update({
          where: { id: data.refundOfExpenseId },
          data: { status: "REFUNDED" },
        });
      }

      return created;
    });

    if (data.tagNames.length) {
      await upsertTags(userId, expense.id, data.tagNames);
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { id: expense.id };
  });
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.expenseTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Expense not found.");

    const data = expenseSchema.parse(input);
    const account = await prisma.financialAccount.findUnique({ where: { id: data.accountId } });
    if (!account || account.userId !== userId) throw new Error("Account not found.");

    const amountMinor = toMinorUnits(data.amount);
    validateSplits(amountMinor, data.splits);
    const isRefund = !!existing.refundOfExpenseId;

    const oldEffect = expenseBalanceEffectMinor(existing.status, existing.amountMinor, isRefund);
    const newEffect = expenseBalanceEffectMinor(data.status, amountMinor, isRefund);

    await prisma.$transaction(async (tx) => {
      if (oldEffect !== 0) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalanceMinor: { decrement: oldEffect } },
        });
      }
      if (newEffect !== 0) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { increment: newEffect } },
        });
      }

      await tx.expenseSplit.deleteMany({ where: { expenseTransactionId: id } });
      await tx.expenseTransaction.update({
        where: { id },
        data: {
          date: data.date,
          amountMinor,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId || null,
          accountId: data.accountId,
          paymentMethodId: data.paymentMethodId || null,
          merchant: data.merchant || null,
          isRecurring: data.isRecurring,
          essentialType: data.essentialType,
          linkedLoanId: data.linkedLoanId || null,
          linkedInvestmentId: data.linkedInvestmentId || null,
          reimbursable: data.reimbursable,
          status: data.status,
          notes: data.notes || null,
          splits: data.splits.length
            ? { create: data.splits.map((s) => ({ categoryId: s.categoryId, amountMinor: toMinorUnits(s.amount), notes: s.notes || null })) }
            : undefined,
        },
      });
    });

    await upsertTags(userId, id, data.tagNames);

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { id };
  });
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.expenseTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Expense not found.");

    const isRefund = !!existing.refundOfExpenseId;
    const effect = expenseBalanceEffectMinor(existing.status, existing.amountMinor, isRefund);

    await prisma.$transaction(async (tx) => {
      if (effect !== 0) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalanceMinor: { decrement: effect } },
        });
      }
      await tx.expenseTransaction.delete({ where: { id } });
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { id };
  });
}

export async function duplicateExpense(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.expenseTransaction.findUnique({ where: { id }, include: { splits: true, tags: { include: { tag: true } } } });
    if (!existing || existing.userId !== userId) throw new Error("Expense not found.");

    const effect = expenseBalanceEffectMinor(existing.status, existing.amountMinor, !!existing.refundOfExpenseId);

    const created = await prisma.$transaction(async (tx) => {
      const copy = await tx.expenseTransaction.create({
        data: {
          userId,
          date: new Date(),
          amountMinor: existing.amountMinor,
          name: existing.name,
          description: existing.description,
          categoryId: existing.categoryId,
          accountId: existing.accountId,
          paymentMethodId: existing.paymentMethodId,
          merchant: existing.merchant,
          isRecurring: false,
          essentialType: existing.essentialType,
          reimbursable: existing.reimbursable,
          status: existing.status,
          notes: existing.notes,
          splits: existing.splits.length
            ? { create: existing.splits.map((s) => ({ categoryId: s.categoryId, amountMinor: s.amountMinor, notes: s.notes })) }
            : undefined,
        },
      });
      if (effect !== 0) {
        await tx.financialAccount.update({ where: { id: existing.accountId }, data: { currentBalanceMinor: { increment: effect } } });
      }
      return copy;
    });

    if (existing.tags.length) {
      await upsertTags(userId, created.id, existing.tags.map((t) => t.tag.name));
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { id: created.id };
  });
}
