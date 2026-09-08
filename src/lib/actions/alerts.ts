"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { ALERT_TYPES } from "@/lib/alerts/types";

export async function listAlertPreferences() {
  const userId = await requireUserId();
  const existing = await prisma.alertPreference.findMany({ where: { userId } });
  const byType = new Map(existing.map((p) => [p.alertType, p]));

  return ALERT_TYPES.map((def) => ({
    definition: def,
    preference:
      byType.get(def.type) ?? {
        id: "",
        userId,
        alertType: def.type,
        isEnabled: true,
        thresholdValue: def.defaultThreshold ?? null,
        snoozedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
  }));
}

export async function setAlertPreference(alertType: string, isEnabled: boolean, thresholdValue?: number | null): Promise<ActionResult<{ alertType: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await prisma.alertPreference.upsert({
      where: { userId_alertType: { userId, alertType } },
      update: { isEnabled, ...(thresholdValue !== undefined ? { thresholdValue } : {}) },
      create: { userId, alertType, isEnabled, thresholdValue: thresholdValue ?? null },
    });
    revalidatePath("/settings");
    return { alertType };
  });
}
