export interface CategoryBudgetStatus {
  budgetedMinor: number;
  actualPaidMinor: number;
  pendingMinor: number;
  remainingMinor: number;
  percentUsed: number;
  overUnderMinor: number; // positive = over budget
  status: "GREEN" | "AMBER" | "RED";
}

export interface BudgetStatusThresholds {
  amberAtPercent: number; // e.g. 75
  redAtPercent: number; // e.g. 100
}

export const DEFAULT_BUDGET_THRESHOLDS: BudgetStatusThresholds = {
  amberAtPercent: 75,
  redAtPercent: 100,
};

export function totalMinor(amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/** Unallocated cash = planned income − total planned allocation. Never call a positive result "spending". */
export function unallocatedCashMinor(plannedIncomeMinor: number, totalPlannedAllocationMinor: number): number {
  return plannedIncomeMinor - totalPlannedAllocationMinor;
}

export function categoryBudgetStatus(
  budgetedMinor: number,
  actualPaidMinor: number,
  pendingMinor: number,
  thresholds: BudgetStatusThresholds = DEFAULT_BUDGET_THRESHOLDS
): CategoryBudgetStatus {
  const remainingMinor = budgetedMinor - actualPaidMinor;
  const percentUsed = budgetedMinor > 0 ? (actualPaidMinor / budgetedMinor) * 100 : actualPaidMinor > 0 ? 100 : 0;
  const overUnderMinor = actualPaidMinor - budgetedMinor;

  let status: CategoryBudgetStatus["status"] = "GREEN";
  if (percentUsed >= thresholds.redAtPercent) status = "RED";
  else if (percentUsed >= thresholds.amberAtPercent) status = "AMBER";

  return { budgetedMinor, actualPaidMinor, pendingMinor, remainingMinor, percentUsed, overUnderMinor, status };
}

export type SpendingPaceStatus = "UNDER_PACE" | "ON_PACE" | "AHEAD_OF_PACE" | "OVER_BUDGET";

export interface SpendingPace {
  percentOfMonthElapsed: number;
  percentOfBudgetUsed: number;
  paceStatus: SpendingPaceStatus;
}

/**
 * Distinguishes "over budget" (actual already exceeds the planned amount)
 * from "spending faster than planned" (within budget, but the pace implies
 * it will be exceeded before month-end) — the spec explicitly warns
 * against conflating the two.
 */
export function spendingPace(
  dayOfMonth: number,
  totalDaysInMonth: number,
  actualPaidMinor: number,
  budgetedMinor: number
): SpendingPace {
  const percentOfMonthElapsed = (dayOfMonth / totalDaysInMonth) * 100;
  const percentOfBudgetUsed = budgetedMinor > 0 ? (actualPaidMinor / budgetedMinor) * 100 : 0;

  let paceStatus: SpendingPaceStatus = "ON_PACE";
  if (percentOfBudgetUsed > 100) {
    paceStatus = "OVER_BUDGET";
  } else if (percentOfBudgetUsed > percentOfMonthElapsed + 10) {
    paceStatus = "AHEAD_OF_PACE";
  } else if (percentOfBudgetUsed < percentOfMonthElapsed - 10) {
    paceStatus = "UNDER_PACE";
  }

  return { percentOfMonthElapsed, percentOfBudgetUsed, paceStatus };
}

export function projectedMonthEndBalanceMinor(params: {
  expectedIncomeMinor: number;
  paidExpensesMinor: number;
  pendingCommitmentsMinor: number;
}): number {
  return params.expectedIncomeMinor - params.paidExpensesMinor - params.pendingCommitmentsMinor;
}

export function actualMonthEndBalanceMinor(params: {
  receivedIncomeMinor: number;
  actualExpensesMinor: number;
  actualInvestmentsMinor: number;
  actualSavingsMinor: number;
}): number {
  return (
    params.receivedIncomeMinor -
    params.actualExpensesMinor -
    params.actualInvestmentsMinor -
    params.actualSavingsMinor
  );
}

export interface PercentageBudgetTargets {
  needsMinor: number;
  wantsMinor: number;
  savingsDebtMinor: number;
}

export function percentageBudgetTargets(
  plannedIncomeMinor: number,
  needsPercent: number,
  wantsPercent: number,
  savingsDebtPercent: number
): PercentageBudgetTargets {
  return {
    needsMinor: Math.round((plannedIncomeMinor * needsPercent) / 100),
    wantsMinor: Math.round((plannedIncomeMinor * wantsPercent) / 100),
    savingsDebtMinor: Math.round((plannedIncomeMinor * savingsDebtPercent) / 100),
  };
}

/**
 * Zero-based budgeting check: income minus every allocation (expenses,
 * debt, investments, savings, emergency fund, cash buffer) should be ~0.
 * A zero balance means every rupee has a job — not that all income was
 * spent.
 */
export function isZeroBased(remainderMinor: number, toleranceMinor = 100): boolean {
  return Math.abs(remainderMinor) <= toleranceMinor;
}

export function budgetAdherenceScorePercent(categoriesWithinLimit: number, totalCategories: number): number {
  if (totalCategories <= 0) return 100;
  return (categoriesWithinLimit / totalCategories) * 100;
}
