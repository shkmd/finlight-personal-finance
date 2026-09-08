"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import {
  investmentSchema,
  pauseInvestmentSchema,
  contributionSchema,
  isTaxLinkedType,
  type InvestmentInput,
  type PauseInvestmentInput,
  type ContributionInput,
} from "@/lib/validations/investments";
import { toMinorUnits } from "@/lib/money";
import { monthlyEquivalentMinor } from "@/lib/finance/sip";

export async function listInvestments(includeInactive = true) {
  const userId = await requireUserId();
  return prisma.investment.findMany({
    where: { userId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

export async function createInvestment(input: InvestmentInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = investmentSchema.parse(input);

    const investment = await prisma.investment.create({
      data: {
        userId,
        name: data.name,
        provider: data.provider || null,
        investmentType: data.investmentType,
        category: data.category || null,
        frequency: data.frequency,
        contributionAmountMinor: toMinorUnits(data.contributionAmount),
        startDate: data.startDate,
        nextContributionDate: data.nextContributionDate,
        currentInvestedValueMinor: data.currentInvestedValue != null ? toMinorUnits(data.currentInvestedValue) : null,
        currentMarketValueMinor: data.currentMarketValue != null ? toMinorUnits(data.currentMarketValue) : null,
        isTaxLinked: data.isTaxLinked || isTaxLinkedType(data.investmentType),
        lockInEndDate: data.lockInEndDate ?? null,
        autoDebit: data.autoDebit,
        notes: data.notes || null,
      },
    });
    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { id: investment.id };
  });
}

export async function updateInvestment(id: string, input: InvestmentInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.investment.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Investment not found.");

    const data = investmentSchema.parse(input);
    await prisma.investment.update({
      where: { id },
      data: {
        name: data.name,
        provider: data.provider || null,
        investmentType: data.investmentType,
        category: data.category || null,
        frequency: data.frequency,
        contributionAmountMinor: toMinorUnits(data.contributionAmount),
        startDate: data.startDate,
        nextContributionDate: data.nextContributionDate,
        currentInvestedValueMinor: data.currentInvestedValue != null ? toMinorUnits(data.currentInvestedValue) : null,
        currentMarketValueMinor: data.currentMarketValue != null ? toMinorUnits(data.currentMarketValue) : null,
        isTaxLinked: data.isTaxLinked || isTaxLinkedType(data.investmentType),
        lockInEndDate: data.lockInEndDate ?? null,
        autoDebit: data.autoDebit,
        notes: data.notes || null,
      },
    });
    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function recordContribution(investmentId: string, input: ContributionInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const investment = await prisma.investment.findUnique({ where: { id: investmentId } });
    if (!investment || investment.userId !== userId) throw new Error("Investment not found.");

    const data = contributionSchema.parse(input);
    const amountMinor = toMinorUnits(data.amount);

    const contribution = await prisma.$transaction(async (tx) => {
      const created = await tx.investmentContribution.create({
        data: {
          investmentId,
          userId,
          date: data.date,
          amountMinor,
          accountId: data.accountId || null,
          notes: data.notes || null,
        },
      });

      await tx.investment.update({
        where: { id: investmentId },
        data: { currentInvestedValueMinor: { increment: amountMinor } },
      });

      if (data.accountId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { decrement: amountMinor } },
        });
      }
      return created;
    });

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { id: contribution.id };
  });
}

export async function pauseInvestment(id: string, input: PauseInvestmentInput): Promise<ActionResult<{ id: string; releasedMonthlyEquivalentMinor: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment || investment.userId !== userId) throw new Error("Investment not found.");
    if (!investment.isActive) throw new Error("This investment is already paused.");

    const data = pauseInvestmentSchema.parse(input);
    if (investment.isTaxLinked && !data.confirmedTaxLinkedWarning) {
      throw new Error("Please confirm you've read the tax-linked lock-in warning before pausing.");
    }

    const releasedMonthlyEquivalentMinor = monthlyEquivalentMinor(investment.contributionAmountMinor, investment.frequency);

    await prisma.$transaction(async (tx) => {
      await tx.investment.update({
        where: { id },
        data: { isActive: false, pauseDate: data.pauseDate, plannedResumeDate: data.plannedResumeDate ?? null },
      });

      await tx.investmentStatusHistory.create({
        data: {
          investmentId: id,
          status: "PAUSED",
          date: data.pauseDate,
          reason: data.reason || null,
          releasedMonthlyEquivalentMinor,
          allocationChoice: data.allocationChoice,
        },
      });

      if (data.allocationChoice !== "UNALLOCATED") {
        await tx.cashAllocationRule.create({
          data: {
            userId,
            triggerType: "SIP_PAUSE",
            investmentId: id,
            targetType: data.allocationChoice,
            amountMinor: releasedMonthlyEquivalentMinor,
            effectiveDate: data.pauseDate,
          },
        });
      }
    });

    revalidatePath("/investments");
    revalidatePath("/debt-planner");
    revalidatePath("/dashboard");
    return { id, releasedMonthlyEquivalentMinor };
  });
}

export async function resumeInvestment(id: string, resumeDate: Date): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment || investment.userId !== userId) throw new Error("Investment not found.");
    if (investment.isActive) throw new Error("This investment is not paused.");

    await prisma.$transaction(async (tx) => {
      await tx.investment.update({
        where: { id },
        data: { isActive: true, pauseDate: null, plannedResumeDate: null },
      });
      await tx.investmentStatusHistory.create({
        data: { investmentId: id, status: "RESUMED", date: resumeDate },
      });
      await tx.cashAllocationRule.deleteMany({ where: { investmentId: id, triggerType: "SIP_PAUSE" } });
    });

    revalidatePath("/investments");
    revalidatePath("/debt-planner");
    revalidatePath("/dashboard");
    return { id };
  });
}

/** Cash currently redirected from paused SIPs toward debt — used to prefill (never auto-apply) the debt planner. */
export async function getReleasedSipForDebtMinor(): Promise<number> {
  const userId = await requireUserId();
  const rules = await prisma.cashAllocationRule.findMany({
    where: { userId, triggerType: "SIP_PAUSE", targetType: "NEXT_DEBT" },
  });
  return rules.reduce((sum, r) => sum + (r.amountMinor ?? 0), 0);
}
