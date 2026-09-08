"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import { fromMinorUnits } from "@/lib/money";
import { getBudgetVsActual } from "@/lib/actions/budget";
import { getPayoffScenario } from "@/lib/actions/payoffScenarios";
import { formatDateOnly } from "@/lib/dates";

export async function exportExpensesCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.expenseTransaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });
  return toCsv(
    ["Date", "Name", "Category", "Account", "Amount", "Status", "Essential/Discretionary", "Merchant", "Notes"],
    rows.map((r) => [
      formatDateOnly(new Date(r.date)),
      r.name,
      r.category?.name ?? "",
      r.account.name,
      fromMinorUnits(r.amountMinor),
      r.status,
      r.essentialType,
      r.merchant ?? "",
      r.notes ?? "",
    ])
  );
}

export async function exportIncomeCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.incomeTransaction.findMany({ where: { userId }, orderBy: { expectedDate: "desc" } });
  return toCsv(
    ["Expected Date", "Source", "Category", "Planned Amount", "Actual Amount", "Status"],
    rows.map((r) => [
      formatDateOnly(new Date(r.expectedDate)),
      r.sourceName,
      r.category,
      fromMinorUnits(r.plannedAmountMinor),
      r.actualAmountMinor != null ? fromMinorUnits(r.actualAmountMinor) : "",
      r.status,
    ])
  );
}

export async function exportLoanSummaryCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.loan.findMany({ where: { userId }, orderBy: { annualInterestRatePercent: "desc" } });
  return toCsv(
    ["Name", "Lender", "Type", "Outstanding", "Rate %", "EMI", "Remaining Tenure (mo)", "Status"],
    rows.map((r) => [
      r.name,
      r.lender,
      r.loanType,
      fromMinorUnits(r.currentOutstandingPrincipalMinor),
      r.annualInterestRatePercent,
      fromMinorUnits(r.currentEmiMinor),
      r.remainingTenureMonths,
      r.status,
    ])
  );
}

export async function exportLoanPaymentsCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.loanPayment.findMany({ where: { userId }, include: { loan: true }, orderBy: { paymentDate: "desc" } });
  return toCsv(
    ["Date", "Loan", "Total", "Principal", "Interest", "Fee", "Extra", "Balance After"],
    rows.map((r) => [
      formatDateOnly(new Date(r.paymentDate)),
      r.loan.name,
      fromMinorUnits(r.totalAmountMinor),
      fromMinorUnits(r.principalMinor),
      fromMinorUnits(r.interestMinor),
      fromMinorUnits(r.feeMinor),
      fromMinorUnits(r.extraAmountMinor),
      r.outstandingBalanceAfterMinor != null ? fromMinorUnits(r.outstandingBalanceAfterMinor) : "",
    ])
  );
}

export async function exportSipContributionsCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.investmentContribution.findMany({ where: { userId }, include: { investment: true }, orderBy: { date: "desc" } });
  return toCsv(
    ["Date", "Investment", "Amount"],
    rows.map((r) => [formatDateOnly(new Date(r.date)), r.investment.name, fromMinorUnits(r.amountMinor)])
  );
}

export async function exportEmergencyFundTransactionsCsv(): Promise<string> {
  const userId = await requireUserId();
  const rows = await prisma.emergencyFundTransaction.findMany({ where: { userId }, include: { emergencyFund: true }, orderBy: { date: "desc" } });
  return toCsv(
    ["Date", "Fund", "Type", "Amount", "Reason"],
    rows.map((r) => [formatDateOnly(new Date(r.date)), r.emergencyFund.name, r.type, fromMinorUnits(r.amountMinor), r.reason ?? ""])
  );
}

export async function exportBudgetVsActualCsv(year: number, month: number): Promise<string> {
  const summary = await getBudgetVsActual(year, month);
  if (!summary) return toCsv(["No budget found for this month"], []);
  return toCsv(
    ["Category", "Planned", "Actual", "Pending", "Remaining", "% Used", "Status"],
    summary.rows.map((r) => [
      r.categoryName,
      fromMinorUnits(r.budgetedMinor),
      fromMinorUnits(r.actualPaidMinor),
      fromMinorUnits(r.pendingMinor),
      fromMinorUnits(r.remainingMinor),
      r.percentUsed.toFixed(1),
      r.status,
    ])
  );
}

export async function exportPayoffScheduleCsv(scenarioId: string): Promise<string> {
  const scenario = await getPayoffScenario(scenarioId);
  return toCsv(
    ["Month", "Date", "Loan", "Opening Balance", "Interest", "Principal", "Extra Payment", "Closing Balance", "Closed"],
    scenario.scheduleEntries.map((e) => {
      const loanName = scenario.scenarioLoans.find((sl) => sl.loanId === e.loanId)?.loan.name ?? e.loanId;
      return [
        e.monthIndex,
        formatDateOnly(new Date(e.date)),
        loanName,
        fromMinorUnits(e.openingBalanceMinor),
        fromMinorUnits(e.interestMinor),
        fromMinorUnits(e.principalMinor),
        fromMinorUnits(e.extraPaymentMinor),
        fromMinorUnits(e.closingBalanceMinor),
        e.isClosed ? "Yes" : "No",
      ];
    })
  );
}
