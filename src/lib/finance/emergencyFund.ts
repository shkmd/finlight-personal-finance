import { roundHalfAwayFromZero } from "@/lib/money";
import { monthsBetween } from "@/lib/dates";
import type { EmergencyTargetMethod } from "@prisma/client";

export function recommendedTargetMinor(params: {
  targetMethod: EmergencyTargetMethod;
  avgMonthlyEssentialExpensesMinor: number;
  fixedTargetAmountMinor?: number | null;
  targetMonths?: number | null;
}): number {
  const { targetMethod, avgMonthlyEssentialExpensesMinor, fixedTargetAmountMinor, targetMonths } = params;
  switch (targetMethod) {
    case "FIXED_AMOUNT":
      return fixedTargetAmountMinor ?? 0;
    case "THREE_MONTHS":
      return avgMonthlyEssentialExpensesMinor * 3;
    case "SIX_MONTHS":
      return avgMonthlyEssentialExpensesMinor * 6;
    case "CUSTOM_MONTHS":
      return avgMonthlyEssentialExpensesMinor * (targetMonths ?? 0);
    default:
      return 0;
  }
}

export function monthsOfExpensesCovered(
  savedAmountMinor: number,
  avgMonthlyEssentialExpensesMinor: number
): number {
  if (avgMonthlyEssentialExpensesMinor <= 0) return 0;
  return savedAmountMinor / avgMonthlyEssentialExpensesMinor;
}

export function progressPercent(savedAmountMinor: number, targetAmountMinor: number): number {
  if (targetAmountMinor <= 0) return 0;
  return Math.min(100, (savedAmountMinor / targetAmountMinor) * 100);
}

/**
 * Months needed to reach the target at the current contribution rate.
 * Returns null when the contribution is zero/negative and the target
 * hasn't already been met (i.e. it will never be reached).
 */
export function monthsToReachTarget(params: {
  savedAmountMinor: number;
  targetAmountMinor: number;
  monthlyContributionMinor: number;
}): number | null {
  const remaining = params.targetAmountMinor - params.savedAmountMinor;
  if (remaining <= 0) return 0;
  if (params.monthlyContributionMinor <= 0) return null;
  return Math.ceil(remaining / params.monthlyContributionMinor);
}

export function estimatedCompletionDate(params: {
  savedAmountMinor: number;
  targetAmountMinor: number;
  monthlyContributionMinor: number;
  fromDate: Date;
}): Date | null {
  const months = monthsToReachTarget(params);
  if (months == null) return null;
  const result = new Date(params.fromDate);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Monthly contribution required to hit a fixed target date. */
export function requiredMonthlyContributionMinor(params: {
  savedAmountMinor: number;
  targetAmountMinor: number;
  targetDate: Date;
  fromDate: Date;
}): number {
  const remaining = params.targetAmountMinor - params.savedAmountMinor;
  if (remaining <= 0) return 0;
  const months = Math.max(1, monthsBetween(params.fromDate, params.targetDate));
  return roundHalfAwayFromZero(remaining / months);
}
