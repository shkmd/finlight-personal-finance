"use server";

import { requireUserId } from "@/lib/session";
import { getDashboardSummaryCore } from "@/lib/core/dashboard";

export async function getDashboardSummary(target?: { year: number; month: number }) {
  const userId = await requireUserId();
  return getDashboardSummaryCore(userId, target);
}
