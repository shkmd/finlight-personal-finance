"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { loanSchema, loanPaymentSchema, type LoanInput, type LoanPaymentInput } from "@/lib/validations/loans";
import { toMinorUnits } from "@/lib/money";
import { calculateTenureMonths } from "@/lib/finance/emi";
import { addMonthsUtc } from "@/lib/dates";

export async function listLoans(includeArchived = false) {
  const userId = await requireUserId();
  return prisma.loan.findMany({
    where: { userId, ...(includeArchived ? {} : { status: { not: "ARCHIVED" } }) },
    orderBy: [{ status: "asc" }, { annualInterestRatePercent: "desc" }],
  });
}

export async function getLoan(id: string) {
  const userId = await requireUserId();
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { payments: { orderBy: { paymentDate: "desc" } } },
  });
  if (!loan || loan.userId !== userId) throw new Error("Loan not found.");
  return loan;
}

export async function createLoan(input: LoanInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = loanSchema.parse(input);

    const loan = await prisma.loan.create({
      data: {
        userId,
        name: data.name,
        lender: data.lender,
        loanType: data.loanType,
        originalPrincipalMinor: toMinorUnits(data.originalPrincipal),
        currentOutstandingPrincipalMinor: toMinorUnits(data.currentOutstandingPrincipal),
        annualInterestRatePercent: data.annualInterestRatePercent,
        rateType: data.rateType,
        currentEmiMinor: toMinorUnits(data.currentEmi),
        originalTenureMonths: data.originalTenureMonths,
        remainingTenureMonths: data.remainingTenureMonths,
        startDate: data.startDate,
        nextPaymentDate: data.nextPaymentDate,
        emiPaymentDay: data.emiPaymentDay ?? null,
        lenderClosureDate: data.lenderClosureDate ?? null,
        prepaymentChargePercent: data.prepaymentChargePercent ?? null,
        foreclosureChargePercent: data.foreclosureChargePercent ?? null,
        notes: data.notes || null,
        status: data.status,
      },
    });
    revalidatePath("/loans");
    revalidatePath("/debt-planner");
    revalidatePath("/dashboard");
    return { id: loan.id };
  });
}

export async function updateLoan(id: string, input: LoanInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Loan not found.");

    const data = loanSchema.parse(input);
    await prisma.loan.update({
      where: { id },
      data: {
        name: data.name,
        lender: data.lender,
        loanType: data.loanType,
        originalPrincipalMinor: toMinorUnits(data.originalPrincipal),
        currentOutstandingPrincipalMinor: toMinorUnits(data.currentOutstandingPrincipal),
        annualInterestRatePercent: data.annualInterestRatePercent,
        rateType: data.rateType,
        currentEmiMinor: toMinorUnits(data.currentEmi),
        originalTenureMonths: data.originalTenureMonths,
        remainingTenureMonths: data.remainingTenureMonths,
        startDate: data.startDate,
        nextPaymentDate: data.nextPaymentDate,
        emiPaymentDay: data.emiPaymentDay ?? null,
        lenderClosureDate: data.lenderClosureDate ?? null,
        prepaymentChargePercent: data.prepaymentChargePercent ?? null,
        foreclosureChargePercent: data.foreclosureChargePercent ?? null,
        notes: data.notes || null,
        status: data.status,
      },
    });
    revalidatePath("/loans");
    revalidatePath("/debt-planner");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function archiveLoan(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("Loan not found.");
    await prisma.loan.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/loans");
    return { id };
  });
}

export async function recordLoanPayment(loanId: string, input: LoanPaymentInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error("Loan not found.");

    const data = loanPaymentSchema.parse(input);
    if (data.accountId) {
      const account = await prisma.financialAccount.findUnique({ where: { id: data.accountId } });
      if (!account || account.userId !== userId) throw new Error("Account not found.");
    }

    const totalMinor = toMinorUnits(data.totalAmount);
    const principalMinor = toMinorUnits(data.principal);
    const interestMinor = toMinorUnits(data.interest);
    const feeMinor = toMinorUnits(data.fee);
    const extraMinor = toMinorUnits(data.extraAmount);

    // A recorded lender balance is the latest source of truth; otherwise
    // derive the new balance from the principal + extra paid down.
    const newBalanceMinor =
      data.outstandingBalanceAfter != null
        ? toMinorUnits(data.outstandingBalanceAfter)
        : Math.max(0, loan.currentOutstandingPrincipalMinor - principalMinor - extraMinor);

    const impliedTenure = calculateTenureMonths(newBalanceMinor, loan.annualInterestRatePercent, loan.currentEmiMinor);
    const newRemainingTenure =
      newBalanceMinor <= 0 ? 0 : impliedTenure != null ? impliedTenure : Math.max(0, loan.remainingTenureMonths - 1);

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.loanPayment.create({
        data: {
          loanId,
          userId,
          paymentDate: data.paymentDate,
          totalAmountMinor: totalMinor,
          principalMinor,
          interestMinor,
          feeMinor,
          extraAmountMinor: extraMinor,
          outstandingBalanceAfterMinor: newBalanceMinor,
          accountId: data.accountId || null,
          notes: data.notes || null,
        },
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          currentOutstandingPrincipalMinor: newBalanceMinor,
          remainingTenureMonths: newRemainingTenure,
          nextPaymentDate: addMonthsUtc(loan.nextPaymentDate, 1),
          status: newBalanceMinor <= 0 ? "PAID_OFF" : loan.status,
        },
      });

      if (data.accountId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalanceMinor: { decrement: totalMinor } },
        });
      }

      return created;
    });

    revalidatePath("/loans");
    revalidatePath("/debt-planner");
    revalidatePath("/dashboard");
    return { id: payment.id };
  });
}
