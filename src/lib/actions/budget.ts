"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import {
  createBudgetMonthSchema,
  budgetAllocationSchema,
  type CreateBudgetMonthInput,
  type BudgetAllocationInput,
} from "@/lib/validations/budget";
import { toMinorUnits } from "@/lib/money";
import { monthlyEquivalentMinor } from "@/lib/finance/sip";
import {
  categoryBudgetStatus,
  spendingPace,
  unallocatedCashMinor,
  projectedMonthEndBalanceMinor,
  actualMonthEndBalanceMinor,
  budgetAdherenceScorePercent,
  type CategoryBudgetStatus,
} from "@/lib/finance/budget";
import { daysInMonth } from "@/lib/dates";

const INVESTMENT_TYPE_TO_CATEGORY: Record<string, string> = {
  MUTUAL_FUND: "Mutual Fund SIP",
  ELSS: "ELSS",
  GOLD: "Gold",
  SILVER: "Silver",
  STOCKS: "Stocks",
  NPS: "NPS",
  PPF: "PPF",
  RECURRING_DEPOSIT: "Recurring Deposit",
  FIXED_DEPOSIT: "Other Savings",
  OTHER: "Other Savings",
};

export async function getBudgetMonth(year: number, month: number) {
  const userId = await requireUserId();
  return prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: { allocations: { include: { category: true } } },
  });
}

export async function listBudgetMonths() {
  const userId = await requireUserId();
  return prisma.budgetMonth.findMany({ where: { userId }, orderBy: [{ year: "desc" }, { month: "desc" }] });
}

export async function listBudgetTemplates() {
  const userId = await requireUserId();
  return prisma.budgetTemplate.findMany({ where: { userId }, include: { allocations: true } });
}

export async function createBudgetMonth(input: CreateBudgetMonthInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = createBudgetMonthSchema.parse(input);

    const existing = await prisma.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year: data.year, month: data.month } },
    });
    if (existing) throw new Error("A budget already exists for this month.");

    const allocationMap = new Map<string, { plannedAmountMinor: number; notes?: string }>();

    if (data.copyFromPreviousMonth) {
      const prevMonth = data.month === 1 ? 12 : data.month - 1;
      const prevYear = data.month === 1 ? data.year - 1 : data.year;
      const previous = await prisma.budgetMonth.findUnique({
        where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
        include: { allocations: true },
      });
      for (const a of previous?.allocations ?? []) {
        allocationMap.set(a.categoryId, { plannedAmountMinor: a.plannedAmountMinor, notes: a.notes ?? undefined });
      }
    } else if (data.templateId) {
      const template = await prisma.budgetTemplate.findUnique({
        where: { id: data.templateId },
        include: { allocations: true },
      });
      if (!template || template.userId !== userId) throw new Error("Template not found.");
      for (const a of template.allocations) {
        allocationMap.set(a.categoryId, { plannedAmountMinor: a.plannedAmountMinor, notes: a.notes ?? undefined });
      }
    }

    const categories = await prisma.budgetCategory.findMany({ where: { userId, isArchived: false } });
    const categoryByName = new Map(categories.map((c) => [c.name, c]));

    if (data.autoIncludeEmis) {
      const loans = await prisma.loan.findMany({ where: { userId, status: "ACTIVE" } });
      const emiCategory = categoryByName.get("Loan EMI");
      if (emiCategory && loans.length) {
        const totalEmi = loans.reduce((sum, l) => sum + l.currentEmiMinor, 0);
        allocationMap.set(emiCategory.id, { plannedAmountMinor: totalEmi, notes: "Auto-included: active loan EMIs" });
      }
    }

    if (data.autoIncludeSips) {
      const investments = await prisma.investment.findMany({ where: { userId, isActive: true } });
      const totals = new Map<string, number>();
      for (const inv of investments) {
        const categoryName = INVESTMENT_TYPE_TO_CATEGORY[inv.investmentType] ?? "Other Savings";
        const category = categoryByName.get(categoryName);
        if (!category) continue;
        const monthly = monthlyEquivalentMinor(inv.contributionAmountMinor, inv.frequency);
        totals.set(category.id, (totals.get(category.id) ?? 0) + monthly);
      }
      for (const [categoryId, amount] of totals) {
        allocationMap.set(categoryId, { plannedAmountMinor: amount, notes: "Auto-included: active SIPs/investments" });
      }
    }

    if (data.autoIncludeRecurringBills) {
      const recurring = await prisma.recurringTransaction.findMany({
        where: { userId, type: "EXPENSE", isActive: true, categoryId: { not: null } },
      });
      const totals = new Map<string, number>();
      for (const r of recurring) {
        if (!r.categoryId) continue;
        const monthly = monthlyEquivalentMinor(r.amountMinor, r.frequency);
        totals.set(r.categoryId, (totals.get(r.categoryId) ?? 0) + monthly);
      }
      for (const [categoryId, amount] of totals) {
        const existingAlloc = allocationMap.get(categoryId);
        allocationMap.set(categoryId, {
          plannedAmountMinor: (existingAlloc?.plannedAmountMinor ?? 0) + amount,
          notes: "Includes auto-included recurring bills",
        });
      }
    }

    const plannedIncomeAgg = await prisma.incomeTransaction.aggregate({
      where: {
        userId,
        expectedDate: { gte: new Date(Date.UTC(data.year, data.month - 1, 1)), lt: new Date(Date.UTC(data.year, data.month, 1)) },
      },
      _sum: { plannedAmountMinor: true },
    });

    const budgetMonth = await prisma.budgetMonth.create({
      data: {
        userId,
        year: data.year,
        month: data.month,
        budgetingMethod: data.budgetingMethod,
        needsPercent: data.needsPercent ?? null,
        wantsPercent: data.wantsPercent ?? null,
        savingsDebtPercent: data.savingsDebtPercent ?? null,
        plannedIncomeMinor: plannedIncomeAgg._sum.plannedAmountMinor ?? 0,
        allocations: {
          create: [...allocationMap.entries()].map(([categoryId, v]) => ({
            categoryId,
            plannedAmountMinor: v.plannedAmountMinor,
            notes: v.notes ?? null,
          })),
        },
      },
    });

    revalidatePath("/budget");
    return { id: budgetMonth.id };
  });
}

export async function upsertBudgetAllocation(budgetMonthId: string, input: BudgetAllocationInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const month = await prisma.budgetMonth.findUnique({ where: { id: budgetMonthId } });
    if (!month || month.userId !== userId) throw new Error("Budget month not found.");
    if (month.isLocked) throw new Error("This month is locked. Unlock it first to make changes.");

    const data = budgetAllocationSchema.parse(input);
    const allocation = await prisma.budgetAllocation.upsert({
      where: { budgetMonthId_categoryId: { budgetMonthId, categoryId: data.categoryId } },
      create: { budgetMonthId, categoryId: data.categoryId, plannedAmountMinor: toMinorUnits(data.plannedAmount), notes: data.notes || null },
      update: { plannedAmountMinor: toMinorUnits(data.plannedAmount), notes: data.notes || null },
    });

    revalidatePath("/budget");
    return { id: allocation.id };
  });
}

export async function deleteBudgetAllocation(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const allocation = await prisma.budgetAllocation.findUnique({ where: { id }, include: { budgetMonth: true } });
    if (!allocation || allocation.budgetMonth.userId !== userId) throw new Error("Allocation not found.");
    if (allocation.budgetMonth.isLocked) throw new Error("This month is locked. Unlock it first to make changes.");

    await prisma.budgetAllocation.delete({ where: { id } });
    revalidatePath("/budget");
    return { id };
  });
}

export async function setBudgetMonthLock(id: string, locked: boolean): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const month = await prisma.budgetMonth.findUnique({ where: { id } });
    if (!month || month.userId !== userId) throw new Error("Budget month not found.");
    await prisma.budgetMonth.update({ where: { id }, data: { isLocked: locked } });
    revalidatePath("/budget");
    return { id };
  });
}

export async function saveAsTemplate(budgetMonthId: string, name: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const month = await prisma.budgetMonth.findUnique({ where: { id: budgetMonthId }, include: { allocations: true } });
    if (!month || month.userId !== userId) throw new Error("Budget month not found.");

    const template = await prisma.budgetTemplate.create({
      data: {
        userId,
        name: name.trim() || `Template from ${month.month}/${month.year}`,
        allocations: {
          create: month.allocations.map((a) => ({ categoryId: a.categoryId, plannedAmountMinor: a.plannedAmountMinor, notes: a.notes })),
        },
      },
    });
    revalidatePath("/budget");
    return { id: template.id };
  });
}

export interface BudgetVsActualRow extends CategoryBudgetStatus {
  allocationId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  spendingPace: ReturnType<typeof spendingPace>;
  previousMonthActualMinor: number;
}

export interface BudgetVsActualSummary {
  budgetMonth: NonNullable<Awaited<ReturnType<typeof getBudgetMonth>>>;
  rows: BudgetVsActualRow[];
  totalPlannedIncomeMinor: number;
  totalReceivedIncomeMinor: number;
  totalPlannedAllocationMinor: number;
  unallocatedCashMinor: number;
  totalActualPaidMinor: number;
  totalPendingMinor: number;
  projectedMonthEndBalanceMinor: number;
  actualMonthEndBalanceMinor: number;
  budgetAdherenceScorePercent: number;
}

export async function getBudgetVsActual(year: number, month: number): Promise<BudgetVsActualSummary | null> {
  const userId = await requireUserId();
  const budgetMonth = await prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: { allocations: { include: { category: true } } },
  });
  if (!budgetMonth) return null;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const prevMonthDate = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const prevMonthStart = new Date(Date.UTC(prevMonthDate.y, prevMonthDate.m - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(prevMonthDate.y, prevMonthDate.m, 1));

  const expenses = await prisma.expenseTransaction.findMany({
    where: { userId, date: { gte: monthStart, lt: monthEnd } },
  });
  const prevExpenses = await prisma.expenseTransaction.findMany({
    where: { userId, date: { gte: prevMonthStart, lt: prevMonthEnd }, status: "PAID" },
  });
  const prevMonthActualByCategory = new Map<string, number>();
  for (const e of prevExpenses) {
    if (!e.categoryId) continue;
    const sign = e.refundOfExpenseId ? -1 : 1;
    prevMonthActualByCategory.set(e.categoryId, (prevMonthActualByCategory.get(e.categoryId) ?? 0) + sign * e.amountMinor);
  }

  const income = await prisma.incomeTransaction.aggregate({
    where: { userId, expectedDate: { gte: monthStart, lt: monthEnd } },
    _sum: { plannedAmountMinor: true, actualAmountMinor: true },
  });

  const now = new Date();
  const isCurrentMonth = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
  const dayOfMonth = isCurrentMonth ? now.getUTCDate() : daysInMonth(year, month - 1);
  const totalDays = daysInMonth(year, month - 1);

  let categoriesWithinLimit = 0;
  const rows: BudgetVsActualRow[] = budgetMonth.allocations.map((allocation) => {
    const categoryExpenses = expenses.filter((e) => e.categoryId === allocation.categoryId);
    const paid = categoryExpenses
      .filter((e) => e.status === "PAID" && !e.refundOfExpenseId)
      .reduce((s, e) => s + e.amountMinor, 0);
    const refunded = categoryExpenses
      .filter((e) => e.status === "PAID" && e.refundOfExpenseId)
      .reduce((s, e) => s + e.amountMinor, 0);
    const pending = categoryExpenses.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.amountMinor, 0);
    const netPaid = paid - refunded;

    const status = categoryBudgetStatus(allocation.plannedAmountMinor, netPaid, pending);
    if (status.status !== "RED") categoriesWithinLimit += 1;

    return {
      allocationId: allocation.id,
      categoryId: allocation.categoryId,
      categoryName: allocation.category.name,
      categoryColor: allocation.category.color,
      ...status,
      spendingPace: spendingPace(dayOfMonth, totalDays, netPaid, allocation.plannedAmountMinor),
      previousMonthActualMinor: prevMonthActualByCategory.get(allocation.categoryId) ?? 0,
    };
  });

  const totalActualPaidMinor = rows.reduce((s, r) => s + r.actualPaidMinor, 0);
  const totalPendingMinor = rows.reduce((s, r) => s + r.pendingMinor, 0);
  const totalPlannedAllocationMinor = rows.reduce((s, r) => s + r.budgetedMinor, 0);
  const totalPlannedIncomeMinor = income._sum.plannedAmountMinor ?? 0;
  const totalReceivedIncomeMinor = income._sum.actualAmountMinor ?? 0;

  const investmentAndSavingsMinor = rows
    .filter((r) => ["Mutual Fund SIP", "ELSS", "Gold", "Silver", "Stocks", "NPS", "PPF", "Recurring Deposit", "Emergency Fund", "Other Savings"].includes(r.categoryName))
    .reduce((s, r) => s + r.actualPaidMinor, 0);

  return {
    budgetMonth,
    rows,
    totalPlannedIncomeMinor,
    totalReceivedIncomeMinor,
    totalPlannedAllocationMinor,
    unallocatedCashMinor: unallocatedCashMinor(totalPlannedIncomeMinor, totalPlannedAllocationMinor),
    totalActualPaidMinor,
    totalPendingMinor,
    projectedMonthEndBalanceMinor: projectedMonthEndBalanceMinor({
      expectedIncomeMinor: totalPlannedIncomeMinor,
      paidExpensesMinor: totalActualPaidMinor,
      pendingCommitmentsMinor: totalPendingMinor,
    }),
    actualMonthEndBalanceMinor: actualMonthEndBalanceMinor({
      receivedIncomeMinor: totalReceivedIncomeMinor,
      actualExpensesMinor: totalActualPaidMinor - investmentAndSavingsMinor,
      actualInvestmentsMinor: investmentAndSavingsMinor,
      actualSavingsMinor: 0,
    }),
    budgetAdherenceScorePercent: budgetAdherenceScorePercent(categoriesWithinLimit, rows.length),
  };
}
