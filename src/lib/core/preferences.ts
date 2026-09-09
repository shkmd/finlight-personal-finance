import { prisma } from "@/lib/prisma";

/** Shared with the web action and the mobile route handler — see src/lib/core/accounts.ts for the split rationale. */
export async function getPreferenceCore(userId: string) {
  return prisma.userFinancialPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
