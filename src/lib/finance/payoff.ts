import { roundHalfAwayFromZero } from "@/lib/money";
import { monthlyRateFromAnnualPercent } from "@/lib/finance/emi";
import { addMonthsUtc } from "@/lib/dates";

export type PayoffStrategyKind = "AVALANCHE" | "SNOWBALL" | "SHORTEST_TENURE" | "CUSTOM";

export interface PayoffLoanInput {
  loanId: string;
  name: string;
  balanceMinor: number;
  annualRatePercent: number;
  emiMinor: number;
  prepaymentChargePercent?: number | null;
  foreclosureChargePercent?: number | null;
}

export interface PayoffScenarioInput {
  loans: PayoffLoanInput[];
  strategy: PayoffStrategyKind;
  /** Required for CUSTOM strategy: loanId order, highest priority first. */
  customOrder?: string[];
  extraMonthlyAmountMinor?: number;
  /** Extra monthly amount grows by this percent every 12 months. */
  annualIncreasePercent?: number;
  lumpSumAmountMinor?: number;
  /** 1-based month index the lump sum is applied in. */
  lumpSumMonthIndex?: number;
  planStartMonth: Date;
  maxMonths?: number;
}

export interface PayoffMonthLoanEntry {
  loanId: string;
  monthIndex: number;
  date: Date;
  openingBalanceMinor: number;
  interestMinor: number;
  regularPrincipalMinor: number;
  extraPaymentMinor: number;
  closingBalanceMinor: number;
  isClosed: boolean;
  foreclosureChargeMinor: number;
}

export interface PayoffLoanClosure {
  loanId: string;
  name: string;
  closureMonthIndex: number;
  closureDate: Date;
  emiReleasedMinor: number;
}

export interface PayoffSimulationResult {
  schedule: PayoffMonthLoanEntry[];
  loanClosures: PayoffLoanClosure[];
  payoffOrder: string[];
  totalMonths: number;
  totalInterestMinor: number;
  totalPrincipalMinor: number;
  totalExtraContributedMinor: number;
  totalPrepaymentChargesMinor: number;
  totalForeclosureChargesMinor: number;
  debtFreeDate: Date | null;
  neverPaysOff: boolean;
}

function orderLoans(loans: PayoffLoanInput[], strategy: PayoffStrategyKind, customOrder?: string[]): string[] {
  const ids = loans.map((l) => l.loanId);
  switch (strategy) {
    case "AVALANCHE":
      return [...loans]
        .sort((a, b) => b.annualRatePercent - a.annualRatePercent || a.loanId.localeCompare(b.loanId))
        .map((l) => l.loanId);
    case "SNOWBALL":
      return [...loans]
        .sort((a, b) => a.balanceMinor - b.balanceMinor || a.loanId.localeCompare(b.loanId))
        .map((l) => l.loanId);
    case "SHORTEST_TENURE": {
      const withTenure = loans.map((l) => {
        const r = monthlyRateFromAnnualPercent(l.annualRatePercent);
        const interestPerPeriod = l.balanceMinor * r;
        const canAmortize = l.emiMinor > interestPerPeriod || r === 0;
        let tenure = Number.POSITIVE_INFINITY;
        if (canAmortize && l.emiMinor > 0) {
          tenure =
            r === 0
              ? Math.ceil(l.balanceMinor / l.emiMinor)
              : -Math.log(1 - interestPerPeriod / l.emiMinor) / Math.log(1 + r);
        }
        return { id: l.loanId, tenure };
      });
      return withTenure.sort((a, b) => a.tenure - b.tenure).map((l) => l.id);
    }
    case "CUSTOM":
      if (customOrder && customOrder.length) {
        const remaining = ids.filter((id) => !customOrder.includes(id));
        return [...customOrder.filter((id) => ids.includes(id)), ...remaining];
      }
      return ids;
    default:
      return ids;
  }
}

/**
 * Simulate a multi-loan accelerated payoff plan month by month.
 *
 * Each month: accrue interest on every active loan, apply each loan's own
 * EMI, then cascade any extra payment (scenario extra + released EMIs from
 * loans already closed + a one-time lump sum) down the priority order,
 * overflowing into the next loan the moment one closes — all within the
 * same month, per the spec's redistribution rule.
 */
export function simulatePayoffPlan(input: PayoffScenarioInput): PayoffSimulationResult {
  const maxMonths = input.maxMonths ?? 600;
  const order = orderLoans(input.loans, input.strategy, input.customOrder);

  const balances = new Map(input.loans.map((l) => [l.loanId, l.balanceMinor]));
  const closed = new Map(input.loans.map((l) => [l.loanId, false]));
  const meta = new Map(input.loans.map((l) => [l.loanId, l]));

  const schedule: PayoffMonthLoanEntry[] = [];
  const loanClosures: PayoffLoanClosure[] = [];

  let releasedEmiPoolMinor = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtraContributed = 0;
  let totalPrepaymentCharges = 0;
  let totalForeclosureCharges = 0;

  let monthIndex = 0;
  const baseExtra = input.extraMonthlyAmountMinor ?? 0;
  const annualIncreasePct = input.annualIncreasePercent ?? 0;

  while (monthIndex < maxMonths && ![...closed.values()].every(Boolean)) {
    monthIndex += 1;
    const date = addMonthsUtc(input.planStartMonth, monthIndex - 1);

    const yearsElapsed = Math.floor((monthIndex - 1) / 12);
    const growth = Math.pow(1 + annualIncreasePct / 100, yearsElapsed);
    let extraPool = roundHalfAwayFromZero(baseExtra * growth) + releasedEmiPoolMinor;

    if (input.lumpSumAmountMinor && input.lumpSumMonthIndex === monthIndex) {
      extraPool += input.lumpSumAmountMinor;
    }

    // Step 1 & 2: accrue interest and apply each loan's own EMI.
    const monthEntries = new Map<string, PayoffMonthLoanEntry>();
    for (const loan of input.loans) {
      if (closed.get(loan.loanId)) continue;
      const opening = balances.get(loan.loanId)!;
      const r = monthlyRateFromAnnualPercent(loan.annualRatePercent);
      const interest = roundHalfAwayFromZero(opening * r);

      let regularPrincipal = Math.max(0, loan.emiMinor - interest);
      let closing = opening - regularPrincipal;
      if (regularPrincipal >= opening) {
        regularPrincipal = opening;
        closing = 0;
      }

      monthEntries.set(loan.loanId, {
        loanId: loan.loanId,
        monthIndex,
        date,
        openingBalanceMinor: opening,
        interestMinor: interest,
        regularPrincipalMinor: regularPrincipal,
        extraPaymentMinor: 0,
        closingBalanceMinor: closing,
        isClosed: closing <= 0,
        foreclosureChargeMinor: 0,
      });

      balances.set(loan.loanId, closing);
      totalInterest += interest;
      totalPrincipal += regularPrincipal;

      if (closing <= 0 && !closed.get(loan.loanId)) {
        closed.set(loan.loanId, true);
        loanClosures.push({
          loanId: loan.loanId,
          name: loan.name,
          closureMonthIndex: monthIndex,
          closureDate: date,
          emiReleasedMinor: loan.emiMinor,
        });
        releasedEmiPoolMinor += loan.emiMinor;
      }
    }

    // Step 3-7: cascade the extra pool down the priority order, within
    // this same month, overflowing to the next loan as each one closes.
    let remainingExtra = extraPool;
    for (const loanId of order) {
      if (remainingExtra <= 0) break;
      if (closed.get(loanId)) continue;

      const entry = monthEntries.get(loanId);
      if (!entry) continue;
      const balanceAfterRegular = entry.closingBalanceMinor;
      if (balanceAfterRegular <= 0) continue;

      const applied = Math.min(remainingExtra, balanceAfterRegular);
      entry.extraPaymentMinor += applied;
      entry.closingBalanceMinor = balanceAfterRegular - applied;
      remainingExtra -= applied;
      totalPrincipal += applied;
      totalExtraContributed += applied;

      const loanConfig = meta.get(loanId)!;
      if (applied > 0 && loanConfig.prepaymentChargePercent) {
        totalPrepaymentCharges += roundHalfAwayFromZero(
          (applied * loanConfig.prepaymentChargePercent) / 100
        );
      }

      balances.set(loanId, entry.closingBalanceMinor);

      if (entry.closingBalanceMinor <= 0 && !closed.get(loanId)) {
        closed.set(loanId, true);
        entry.isClosed = true;
        if (loanConfig.foreclosureChargePercent) {
          entry.foreclosureChargeMinor = roundHalfAwayFromZero(
            (balanceAfterRegular * loanConfig.foreclosureChargePercent) / 100
          );
          totalForeclosureCharges += entry.foreclosureChargeMinor;
        }
        loanClosures.push({
          loanId,
          name: loanConfig.name,
          closureMonthIndex: monthIndex,
          closureDate: date,
          emiReleasedMinor: loanConfig.emiMinor,
        });
        releasedEmiPoolMinor += loanConfig.emiMinor;
      }
    }

    schedule.push(...monthEntries.values());
  }

  const allClosed = [...closed.values()].every(Boolean);
  const debtFreeDate = allClosed ? addMonthsUtc(input.planStartMonth, monthIndex - 1) : null;

  return {
    schedule,
    loanClosures,
    payoffOrder: loanClosures.map((c) => c.loanId),
    totalMonths: allClosed ? monthIndex : -1,
    totalInterestMinor: totalInterest,
    totalPrincipalMinor: totalPrincipal,
    totalExtraContributedMinor: totalExtraContributed,
    totalPrepaymentChargesMinor: totalPrepaymentCharges,
    totalForeclosureChargesMinor: totalForeclosureCharges,
    debtFreeDate,
    neverPaysOff: !allClosed,
  };
}

export function simulateMinimumPaymentsBaseline(
  loans: PayoffLoanInput[],
  planStartMonth: Date,
  maxMonths = 600
): PayoffSimulationResult {
  // With zero extra payment the cascading logic never redirects anything,
  // so the baseline is mathematically identical to running each loan
  // independently — this keeps the "no acceleration" comparison cheap and
  // strategy-agnostic (order doesn't matter when nothing overflows).
  return simulatePayoffPlan({
    loans,
    strategy: "CUSTOM",
    customOrder: loans.map((l) => l.loanId),
    extraMonthlyAmountMinor: 0,
    planStartMonth,
    maxMonths,
  });
}

export interface PayoffComparison {
  baseline: PayoffSimulationResult;
  accelerated: PayoffSimulationResult;
  monthsSaved: number;
  interestSavedMinor: number;
  netInterestSavedMinor: number;
}

export function comparePayoffPlans(
  baseline: PayoffSimulationResult,
  accelerated: PayoffSimulationResult
): PayoffComparison {
  const monthsSaved =
    baseline.totalMonths >= 0 && accelerated.totalMonths >= 0
      ? baseline.totalMonths - accelerated.totalMonths
      : 0;
  const interestSavedMinor = baseline.totalInterestMinor - accelerated.totalInterestMinor;
  const netInterestSavedMinor =
    interestSavedMinor - accelerated.totalPrepaymentChargesMinor - accelerated.totalForeclosureChargesMinor;

  return { baseline, accelerated, monthsSaved, interestSavedMinor, netInterestSavedMinor };
}
