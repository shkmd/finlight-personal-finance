import { describe, expect, it } from "vitest";
import {
  categoryBudgetStatus,
  isZeroBased,
  percentageBudgetTargets,
  projectedMonthEndBalanceMinor,
  actualMonthEndBalanceMinor,
  spendingPace,
  unallocatedCashMinor,
  budgetAdherenceScorePercent,
} from "./budget";

describe("unallocatedCashMinor", () => {
  it("is positive (not 'overspent') when income exceeds allocations", () => {
    expect(unallocatedCashMinor(100_000, 80_000)).toBe(20_000);
  });

  it("goes negative when allocations exceed income", () => {
    expect(unallocatedCashMinor(100_000, 120_000)).toBe(-20_000);
  });
});

describe("categoryBudgetStatus", () => {
  it("is GREEN below the amber threshold", () => {
    expect(categoryBudgetStatus(10_000, 7_000, 0).status).toBe("GREEN");
  });

  it("is AMBER between the amber and red thresholds", () => {
    expect(categoryBudgetStatus(10_000, 8_000, 0).status).toBe("AMBER");
  });

  it("is RED at or above 100% used", () => {
    expect(categoryBudgetStatus(10_000, 10_000, 0).status).toBe("RED");
    expect(categoryBudgetStatus(10_000, 12_000, 0).status).toBe("RED");
  });

  it("computes remaining and over/under correctly", () => {
    const status = categoryBudgetStatus(10_000, 12_000, 0);
    expect(status.remainingMinor).toBe(-2_000);
    expect(status.overUnderMinor).toBe(2_000);
  });
});

describe("spendingPace", () => {
  it("flags OVER_BUDGET once actual exceeds the budgeted amount, regardless of date", () => {
    const pace = spendingPace(5, 30, 11_000, 10_000);
    expect(pace.paceStatus).toBe("OVER_BUDGET");
  });

  it("flags AHEAD_OF_PACE when spend-rate outstrips days elapsed but is still within budget", () => {
    // 50% of month passed, but 80% of budget already used and not yet over.
    const pace = spendingPace(15, 30, 8_000, 10_000);
    expect(pace.paceStatus).toBe("AHEAD_OF_PACE");
    expect(pace.percentOfBudgetUsed).toBeLessThanOrEqual(100);
  });

  it("does not mark a category over budget just because pace is high", () => {
    const pace = spendingPace(15, 30, 8_000, 10_000);
    expect(pace.paceStatus).not.toBe("OVER_BUDGET");
  });

  it("flags UNDER_PACE when spending trails the calendar", () => {
    const pace = spendingPace(25, 30, 2_000, 10_000);
    expect(pace.paceStatus).toBe("UNDER_PACE");
  });
});

describe("projected vs actual month-end balance", () => {
  it("computes projected balance from expected income minus paid and pending", () => {
    expect(
      projectedMonthEndBalanceMinor({ expectedIncomeMinor: 100_000, paidExpensesMinor: 40_000, pendingCommitmentsMinor: 20_000 })
    ).toBe(40_000);
  });

  it("computes actual balance from received income minus actual outflows", () => {
    expect(
      actualMonthEndBalanceMinor({
        receivedIncomeMinor: 100_000,
        actualExpensesMinor: 30_000,
        actualInvestmentsMinor: 10_000,
        actualSavingsMinor: 5_000,
      })
    ).toBe(55_000);
  });
});

describe("percentageBudgetTargets", () => {
  it("splits income into needs/wants/savings buckets summing back to income", () => {
    const targets = percentageBudgetTargets(100_000, 50, 30, 20);
    expect(targets.needsMinor).toBe(50_000);
    expect(targets.wantsMinor).toBe(30_000);
    expect(targets.savingsDebtMinor).toBe(20_000);
    expect(targets.needsMinor + targets.wantsMinor + targets.savingsDebtMinor).toBe(100_000);
  });
});

describe("isZeroBased", () => {
  it("is true within tolerance of zero", () => {
    expect(isZeroBased(0)).toBe(true);
    expect(isZeroBased(50)).toBe(true);
  });

  it("is false outside tolerance", () => {
    expect(isZeroBased(5_000)).toBe(false);
  });
});

describe("budgetAdherenceScorePercent", () => {
  it("is the percentage of categories that stayed within their limit", () => {
    expect(budgetAdherenceScorePercent(3, 4)).toBe(75);
  });

  it("defaults to 100 when there are no categories", () => {
    expect(budgetAdherenceScorePercent(0, 0)).toBe(100);
  });
});
