"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { accountSchema, transferSchema, type AccountInput, type TransferInput } from "@/lib/validations/accounts";
import { toMinorUnits } from "@/lib/money";
import { listAccountsCore } from "@/lib/core/accounts";

export async function listAccounts(includeArchived = false) {
  const userId = await requireUserId();
  return listAccountsCore(userId, includeArchived);
}

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = accountSchema.parse(input);
    const openingMinor = toMinorUnits(data.openingBalance);

    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        institution: data.institution || null,
        openingBalanceMinor: openingMinor,
        currentBalanceMinor: openingMinor,
        currency: data.currency,
        creditLimitMinor: data.creditLimit != null ? toMinorUnits(data.creditLimit) : null,
        statementDay: data.statementDay ?? null,
        billingDay: data.billingDay ?? null,
        paymentDueDay: data.paymentDueDay ?? null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id: account.id };
  });
}

export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.financialAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Account not found.");

    const data = accountSchema.parse(input);
    // Adjust current balance by the same delta as the opening-balance edit,
    // so correcting a typo doesn't wipe out transactions recorded since.
    const openingDeltaMinor = toMinorUnits(data.openingBalance) - existing.openingBalanceMinor;

    await prisma.financialAccount.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        institution: data.institution || null,
        openingBalanceMinor: toMinorUnits(data.openingBalance),
        currentBalanceMinor: existing.currentBalanceMinor + openingDeltaMinor,
        currency: data.currency,
        creditLimitMinor: data.creditLimit != null ? toMinorUnits(data.creditLimit) : null,
        statementDay: data.statementDay ?? null,
        billingDay: data.billingDay ?? null,
        paymentDueDay: data.paymentDueDay ?? null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function archiveAccount(id: string, archived = true): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.financialAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Account not found.");

    await prisma.financialAccount.update({ where: { id }, data: { isArchived: archived } });
    revalidatePath("/accounts");
    return { id };
  });
}

export async function deleteAccount(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.financialAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Account not found.");

    const usageCount = await prisma.expenseTransaction.count({ where: { accountId: id } });
    if (usageCount > 0) {
      throw new Error("This account has transactions linked to it — archive it instead of deleting.");
    }

    await prisma.financialAccount.delete({ where: { id } });
    revalidatePath("/accounts");
    return { id };
  });
}

export async function createTransfer(input: TransferInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = transferSchema.parse(input);

    const [fromAccount, toAccount] = await Promise.all([
      prisma.financialAccount.findUnique({ where: { id: data.fromAccountId } }),
      prisma.financialAccount.findUnique({ where: { id: data.toAccountId } }),
    ]);
    if (!fromAccount || fromAccount.userId !== userId) throw new Error("Source account not found.");
    if (!toAccount || toAccount.userId !== userId) throw new Error("Destination account not found.");

    const amountMinor = toMinorUnits(data.amount);
    const feeMinor = toMinorUnits(data.fee);

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.accountTransfer.create({
        data: {
          userId,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amountMinor,
          feeMinor,
          date: data.date,
          notes: data.notes || null,
        },
      });

      // A transfer moves cash between the user's own accounts — it is never
      // counted as income or an expense. Only an explicit fee is a real cost.
      await tx.financialAccount.update({
        where: { id: data.fromAccountId },
        data: { currentBalanceMinor: { decrement: amountMinor + feeMinor } },
      });
      await tx.financialAccount.update({
        where: { id: data.toAccountId },
        data: { currentBalanceMinor: { increment: amountMinor } },
      });

      return created;
    });

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id: transfer.id };
  });
}

export async function listTransfers() {
  const userId = await requireUserId();
  return prisma.accountTransfer.findMany({
    where: { userId },
    include: { fromAccount: true, toAccount: true },
    orderBy: { date: "desc" },
  });
}
