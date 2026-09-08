"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentYearMonth, daysInMonth, formatDateOnly } from "@/lib/dates";
import { monthlyEquivalentMinor } from "@/lib/finance/sip";
import { getBudgetVsActual } from "@/lib/actions/budget";
import { recommendedTargetMinor, progressPercent } from "@/lib/finance/emergencyFund";
import { simulateMinimumPaymentsBaseline, type PayoffLoanInput } from "@/lib/finance/payoff";
import { emiAsPercentOfIncome } from "@/lib/finance/emi";
import { ESSENTIAL_CATEGORY_NAMES } from "@/lib/defaults";

const LIQUID_ACCOUNT_TYPES = ["BANK", "CASH", "WALLET"] as const;
const CATEGORY_COLORS = ["#1a7f4b", "#0c4429", "#c0392b", "#6c7873", "#bfe4cf", "#083322", "#dfe3e0"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export async function getDashboardSummary(target?: { year: number; month: number }) {
  const userId = await requireUserId();
  const { year, month } = target ?? currentYearMonth();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const today = new Date();

  const seriesRange = shiftMonth(year, month, -5);
  const seriesStart = new Date(Date.UTC(seriesRange.year, seriesRange.month - 1, 1));

  const [
    accounts,
    activeLoans,
    allLoans,
    activeInvestments,
    pausedInvestments,
    emergencyFunds,
    budgetVsActual,
    seriesExpenses,
    seriesIncome,
    monthExpensesForActivity,
    monthIncomeForActivity,
  ] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, isArchived: false } }),
    prisma.loan.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.loan.findMany({ where: { userId, status: { not: "ARCHIVED" } } }),
    prisma.investment.findMany({ where: { userId, isActive: true } }),
    prisma.investment.findMany({ where: { userId, isActive: false } }),
    prisma.emergencyFund.findMany({ where: { userId } }),
    getBudgetVsActual(year, month),
    prisma.expenseTransaction.findMany({
      where: { userId, date: { gte: seriesStart, lt: monthEnd }, status: "PAID" },
      include: { category: true },
    }),
    prisma.incomeTransaction.findMany({
      where: { userId, expectedDate: { gte: seriesStart, lt: monthEnd } },
    }),
    prisma.expenseTransaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd }, status: "PAID" },
      include: { category: true },
    }),
    prisma.incomeTransaction.findMany({
      where: { userId, expectedDate: { gte: monthStart, lt: monthEnd }, status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] } },
    }),
  ]);

  const currentAvailableCashMinor = accounts
    .filter((a) => (LIQUID_ACCOUNT_TYPES as readonly string[]).includes(a.type))
    .reduce((s, a) => s + a.currentBalanceMinor, 0);
  const liquidAccountsCount = accounts.filter((a) => (LIQUID_ACCOUNT_TYPES as readonly string[]).includes(a.type)).length;

  const totalOutstandingDebtMinor = activeLoans.reduce((s, l) => s + l.currentOutstandingPrincipalMinor, 0);
  const totalMonthlyEmiMinor = activeLoans.reduce((s, l) => s + l.currentEmiMinor, 0);
  const weightedAvgRate =
    totalOutstandingDebtMinor > 0
      ? activeLoans.reduce((s, l) => s + l.annualInterestRatePercent * l.currentOutstandingPrincipalMinor, 0) / totalOutstandingDebtMinor
      : 0;
  const originalPrincipalMinor = allLoans.reduce((s, l) => s + l.originalPrincipalMinor, 0);
  const clearedPrincipalMinor = Math.max(0, originalPrincipalMinor - totalOutstandingDebtMinor);

  const monthIncomeMinor = monthIncomeForActivity.reduce((s, i) => s + (i.actualAmountMinor ?? 0), 0);
  const monthExpenseMinor = monthExpensesForActivity.filter((e) => !e.refundOfExpenseId).reduce((s, e) => s + e.amountMinor, 0);
  const emiToIncomeRatio = emiAsPercentOfIncome(totalMonthlyEmiMinor, monthIncomeMinor);

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
  const activeInvestmentsCount = activeInvestments.length;

  // "Net this month" is income minus every outflow — paid expenses AND
  // money committed to active investments this month (their monthly
  // equivalent, since a SIP due this month is as real a commitment as an
  // expense even before the contribution is separately recorded).
  const netThisMonthMinor = monthIncomeMinor - monthExpenseMinor - activeSipMonthlyMinor;

  const essentialExpenses = seriesExpenses.filter((e) => e.category && ESSENTIAL_CATEGORY_NAMES.has(e.category.name));
  const avgMonthlyEssentialMinor = essentialExpenses.reduce((s, e) => s + e.amountMinor, 0) / 6;

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

  const savingsRatePercent = monthIncomeMinor > 0 ? (netThisMonthMinor / monthIncomeMinor) * 100 : 0;

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

  // Six-month cash-flow series ending at the selected month.
  const series = Array.from({ length: 6 }, (_, i) => shiftMonth(year, month, -5 + i)).map(({ year: y, month: m }) => {
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const incomeMinor = seriesIncome
      .filter((t) => t.expectedDate >= start && t.expectedDate < end)
      .reduce((s, t) => s + (t.actualAmountMinor ?? 0), 0);
    const expenseMinor = seriesExpenses
      .filter((t) => t.date >= start && t.date < end && !t.refundOfExpenseId)
      .reduce((s, t) => s + t.amountMinor, 0);
    return { year: y, month: m, label: `${MONTH_SHORT[m - 1]} ${y}`, short: MONTH_SHORT[m - 1], incomeMinor, expenseMinor };
  });

  // Top expense categories for the selected month, with line items for drill-down.
  const categoryTotals = new Map<string, number>();
  const categoryItems = new Map<string, Array<{ date: Date; desc: string; amountMinor: number }>>();
  for (const e of monthExpensesForActivity) {
    if (e.refundOfExpenseId) continue;
    const name = e.category?.name ?? "Uncategorized";
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + e.amountMinor);
    if (!categoryItems.has(name)) categoryItems.set(name, []);
    categoryItems.get(name)!.push({ date: e.date, desc: e.name, amountMinor: e.amountMinor });
  }
  const sortedCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  const categoryMax = sortedCategories[0]?.[1] ?? 1;
  const categories = sortedCategories.map(([name, amountMinor], i) => ({
    name,
    amountMinor,
    percentOfSpend: monthExpenseMinor > 0 ? (amountMinor / monthExpenseMinor) * 100 : 0,
    widthPercent: (amountMinor / categoryMax) * 100,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    items: (categoryItems.get(name) ?? [])
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((it) => ({ date: formatDateOnly(it.date, "d MMM"), desc: it.desc, amountMinor: it.amountMinor })),
  }));

  // Latest activity: most recent income + expense entries this month.
  const activity = [
    ...monthExpensesForActivity
      .filter((e) => !e.refundOfExpenseId)
      .map((e) => ({
        id: e.id,
        date: e.date,
        description: e.name,
        meta: `${formatDateOnly(e.date, "d MMM")} · ${e.category?.name ?? "Uncategorized"}`,
        amountMinor: e.amountMinor,
        isIncome: false,
      })),
    ...monthIncomeForActivity.map((inc) => ({
      id: inc.id,
      date: inc.receivedDate ?? inc.expectedDate,
      description: inc.sourceName,
      meta: `${formatDateOnly(inc.receivedDate ?? inc.expectedDate, "d MMM")} · ${inc.category}`,
      amountMinor: inc.actualAmountMinor ?? inc.plannedAmountMinor,
      isIncome: true,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return {
    month,
    year,
    daysInMonth: daysInMonth(year, month - 1),
    monthLabel: `${MONTH_SHORT[month - 1]} ${year}`,
    totalIncomeReceivedMinor: monthIncomeMinor,
    totalExpensesThisMonthMinor: monthExpenseMinor,
    netThisMonthMinor,
    plannedAllocationMinor: budgetVsActual?.totalPlannedAllocationMinor ?? 0,
    currentAvailableCashMinor,
    liquidAccountsCount,
    unallocatedCashMinor: budgetVsActual?.unallocatedCashMinor ?? null,
    projectedMonthEndBalanceMinor: budgetVsActual?.projectedMonthEndBalanceMinor ?? null,
    actualMonthEndBalanceMinor: budgetVsActual?.actualMonthEndBalanceMinor ?? null,
    totalOutstandingDebtMinor,
    totalMonthlyEmiMinor,
    emiToIncomeRatio,
    weightedAvgInterestRate: weightedAvgRate,
    originalPrincipalMinor,
    clearedPrincipalMinor,
    baselineDebtFreeDate,
    acceleratedDebtFreeDate: scenarioSummary?.acceleratedDebtFreeDate ? new Date(scenarioSummary.acceleratedDebtFreeDate) : null,
    monthsSaved: scenarioSummary?.monthsSaved ?? null,
    interestSavedMinor: scenarioSummary?.interestSavedMinor ?? null,
    extraMonthlyAmountMinor: latestScenario?.extraMonthlyAmountMinor ?? 0,
    activeSipMonthlyMinor,
    pausedSipMonthlyMinor,
    activeInvestmentsCount,
    emergencyFundBalanceMinor,
    emergencyFundTargetMinor,
    emergencyFundProgressPercent,
    savingsRatePercent,
    budgetAdherenceScorePercent: budgetVsActual?.budgetAdherenceScorePercent ?? null,
    hasBudget: !!budgetVsActual,
    series,
    categories,
    activity,
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
