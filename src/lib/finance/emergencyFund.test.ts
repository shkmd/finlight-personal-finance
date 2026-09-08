import { describe, expect, it } from "vitest";
import {
  estimatedCompletionDate,
  monthsOfExpensesCovered,
  monthsToReachTarget,
  progressPercent,
  recommendedTargetMinor,
  requiredMonthlyContributionMinor,
} from "./emergencyFund";

describe("recommendedTargetMinor", () => {
  it("computes six months of essential expenses", () => {
    expect(
      recommendedTargetMinor({ targetMethod: "SIX_MONTHS", avgMonthlyEssentialExpensesMinor: 30_000 })
    ).toBe(180_000);
  });

  it("computes three months of essential expenses", () => {
    expect(
      recommendedTargetMinor({ targetMethod: "THREE_MONTHS", avgMonthlyEssentialExpensesMinor: 30_000 })
    ).toBe(90_000);
  });

  it("uses a fixed amount when specified", () => {
    expect(
      recommendedTargetMinor({
        targetMethod: "FIXED_AMOUNT",
        avgMonthlyEssentialExpensesMinor: 30_000,
        fixedTargetAmountMinor: 500_000,
      })
    ).toBe(500_000);
  });

  it("uses a custom number of months", () => {
    expect(
      recommendedTargetMinor({ targetMethod: "CUSTOM_MONTHS", avgMonthlyEssentialExpensesMinor: 10_000, targetMonths: 9 })
    ).toBe(90_000);
  });
});

describe("monthsOfExpensesCovered", () => {
  it("divides saved amount by average monthly essential expenses", () => {
    expect(monthsOfExpensesCovered(90_000, 30_000)).toBe(3);
  });

  it("returns 0 when there is no expense baseline", () => {
    expect(monthsOfExpensesCovered(90_000, 0)).toBe(0);
  });
});

describe("progressPercent", () => {
  it("caps at 100% once the target is met or exceeded", () => {
    expect(progressPercent(200_000, 180_000)).toBe(100);
  });

  it("computes partial progress", () => {
    expect(progressPercent(90_000, 180_000)).toBe(50);
  });
});

describe("monthsToReachTarget", () => {
  it("returns 0 when the target is already met", () => {
    expect(monthsToReachTarget({ savedAmountMinor: 200_000, targetAmountMinor: 180_000, monthlyContributionMinor: 5_000 })).toBe(0);
  });

  it("returns null when contribution is zero and target isn't met", () => {
    expect(monthsToReachTarget({ savedAmountMinor: 0, targetAmountMinor: 180_000, monthlyContributionMinor: 0 })).toBeNull();
  });

  it("rounds up partial months", () => {
    expect(monthsToReachTarget({ savedAmountMinor: 0, targetAmountMinor: 25_000, monthlyContributionMinor: 10_000 })).toBe(3);
  });
});

describe("estimatedCompletionDate", () => {
  it("adds the required number of months to the from-date", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const result = estimatedCompletionDate({
      savedAmountMinor: 0,
      targetAmountMinor: 30_000,
      monthlyContributionMinor: 10_000,
      fromDate: from,
    });
    expect(result?.getUTCMonth()).toBe(3); // 3 months later => April (month index 3)
  });
});

describe("requiredMonthlyContributionMinor", () => {
  it("divides the remaining amount across the months until the target date", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 6, 1)); // 6 months later
    expect(
      requiredMonthlyContributionMinor({ savedAmountMinor: 0, targetAmountMinor: 60_000, targetDate: to, fromDate: from })
    ).toBe(10_000);
  });

  it("returns 0 when the target is already met", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 6, 1));
    expect(
      requiredMonthlyContributionMinor({ savedAmountMinor: 70_000, targetAmountMinor: 60_000, targetDate: to, fromDate: from })
    ).toBe(0);
  });
});
