import { describe, expect, it } from "vitest";
import {
  calculateEmiMinor,
  calculateTenureMonths,
  detectLoanWarnings,
  generateAmortizationSchedule,
} from "./emi";

describe("calculateEmiMinor", () => {
  it("matches the well-known ₹1,00,000 @ 12% for 12 months example (~₹8,884.88 EMI)", () => {
    const emi = calculateEmiMinor(100_000 * 100, 12, 12);
    expect(emi).toBeGreaterThanOrEqual(888_487);
    expect(emi).toBeLessThanOrEqual(888_489);
  });

  it("handles zero-interest loans as simple division", () => {
    const emi = calculateEmiMinor(1_200_00, 0, 12);
    expect(emi).toBe(100_00);
  });

  it("returns the full balance when tenure is zero or negative", () => {
    expect(calculateEmiMinor(50_000, 10, 0)).toBe(50_000);
  });
});

describe("calculateTenureMonths", () => {
  it("inverts the EMI formula back to ~12 months", () => {
    const principal = 100_000 * 100;
    const emi = calculateEmiMinor(principal, 12, 12);
    const tenure = calculateTenureMonths(principal, 12, emi);
    expect(tenure).toBe(12);
  });

  it("returns null when the EMI does not cover monthly interest", () => {
    // 24%/yr => 2%/month interest on 10,00,000 paise-equiv = 20,000; EMI of 15,000 can never amortize.
    const tenure = calculateTenureMonths(1_000_000, 24, 15_000);
    expect(tenure).toBeNull();
  });

  it("handles zero-interest loans via simple division, rounding up", () => {
    expect(calculateTenureMonths(10_000, 0, 3_000)).toBe(4);
  });
});

describe("detectLoanWarnings", () => {
  it("flags an EMI that cannot cover interest", () => {
    const warnings = detectLoanWarnings({
      principalMinor: 1_000_000,
      annualRatePercent: 24,
      emiMinor: 15_000,
      remainingTenureMonths: 24,
      rateType: "FIXED",
    });
    expect(warnings.some((w) => w.code === "EMI_BELOW_INTEREST")).toBe(true);
  });

  it("flags floating-rate loans as uncertain", () => {
    const warnings = detectLoanWarnings({
      principalMinor: 1_000_000,
      annualRatePercent: 9,
      emiMinor: 50_000,
      remainingTenureMonths: 24,
      rateType: "FLOATING",
    });
    expect(warnings.some((w) => w.code === "FLOATING_RATE_UNCERTAINTY")).toBe(true);
  });

  it("flags incomplete data instead of crashing on missing fields", () => {
    const warnings = detectLoanWarnings({
      principalMinor: 0,
      annualRatePercent: 10,
      emiMinor: 0,
      remainingTenureMonths: 0,
      rateType: "FIXED",
    });
    expect(warnings.some((w) => w.code === "INCOMPLETE_DATA")).toBe(true);
  });
});

describe("generateAmortizationSchedule", () => {
  it("fully amortizes ₹1,00,000 @ 12% over exactly 12 months", () => {
    const principal = 100_000 * 100;
    const emi = calculateEmiMinor(principal, 12, 12);
    const result = generateAmortizationSchedule({ principalMinor: principal, annualRatePercent: 12, emiMinor: emi });

    expect(result.neverAmortizes).toBe(false);
    expect(result.monthsToPayoff).toBe(12);
    expect(result.rows).toHaveLength(12);
    expect(result.rows[11].closingBalanceMinor).toBe(0);

    // Total paid should equal principal + interest, within a few paise of rounding.
    const totalPaid = result.rows.reduce((s, r) => s + r.paymentMinor, 0);
    expect(Math.abs(totalPaid - (result.totalInterestMinor + result.totalPrincipalMinor))).toBeLessThanOrEqual(2);
  });

  it("produces a smaller final payment when the last installment is partial", () => {
    // Deliberately pick an EMI slightly larger than what's needed so the
    // final month pays off a partial amount smaller than the regular EMI.
    const principal = 10_000_00;
    const emi = 1_050_00;
    const result = generateAmortizationSchedule({ principalMinor: principal, annualRatePercent: 12, emiMinor: emi });
    const last = result.rows[result.rows.length - 1];
    expect(last.paymentMinor).toBeLessThan(emi);
    expect(last.closingBalanceMinor).toBe(0);
  });

  it("flags loans that can never amortize instead of looping forever", () => {
    const result = generateAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRatePercent: 24,
      emiMinor: 15_000,
      maxMonths: 50,
    });
    expect(result.neverAmortizes).toBe(true);
    expect(result.monthsToPayoff).toBe(-1);
  });

  it("handles an already-zero balance", () => {
    const result = generateAmortizationSchedule({ principalMinor: 0, annualRatePercent: 10, emiMinor: 5000 });
    expect(result.rows).toHaveLength(0);
    expect(result.monthsToPayoff).toBe(0);
  });
});
