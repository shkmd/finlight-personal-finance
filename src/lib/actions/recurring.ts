"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { recurringTransactionSchema, type RecurringTransactionInput } from "@/lib/validations/recurring";
import { toMinorUnits } from "@/lib/money";

export async function listRecurringTransactions() {
  const userId = await requireUserId();
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: [{ isActive: "desc" }, { nextOccurrenceDate: "asc" }],
  });
}

export async function createRecurringTransaction(input: RecurringTransactionInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = recurringTransactionSchema.parse(input);
    const amountMinor = toMinorUnits(data.amount);

    const duplicate = await prisma.recurringTransaction.findFirst({
      where: { userId, isActive: true, type: data.type, name: data.name, amountMinor, frequency: data.frequency },
    });
    if (duplicate) {
      throw new Error("An identical active recurring transaction already exists.");
    }

    const created = await prisma.recurringTransaction.create({
      data: {
        userId,
        type: data.type,
        name: data.name,
        amountMinor,
        categoryId: data.categoryId || null,
        accountId: data.accountId || null,
        frequency: data.frequency,
        customIntervalDays: data.customIntervalDays ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        nextOccurrenceDate: data.nextOccurrenceDate,
        autoGenerate: data.autoGenerate,
        requireConfirmation: data.requireConfirmation,
        notes: data.notes || null,
      },
    });

    revalidatePath("/transactions");
    revalidatePath("/budget");
    revalidatePath("/calendar");
    return { id: created.id };
  });
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Recurring transaction not found.");

    await prisma.recurringTransaction.update({ where: { id }, data: { isActive } });
    revalidatePath("/transactions");
    revalidatePath("/budget");
    revalidatePath("/calendar");
    return { id };
  });
}

export async function deleteRecurringTransaction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Recurring transaction not found.");

    await prisma.recurringTransaction.delete({ where: { id } });
    revalidatePath("/transactions");
    revalidatePath("/budget");
    revalidatePath("/calendar");
    return { id };
  });
}
