import { roundHalfAwayFromZero } from "@/lib/money";

/**
 * Loan amortization conventions used throughout this module:
 *
 * - Reducing-balance amortization: interest for a period is charged on the
 *   outstanding principal at the START of that period.
 * - Payments are applied at the END of each monthly period, after that
 *   month's interest has accrued. This is the standard bank-EMI convention
 *   and is used consistently across every projection (single-loan
 *   amortization, the debt-payoff simulator, and cash-flow forecasting).
 * - All amounts are integer minor units in and out. Internally we compute
 *   with floating point (the EMI formula requires exponentiation) and round
 *   to the nearest minor unit only at the point a figure is returned.
 */

export function monthlyRateFromAnnualPercent(annualRatePercent: number): number {
  return annualRatePercent / 12 / 100;
}

/**
 * Standard reducing-balance EMI formula:
 *   EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * Falls back to simple division for zero-interest loans.
 */
export function calculateEmiMinor(
  principalMinor: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (tenureMonths <= 0 || principalMinor <= 0) return Math.max(0, principalMinor);

  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  if (r === 0) {
    return roundHalfAwayFromZero(principalMinor / tenureMonths);
  }

  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principalMinor * r * factor) / (factor - 1);
  return roundHalfAwayFromZero(emi);
}

/**
 * Solve for remaining tenure (in months) given a fixed EMI.
 * Returns null when the EMI does not even cover one period's interest —
 * the loan can never amortize at that payment amount.
 */
export function calculateTenureMonths(
  principalMinor: number,
  annualRatePercent: number,
  emiMinor: number
): number | null {
  if (principalMinor <= 0) return 0;
  if (emiMinor <= 0) return null;

  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  if (r === 0) {
    return Math.ceil(principalMinor / emiMinor);
  }

  const interestPerPeriod = principalMinor * r;
  if (emiMinor <= interestPerPeriod) return null; // never amortizes

  const n = -Math.log(1 - interestPerPeriod / emiMinor) / Math.log(1 + r);
  return Math.ceil(n);
}

export interface LoanWarning {
  code:
    | "EMI_BELOW_INTEREST"
    | "EMI_EXCEEDS_BALANCE"
    | "TENURE_MISMATCH"
    | "INCOMPLETE_DATA"
    | "FLOATING_RATE_UNCERTAINTY";
  message: string;
}

export function detectLoanWarnings(params: {
  principalMinor: number;
  annualRatePercent: number;
  emiMinor: number;
  remainingTenureMonths: number;
  rateType: "FIXED" | "FLOATING";
}): LoanWarning[] {
  const warnings: LoanWarning[] = [];
  const { principalMinor, annualRatePercent, emiMinor, remainingTenureMonths, rateType } = params;

  if (!principalMinor || !emiMinor || !remainingTenureMonths) {
    warnings.push({
      code: "INCOMPLETE_DATA",
      message: "Loan information is incomplete, so projections may be inaccurate.",
    });
    return warnings;
  }

  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  const interestPerPeriod = principalMinor * r;
  if (r > 0 && emiMinor <= interestPerPeriod) {
    warnings.push({
      code: "EMI_BELOW_INTEREST",
      message:
        "This EMI does not cover the monthly interest — the outstanding balance will never reduce at this payment amount.",
    });
  }

  if (emiMinor > principalMinor && remainingTenureMonths > 1) {
    warnings.push({
      code: "EMI_EXCEEDS_BALANCE",
      message: "The EMI is larger than the outstanding balance; this loan should close on its next payment.",
    });
  }

  const impliedTenure = calculateTenureMonths(principalMinor, annualRatePercent, emiMinor);
  if (impliedTenure != null && Math.abs(impliedTenure - remainingTenureMonths) > 2) {
    warnings.push({
      code: "TENURE_MISMATCH",
      message: `Based on the EMI and rate entered, this loan should take about ${impliedTenure} more month(s), not ${remainingTenureMonths}. Double-check the entered values.`,
    });
  }

  if (rateType === "FLOATING") {
    warnings.push({
      code: "FLOATING_RATE_UNCERTAINTY",
      message:
        "This is a floating-rate loan — future interest changes are not known in advance, so this projection is only an estimate at the current rate.",
    });
  }

  return warnings;
}

export interface AmortizationRow {
  monthIndex: number; // 1-based
  openingBalanceMinor: number;
  interestMinor: number;
  principalMinor: number;
  paymentMinor: number;
  closingBalanceMinor: number;
}

export interface AmortizationResult {
  rows: AmortizationRow[];
  totalInterestMinor: number;
  totalPrincipalMinor: number;
  neverAmortizes: boolean;
  monthsToPayoff: number;
}

/**
 * Simulate a single loan's amortization month by month, rather than using a
 * closed-form estimate — this is required to correctly handle a final
 * partial payment, mid-schedule EMI changes are handled by the caller
 * re-invoking this function with the new EMI/balance from that point.
 */
export function generateAmortizationSchedule(params: {
  principalMinor: number;
  annualRatePercent: number;
  emiMinor: number;
  maxMonths?: number;
}): AmortizationResult {
  const { principalMinor, annualRatePercent, emiMinor, maxMonths = 1200 } = params;
  const r = monthlyRateFromAnnualPercent(annualRatePercent);

  const rows: AmortizationRow[] = [];
  let balance = principalMinor;
  let totalInterest = 0;
  let totalPrincipal = 0;

  if (balance <= 0) {
    return { rows, totalInterestMinor: 0, totalPrincipalMinor: 0, neverAmortizes: false, monthsToPayoff: 0 };
  }

  for (let month = 1; month <= maxMonths; month++) {
    const interest = roundHalfAwayFromZero(balance * r);

    if (emiMinor <= interest && interest > 0) {
      // This EMI can never pay down the principal — stop simulating to
      // avoid an infinite loop and surface it to the caller.
      return {
        rows,
        totalInterestMinor: totalInterest,
        totalPrincipalMinor: totalPrincipal,
        neverAmortizes: true,
        monthsToPayoff: -1,
      };
    }

    const opening = balance;
    let principalComponent = emiMinor - interest;
    let payment = emiMinor;

    if (principalComponent >= balance) {
      // Final, possibly-smaller payment.
      principalComponent = balance;
      payment = balance + interest;
      balance = 0;
    } else {
      balance -= principalComponent;
    }

    totalInterest += interest;
    totalPrincipal += principalComponent;

    rows.push({
      monthIndex: month,
      openingBalanceMinor: opening,
      interestMinor: interest,
      principalMinor: principalComponent,
      paymentMinor: payment,
      closingBalanceMinor: balance,
    });

    if (balance <= 0) {
      return {
        rows,
        totalInterestMinor: totalInterest,
        totalPrincipalMinor: totalPrincipal,
        neverAmortizes: false,
        monthsToPayoff: month,
      };
    }
  }

  return {
    rows,
    totalInterestMinor: totalInterest,
    totalPrincipalMinor: totalPrincipal,
    neverAmortizes: false,
    monthsToPayoff: -1, // did not close within maxMonths
  };
}

export function emiAsPercentOfIncome(emiMinor: number, monthlyIncomeMinor: number): number {
  if (monthlyIncomeMinor <= 0) return 0;
  return (emiMinor / monthlyIncomeMinor) * 100;
}
