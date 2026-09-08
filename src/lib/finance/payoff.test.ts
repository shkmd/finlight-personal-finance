import { describe, expect, it } from "vitest";
import { calculateEmiMinor } from "./emi";
import {
  comparePayoffPlans,
  simulateMinimumPaymentsBaseline,
  simulatePayoffPlan,
  type PayoffLoanInput,
} from "./payoff";

const planStart = new Date(Date.UTC(2026, 0, 1));

function makeLoan(overrides: Partial<PayoffLoanInput> & { loanId: string }): PayoffLoanInput {
  return {
    name: overrides.loanId,
    balanceMinor: 100_000,
    annualRatePercent: 12,
    emiMinor: calculateEmiMinor(100_000, 12, 24),
    ...overrides,
  };
}

describe("simulatePayoffPlan strategy ordering", () => {
  const highRateSmallBalance = makeLoan({
    loanId: "high-rate",
    balanceMinor: 200_000,
    annualRatePercent: 24,
    emiMinor: calculateEmiMinor(200_000, 24, 24),
  });
  const lowRateTinyBalance = makeLoan({
    loanId: "low-rate-tiny",
    balanceMinor: 50_000,
    annualRatePercent: 10,
    emiMinor: calculateEmiMinor(50_000, 10, 24),
  });

  it("avalanche pays off the highest-interest loan first", () => {
    const result = simulatePayoffPlan({
      loans: [highRateSmallBalance, lowRateTinyBalance],
      strategy: "AVALANCHE",
      extraMonthlyAmountMinor: 20_000,
      planStartMonth: planStart,
    });
    expect(result.payoffOrder[0]).toBe("high-rate");
  });

  it("snowball pays off the smallest-balance loan first", () => {
    const result = simulatePayoffPlan({
      loans: [highRateSmallBalance, lowRateTinyBalance],
      strategy: "SNOWBALL",
      extraMonthlyAmountMinor: 20_000,
      planStartMonth: planStart,
    });
    expect(result.payoffOrder[0]).toBe("low-rate-tiny");
  });

  it("custom strategy respects the given priority order", () => {
    const result = simulatePayoffPlan({
      loans: [highRateSmallBalance, lowRateTinyBalance],
      strategy: "CUSTOM",
      customOrder: ["low-rate-tiny", "high-rate"],
      extraMonthlyAmountMinor: 20_000,
      planStartMonth: planStart,
    });
    expect(result.payoffOrder[0]).toBe("low-rate-tiny");
  });
});

describe("EMI rollover and same-month redistribution", () => {
  it("rolls a closed loan's EMI into the extra pool from the next month onward", () => {
    const smallLoan = makeLoan({
      loanId: "small",
      balanceMinor: 50_000,
      annualRatePercent: 0, // zero interest so the full EMI closes it in month 1 exactly
      emiMinor: 50_000,
    });
    const bigLoan = makeLoan({
      loanId: "big",
      balanceMinor: 1_000_000,
      annualRatePercent: 12,
      emiMinor: calculateEmiMinor(1_000_000, 12, 60),
    });

    const result = simulatePayoffPlan({
      loans: [smallLoan, bigLoan],
      strategy: "SNOWBALL",
      extraMonthlyAmountMinor: 0,
      planStartMonth: planStart,
    });

    const smallClosure = result.loanClosures.find((c) => c.loanId === "small");
    expect(smallClosure?.closureMonthIndex).toBe(1);

    const bigLoanMonth2 = result.schedule.find((e) => e.loanId === "big" && e.monthIndex === 2);
    // Once "small" is closed after month 1, its EMI (50,000) becomes extra
    // payment directed at "big" starting month 2.
    expect(bigLoanMonth2?.extraPaymentMinor).toBe(50_000);
  });

  it("redirects unused extra payment to the next loan within the same month once the target closes", () => {
    const target = makeLoan({
      loanId: "target",
      balanceMinor: 10_000,
      annualRatePercent: 12,
      emiMinor: 5_000,
    });
    const next = makeLoan({
      loanId: "next",
      balanceMinor: 500_000,
      annualRatePercent: 12,
      emiMinor: calculateEmiMinor(500_000, 12, 60),
    });

    // Extra payment far larger than what's needed to close "target" this month.
    const result = simulatePayoffPlan({
      loans: [target, next],
      strategy: "SNOWBALL", // target (smaller balance) is prioritised first
      extraMonthlyAmountMinor: 100_000,
      planStartMonth: planStart,
    });

    const month1Target = result.schedule.find((e) => e.loanId === "target" && e.monthIndex === 1);
    const month1Next = result.schedule.find((e) => e.loanId === "next" && e.monthIndex === 1);

    expect(month1Target?.isClosed).toBe(true);
    expect(month1Next?.extraPaymentMinor).toBeGreaterThan(0);
  });
});

describe("lump-sum repayment", () => {
  it("applies the lump sum only in its scheduled month", () => {
    const loan = makeLoan({ loanId: "solo", balanceMinor: 1_000_000, annualRatePercent: 12, emiMinor: calculateEmiMinor(1_000_000, 12, 60) });

    const withLumpSum = simulatePayoffPlan({
      loans: [loan],
      strategy: "AVALANCHE",
      extraMonthlyAmountMinor: 0,
      lumpSumAmountMinor: 300_000,
      lumpSumMonthIndex: 3,
      planStartMonth: planStart,
    });
    const withoutLumpSum = simulatePayoffPlan({
      loans: [loan],
      strategy: "AVALANCHE",
      extraMonthlyAmountMinor: 0,
      planStartMonth: planStart,
    });

    expect(withLumpSum.totalMonths).toBeLessThan(withoutLumpSum.totalMonths);

    const month2 = withLumpSum.schedule.find((e) => e.monthIndex === 2);
    const month3 = withLumpSum.schedule.find((e) => e.monthIndex === 3);
    expect(month2?.extraPaymentMinor).toBe(0);
    expect(month3?.extraPaymentMinor).toBeGreaterThanOrEqual(300_000);
  });
});

describe("baseline vs accelerated comparison", () => {
  it("shows months saved and positive interest saved when extra payments are made", () => {
    const loan = makeLoan({
      loanId: "solo",
      balanceMinor: 1_000_000,
      annualRatePercent: 14,
      emiMinor: calculateEmiMinor(1_000_000, 14, 60),
    });

    const baseline = simulateMinimumPaymentsBaseline([loan], planStart);
    const accelerated = simulatePayoffPlan({
      loans: [loan],
      strategy: "AVALANCHE",
      extraMonthlyAmountMinor: 10_000,
      planStartMonth: planStart,
    });

    const comparison = comparePayoffPlans(baseline, accelerated);
    expect(comparison.monthsSaved).toBeGreaterThan(0);
    expect(comparison.interestSavedMinor).toBeGreaterThan(0);
  });

  it("nets prepayment charges out of the reported savings", () => {
    const loan = makeLoan({
      loanId: "solo",
      balanceMinor: 1_000_000,
      annualRatePercent: 14,
      emiMinor: calculateEmiMinor(1_000_000, 14, 60),
      prepaymentChargePercent: 2,
    });

    const baseline = simulateMinimumPaymentsBaseline([{ ...loan, prepaymentChargePercent: null }], planStart);
    const accelerated = simulatePayoffPlan({
      loans: [loan],
      strategy: "AVALANCHE",
      extraMonthlyAmountMinor: 10_000,
      planStartMonth: planStart,
    });

    const comparison = comparePayoffPlans(baseline, accelerated);
    expect(accelerated.totalPrepaymentChargesMinor).toBeGreaterThan(0);
    expect(comparison.netInterestSavedMinor).toBeLessThan(comparison.interestSavedMinor);
  });
});

describe("multiple loans closing and never-payoff edge cases", () => {
  it("handles two loans closing in the same month", () => {
    const a = makeLoan({ loanId: "a", balanceMinor: 5_000, annualRatePercent: 0, emiMinor: 5_000 });
    const b = makeLoan({ loanId: "b", balanceMinor: 5_000, annualRatePercent: 0, emiMinor: 5_000 });
    const result = simulatePayoffPlan({ loans: [a, b], strategy: "AVALANCHE", planStartMonth: planStart });
    expect(result.totalMonths).toBe(1);
    expect(result.loanClosures).toHaveLength(2);
  });

  it("reports neverPaysOff instead of looping forever when EMIs can't cover interest", () => {
    const badLoan = makeLoan({ loanId: "bad", balanceMinor: 1_000_000, annualRatePercent: 36, emiMinor: 10_000 });
    const result = simulatePayoffPlan({ loans: [badLoan], strategy: "AVALANCHE", planStartMonth: planStart, maxMonths: 24 });
    expect(result.neverPaysOff).toBe(true);
    expect(result.debtFreeDate).toBeNull();
  });
});
