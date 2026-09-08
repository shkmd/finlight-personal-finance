"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentYearMonth, daysInMonth } from "@/lib/dates";
import { monthlyEquivalentMinor } from "@/lib/finance/sip";
import { getBudgetVsActual } from "@/lib/actions/budget";
import { recommendedTargetMinor, progressPercent } from "@/lib/finance/emergencyFund";
import { simulateMinimumPaymentsBaseline, type PayoffLoanInput } from "@/lib/finance/payoff";
import { emiAsPercentOfIncome } from "@/lib/finance/emi";
import { ESSENTIAL_CATEGORY_NAMES } from "@/lib/defaults";

const LIQUID_ACCOUNT_TYPES = ["BANK", "CASH", "WALLET"] as const;

export async function getDashboardSummary() {
  const userId = await requireUserId();
  const { year, month } = currentYearMonth();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const today = new Date();

  const [accounts, activeLoans, activeInvestments, pausedInvestments, emergencyFunds, budgetVsActual, recentExpenses, recentIncome] =
    await Promise.all([
      prisma.financialAccount.findMany({ where: { userId, isArchived: false } }),
      prisma.loan.findMany({ where: { userId, status: "ACTIVE" } }),
      prisma.investment.findMany({ where: { userId, isActive: true } }),
      prisma.investment.findMany({ where: { userId, isActive: false } }),
      prisma.emergencyFund.findMany({ where: { userId } }),
      getBudgetVsActual(year, month),
      prisma.expenseTransaction.findMany({
        where: { userId, date: { gte: new Date(Date.UTC(year, month - 4, 1)), lt: monthEnd }, status: "PAID" },
        include: { category: true },
      }),
      prisma.incomeTransaction.aggregate({
        where: { userId, expectedDate: { gte: monthStart, lt: monthEnd } },
        _sum: { plannedAmountMinor: true, actualAmountMinor: true },
      }),
    ]);

  const currentAvailableCashMinor = accounts
    .filter((a) => (LIQUID_ACCOUNT_TYPES as readonly string[]).includes(a.type))
    .reduce((s, a) => s + a.currentBalanceMinor, 0);

  const totalOutstandingDebtMinor = activeLoans.reduce((s, l) => s + l.currentOutstandingPrincipalMinor, 0);
  const totalMonthlyEmiMinor = activeLoans.reduce((s, l) => s + l.currentEmiMinor, 0);
  const weightedAvgRate =
    totalOutstandingDebtMinor > 0
      ? activeLoans.reduce((s, l) => s + l.annualInterestRatePercent * l.currentOutstandingPrincipalMinor, 0) / totalOutstandingDebtMinor
      : 0;

  const plannedIncomeMinor = recentIncome._sum.plannedAmountMinor ?? 0;
  const actualIncomeMinor = recentIncome._sum.actualAmountMinor ?? 0;
  const emiToIncomeRatio = emiAsPercentOfIncome(totalMonthlyEmiMinor, plannedIncomeMinor || actualIncomeMinor);

  let baselineDebtFreeDate: Date | null = null;
  if (activeLoans.length) {
    const loanInputs: PayoffLoanInput[] = activeLoans.map((l) => ({
      loanId: l.id,
      name: l.name,
      balanceMinor: l.currentOutstandingPrincipalMinor,
      annualRatePercent: l.annualInterestRatePercent,
      emiMinor: l.currentEmiMinor,
    }));
    const baseline = simulateMinimumPaymentsBaseline(loanInputs, today);
    baselineDebtFreeDate = baseline.debtFreeDate;
  }

  const latestScenario = await prisma.payoffScenario.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const scenarioSummary = latestScenario?.resultsSummaryJson ? JSON.parse(latestScenario.resultsSummaryJson) : null;

  const activeSipMonthlyMinor = activeInvestments.reduce(
    (s, i) => s + monthlyEquivalentMinor(i.contributionAmountMinor, i.frequency),
    0
  );
  const pausedSipMonthlyMinor = pausedInvestments.reduce(
    (s, i) => s + monthlyEquivalentMinor(i.contributionAmountMinor, i.frequency),
    0
  );

  // Average monthly essential spend over the last (up to) 3 complete months, for the emergency-fund target.
  const essentialExpenses = recentExpenses.filter((e) => e.category && ESSENTIAL_CATEGORY_NAMES.has(e.category.name));
  const monthsSpanned = Math.max(1, Math.min(3, month >= 4 ? 3 : month - 1 || 1));
  const avgMonthlyEssentialMinor = essentialExpenses.reduce((s, e) => s + e.amountMinor, 0) / monthsSpanned;

  const primaryFund = emergencyFunds[0] ?? null;
  const emergencyFundBalanceMinor = emergencyFunds.reduce((s, f) => s + f.currentSavedAmountMinor, 0);
  const emergencyFundTargetMinor = primaryFund
    ? recommendedTargetMinor({
        targetMethod: primaryFund.targetMethod,
        avgMonthlyEssentialExpensesMinor: avgMonthlyEssentialMinor,
        fixedTargetAmountMinor: primaryFund.fixedTargetAmountMinor,
        targetMonths: primaryFund.targetMonths,
      })
    : 0;
  const emergencyFundProgressPercent = primaryFund ? progressPercent(emergencyFundBalanceMinor, emergencyFundTargetMinor) : 0;

  const savingsRatePercent =
    budgetVsActual && budgetVsActual.totalReceivedIncomeMinor > 0
      ? ((budgetVsActual.totalReceivedIncomeMinor - budgetVsActual.totalActualPaidMinor) / budgetVsActual.totalReceivedIncomeMinor) * 100
      : 0;

  const [nextIncome, nextLoan, nextInvestment, upcomingBills] = await Promise.all([
    prisma.incomeTransaction.findFirst({
      where: { userId, status: "EXPECTED", expectedDate: { gte: today } },
      orderBy: { expectedDate: "asc" },
    }),
    prisma.loan.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { nextPaymentDate: "asc" } }),
    prisma.investment.findFirst({ where: { userId, isActive: true }, orderBy: { nextContributionDate: "asc" } }),
    prisma.recurringTransaction.findMany({
      where: { userId, isActive: true, type: "EXPENSE", nextOccurrenceDate: { gte: today } },
      orderBy: { nextOccurrenceDate: "asc" },
      take: 5,
    }),
  ]);

  const creditCardAccounts = accounts.filter((a) => a.type === "CREDIT_CARD" && a.paymentDueDay);
  const nextCreditCardDue = creditCardAccounts
    .map((a) => {
      const due = new Date(Date.UTC(year, month - 1, a.paymentDueDay!));
      if (due < today) due.setUTCMonth(due.getUTCMonth() + 1);
      return { account: a, dueDate: due };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  return {
    month,
    year,
    daysInMonth: daysInMonth(year, month - 1),
    totalIncomeReceivedMinor: actualIncomeMinor,
    totalExpensesThisMonthMinor: budgetVsActual?.totalActualPaidMinor ?? 0,
    plannedAllocationMinor: budgetVsActual?.totalPlannedAllocationMinor ?? 0,
    currentAvailableCashMinor,
    unallocatedCashMinor: budgetVsActual?.unallocatedCashMinor ?? null,
    projectedMonthEndBalanceMinor: budgetVsActual?.projectedMonthEndBalanceMinor ?? null,
    actualMonthEndBalanceMinor: budgetVsActual?.actualMonthEndBalanceMinor ?? null,
    totalOutstandingDebtMinor,
    totalMonthlyEmiMinor,
    emiToIncomeRatio,
    weightedAvgInterestRate: weightedAvgRate,
    baselineDebtFreeDate,
    acceleratedDebtFreeDate: scenarioSummary?.acceleratedDebtFreeDate ? new Date(scenarioSummary.acceleratedDebtFreeDate) : null,
    monthsSaved: scenarioSummary?.monthsSaved ?? null,
    interestSavedMinor: scenarioSummary?.interestSavedMinor ?? null,
    activeSipMonthlyMinor,
    pausedSipMonthlyMinor,
    emergencyFundBalanceMinor,
    emergencyFundTargetMinor,
    emergencyFundProgressPercent,
    savingsRatePercent,
    budgetAdherenceScorePercent: budgetVsActual?.budgetAdherenceScorePercent ?? null,
    hasBudget: !!budgetVsActual,
    upcoming: {
      nextIncome,
      nextEmi: nextLoan ? { loan: nextLoan, date: nextLoan.nextPaymentDate } : null,
      nextSip: nextInvestment ? { investment: nextInvestment, date: nextInvestment.nextContributionDate } : null,
      nextCreditCardDue,
      upcomingBills,
      expectedCashShortage: (budgetVsActual?.projectedMonthEndBalanceMinor ?? 0) < 0,
    },
  };
}
