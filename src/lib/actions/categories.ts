"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { categorySchema, type CategoryInput } from "@/lib/validations/categories";

export async function listCategories(includeArchived = false) {
  const userId = await requireUserId();
  return prisma.budgetCategory.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listPaymentMethods(includeArchived = false) {
  const userId = await requireUserId();
  return prisma.paymentMethod.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = categorySchema.parse(input);

    const maxSort = await prisma.budgetCategory.aggregate({
      where: { userId, group: data.group },
      _max: { sortOrder: true },
    });

    const category = await prisma.budgetCategory.create({
      data: {
        userId,
        name: data.name,
        group: data.group,
        color: data.color,
        parentCategoryId: data.parentCategoryId || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        isCustom: true,
      },
    });
    revalidatePath("/budget");
    revalidatePath("/transactions");
    return { id: category.id };
  });
}

export async function archiveCategory(id: string, archived = true): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.budgetCategory.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Category not found.");

    await prisma.budgetCategory.update({ where: { id }, data: { isArchived: archived } });
    revalidatePath("/budget");
    return { id };
  });
}

export async function createPaymentMethod(name: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required.");

    const maxSort = await prisma.paymentMethod.aggregate({ where: { userId }, _max: { sortOrder: true } });
    const method = await prisma.paymentMethod.create({
      data: { userId, name: trimmed, isCustom: true, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
    });
    revalidatePath("/transactions");
    return { id: method.id };
  });
}
