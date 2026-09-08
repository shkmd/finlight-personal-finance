"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { DEFAULT_BUDGET_CATEGORIES, DEFAULT_PAYMENT_METHODS } from "@/lib/defaults";
import { ALERT_TYPES } from "@/lib/alerts/types";

export interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });

    await tx.userFinancialPreference.create({
      data: { userId: user.id },
    });

    await tx.budgetCategory.createMany({
      data: DEFAULT_BUDGET_CATEGORIES.map((c, index) => ({
        userId: user.id,
        name: c.name,
        group: c.group,
        color: c.color,
        sortOrder: index,
        isCustom: false,
      })),
    });

    await tx.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((name, index) => ({
        userId: user.id,
        name,
        isCustom: false,
        sortOrder: index,
      })),
    });

    await tx.alertPreference.createMany({
      data: ALERT_TYPES.map((a) => ({
        userId: user.id,
        alertType: a.type,
        thresholdValue: a.defaultThreshold ?? null,
      })),
    });
  });

  return { success: true };
}
