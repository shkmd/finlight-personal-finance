import { prisma } from "@/lib/prisma";

/**
 * Shared with the web Server Action (src/lib/actions/accounts.ts) and the
 * mobile route handler (src/app/api/mobile/v1/accounts/route.ts) — takes
 * userId explicitly instead of resolving it internally, since the two
 * callers authenticate differently (session cookie vs. bearer token).
 */
export async function listAccountsCore(userId: string, includeArchived = false) {
  return prisma.financialAccount.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
  });
}
