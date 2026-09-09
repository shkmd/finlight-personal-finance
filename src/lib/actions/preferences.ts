"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { preferenceSchema, type PreferenceInput } from "@/lib/validations/preferences";
import { toMinorUnits } from "@/lib/money";
import { getPreferenceCore } from "@/lib/core/preferences";

export async function getPreference() {
  const userId = await requireUserId();
  return getPreferenceCore(userId);
}

export async function updatePreference(input: PreferenceInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = preferenceSchema.parse(input);

    const pref = await prisma.userFinancialPreference.upsert({
      where: { userId },
      update: {
        currency: data.currency,
        locale: data.locale,
        timezone: data.timezone,
        defaultBudgetingMethod: data.defaultBudgetingMethod,
        needsPercent: data.needsPercent,
        wantsPercent: data.wantsPercent,
        savingsDebtPercent: data.savingsDebtPercent,
        safeCashBufferMinor: toMinorUnits(data.safeCashBuffer),
        creditUtilizationWarningPct: data.creditUtilizationWarningPct,
        emiBurdenWarningPct: data.emiBurdenWarningPct,
      },
      create: {
        userId,
        currency: data.currency,
        locale: data.locale,
        timezone: data.timezone,
        defaultBudgetingMethod: data.defaultBudgetingMethod,
        needsPercent: data.needsPercent,
        wantsPercent: data.wantsPercent,
        savingsDebtPercent: data.savingsDebtPercent,
        safeCashBufferMinor: toMinorUnits(data.safeCashBuffer),
        creditUtilizationWarningPct: data.creditUtilizationWarningPct,
        emiBurdenWarningPct: data.emiBurdenWarningPct,
      },
    });

    revalidatePath("/settings");
    return { id: pref.id };
  });
}
