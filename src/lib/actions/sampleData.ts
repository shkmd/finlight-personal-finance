"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { toMinorUnits } from "@/lib/money";
import { calculateEmiMinor } from "@/lib/finance/emi";
import { utcDateOnly, currentYearMonth } from "@/lib/dates";

export async function hasSampleData(): Promise<boolean> {
  const userId = await requireUserId();
  const count = await prisma.financialAccount.count({ where: { userId, isSampleData: true } });
  return count > 0;
}

export async function generateSampleData(): Promise<ActionResult<{ created: boolean }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.financialAccount.count({ where: { userId, isSampleData: true } });
    if (existing > 0) throw new Error("Sample data already exists. Clear it first to regenerate.");

    const categories = await prisma.budgetCategory.findMany({ where: { userId } });
    const byName = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

    const { year, month } = currentYearMonth();
    const today = new Date();

    await prisma.$transaction(async (tx) => {
      const bank = await tx.financialAccount.create({
        data: {
          userId,
          name: "HDFC Savings",
          type: "BANK",
          institution: "HDFC Bank",
          openingBalanceMinor: toMinorUnits(150_000),
          currentBalanceMinor: toMinorUnits(150_000),
          isSampleData: true,
        },
      });
      const creditCard = await tx.financialAccount.create({
        data: {
          userId,
          name: "Sample Credit Card",
          type: "CREDIT_CARD",
          institution: "ICICI Bank",
          openingBalanceMinor: 0,
          currentBalanceMinor: toMinorUnits(8_500),
          creditLimitMinor: toMinorUnits(150_000),
          statementDay: 20,
          paymentDueDay: 5,
          isSampleData: true,
        },
      });
      const cash = await tx.financialAccount.create({
        data: { userId, name: "Cash Wallet", type: "CASH", currentBalanceMinor: toMinorUnits(3_000), isSampleData: true },
      });

      await tx.incomeTransaction.create({
        data: {
          userId,
          sourceName: "Monthly Salary",
          category: "SALARY",
          plannedAmountMinor: toMinorUnits(85_000),
          actualAmountMinor: toMinorUnits(85_000),
          expectedDate: utcDateOnly(year, month - 1, 1),
          receivedDate: utcDateOnly(year, month - 1, 1),
          accountId: bank.id,
          isRecurring: true,
          status: "RECEIVED",
          isSampleData: true,
        },
      });
      await tx.incomeTransaction.create({
        data: {
          userId,
          sourceName: "Freelance Project",
          category: "FREELANCE",
          plannedAmountMinor: toMinorUnits(15_000),
          actualAmountMinor: null,
          expectedDate: utcDateOnly(year, month - 1, 25),
          accountId: bank.id,
          status: "EXPECTED",
          isSampleData: true,
        },
      });

      const expenseSeeds: Array<{ day: number; name: string; category: string; amount: number; essential: boolean; accountId: string; merchant?: string }> = [
        { day: 2, name: "Rent", category: "Rent", amount: 22000, essential: true, accountId: bank.id, merchant: "Landlord" },
        { day: 3, name: "Grocery run", category: "Groceries", amount: 3200, essential: true, accountId: creditCard.id, merchant: "BigBasket" },
        { day: 4, name: "Electricity bill", category: "Electricity", amount: 1800, essential: true, accountId: bank.id, merchant: "State Electricity Board" },
        { day: 5, name: "Mobile recharge", category: "Mobile", amount: 599, essential: true, accountId: bank.id, merchant: "Jio" },
        { day: 6, name: "Petrol", category: "Fuel", amount: 2500, essential: true, accountId: cash.id, merchant: "HP Petrol Pump" },
        { day: 8, name: "Dinner out", category: "Dining", amount: 1450, essential: false, accountId: creditCard.id, merchant: "The Table" },
        { day: 10, name: "Movie night", category: "Entertainment", amount: 900, essential: false, accountId: creditCard.id, merchant: "PVR Cinemas" },
        { day: 12, name: "Grocery run", category: "Groceries", amount: 2800, essential: true, accountId: creditCard.id, merchant: "BigBasket" },
        { day: 14, name: "Internet bill", category: "Internet", amount: 999, essential: true, accountId: bank.id, merchant: "ACT Fibernet" },
        { day: 15, name: "Streaming subscription", category: "Subscriptions", amount: 649, essential: false, accountId: creditCard.id, merchant: "Netflix" },
        { day: 18, name: "New shoes", category: "Shopping", amount: 3500, essential: false, accountId: creditCard.id, merchant: "Myntra" },
        { day: 20, name: "Doctor visit", category: "Medical", amount: 800, essential: true, accountId: cash.id, merchant: "Apollo Clinic" },
      ];

      for (const seed of expenseSeeds) {
        const day = Math.min(seed.day, 28);
        await tx.expenseTransaction.create({
          data: {
            userId,
            date: utcDateOnly(year, month - 1, day),
            amountMinor: toMinorUnits(seed.amount),
            name: seed.name,
            categoryId: byName(seed.category),
            accountId: seed.accountId,
            merchant: seed.merchant ?? null,
            essentialType: seed.essential ? "ESSENTIAL" : "DISCRETIONARY",
            status: day <= today.getUTCDate() ? "PAID" : "PENDING",
            isSampleData: true,
          },
        });
      }

      const loanPrincipal = toMinorUnits(500_000);
      const loanRate = 11.5;
      const loanTenure = 36;
      const emi = calculateEmiMinor(loanPrincipal, loanRate, loanTenure);
      const loan = await tx.loan.create({
        data: {
          userId,
          name: "Personal Loan",
          lender: "Sample Bank",
          loanType: "PERSONAL",
          originalPrincipalMinor: loanPrincipal,
          currentOutstandingPrincipalMinor: loanPrincipal - emi * 2 + Math.round(emi * 0.3),
          annualInterestRatePercent: loanRate,
          rateType: "FIXED",
          currentEmiMinor: emi,
          originalTenureMonths: loanTenure,
          remainingTenureMonths: loanTenure - 2,
          startDate: utcDateOnly(year, month - 3, 5),
          nextPaymentDate: utcDateOnly(year, month, 5),
          emiPaymentDay: 5,
          isSampleData: true,
        },
      });

      const smallLoan = await tx.loan.create({
        data: {
          userId,
          name: "Consumer Durable Loan",
          lender: "Sample NBFC",
          loanType: "CONSUMER",
          originalPrincipalMinor: toMinorUnits(40_000),
          currentOutstandingPrincipalMinor: toMinorUnits(18_000),
          annualInterestRatePercent: 16,
          rateType: "FIXED",
          currentEmiMinor: calculateEmiMinor(toMinorUnits(40_000), 16, 12),
          originalTenureMonths: 12,
          remainingTenureMonths: 4,
          startDate: utcDateOnly(year, month - 8, 10),
          nextPaymentDate: utcDateOnly(year, month, 10),
          emiPaymentDay: 10,
          isSampleData: true,
        },
      });

      await tx.loanPayment.create({
        data: {
          loanId: loan.id,
          userId,
          paymentDate: utcDateOnly(year, month - 1, 5),
          totalAmountMinor: emi,
          principalMinor: emi - Math.round((loanPrincipal * loanRate) / 12 / 100),
          interestMinor: Math.round((loanPrincipal * loanRate) / 12 / 100),
          outstandingBalanceAfterMinor: loanPrincipal - emi,
          accountId: bank.id,
        },
      });

      await tx.investment.create({
        data: {
          userId,
          name: "Index Fund SIP",
          provider: "Sample AMC",
          investmentType: "MUTUAL_FUND",
          frequency: "MONTHLY",
          contributionAmountMinor: toMinorUnits(5_000),
          startDate: utcDateOnly(year, month - 6, 1),
          nextContributionDate: utcDateOnly(year, month, 1),
          currentInvestedValueMinor: toMinorUnits(30_000),
          currentMarketValueMinor: toMinorUnits(33_500),
          isSampleData: true,
        },
      });
      const elss = await tx.investment.create({
        data: {
          userId,
          name: "Tax Saver ELSS",
          provider: "Sample AMC",
          investmentType: "ELSS",
          frequency: "MONTHLY",
          contributionAmountMinor: toMinorUnits(2_000),
          startDate: utcDateOnly(year, month - 10, 1),
          nextContributionDate: utcDateOnly(year, month + 1, 1),
          isTaxLinked: true,
          lockInEndDate: utcDateOnly(year + 2, month - 10, 1),
          isActive: false,
          pauseDate: utcDateOnly(year, month - 1, 15),
          currentInvestedValueMinor: toMinorUnits(20_000),
          isSampleData: true,
        },
      });
      await tx.investmentStatusHistory.create({
        data: {
          investmentId: elss.id,
          status: "PAUSED",
          date: utcDateOnly(year, month - 1, 15),
          reason: "Redirecting to debt payoff temporarily",
          releasedMonthlyEquivalentMinor: toMinorUnits(2_000),
          allocationChoice: "NEXT_DEBT",
        },
      });
      await tx.cashAllocationRule.create({
        data: {
          userId,
          triggerType: "SIP_PAUSE",
          investmentId: elss.id,
          targetType: "NEXT_DEBT",
          amountMinor: toMinorUnits(2_000),
          effectiveDate: utcDateOnly(year, month - 1, 15),
        },
      });

      const fund = await tx.emergencyFund.create({
        data: {
          userId,
          name: "Emergency Fund",
          currentSavedAmountMinor: toMinorUnits(60_000),
          currentMonthlyContributionMinor: toMinorUnits(5_000),
          targetMethod: "SIX_MONTHS",
          accountId: bank.id,
          isSampleData: true,
        },
      });
      await tx.emergencyFundTransaction.create({
        data: {
          emergencyFundId: fund.id,
          userId,
          type: "DEPOSIT",
          date: utcDateOnly(year, month - 1, 1),
          amountMinor: toMinorUnits(5_000),
        },
      });

      const emiCategoryId = byName("Loan EMI");
      const sipCategoryId = byName("Mutual Fund SIP");
      const rentCategoryId = byName("Rent");
      const groceriesCategoryId = byName("Groceries");
      const allocations = [
        rentCategoryId && { categoryId: rentCategoryId, plannedAmountMinor: toMinorUnits(22_000) },
        groceriesCategoryId && { categoryId: groceriesCategoryId, plannedAmountMinor: toMinorUnits(8_000) },
        emiCategoryId && { categoryId: emiCategoryId, plannedAmountMinor: emi + smallLoan.currentEmiMinor },
        sipCategoryId && { categoryId: sipCategoryId, plannedAmountMinor: toMinorUnits(5_000) },
      ].filter((a): a is { categoryId: string; plannedAmountMinor: number } => !!a);

      if (allocations.length) {
        await tx.budgetMonth.create({
          data: {
            userId,
            year,
            month,
            budgetingMethod: "ZERO_BASED",
            plannedIncomeMinor: toMinorUnits(100_000),
            isSampleData: true,
            allocations: { create: allocations },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/loans");
    revalidatePath("/investments");
    revalidatePath("/emergency-fund");
    revalidatePath("/budget");
    return { created: true };
  });
}

export async function clearSampleData(): Promise<ActionResult<{ cleared: boolean }>> {
  return runAction(async () => {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      await tx.expenseTransaction.deleteMany({ where: { userId, isSampleData: true } });
      await tx.incomeTransaction.deleteMany({ where: { userId, isSampleData: true } });
      await tx.budgetMonth.deleteMany({ where: { userId, isSampleData: true } });
      await tx.loan.deleteMany({ where: { userId, isSampleData: true } });
      await tx.investment.deleteMany({ where: { userId, isSampleData: true } });
      await tx.emergencyFund.deleteMany({ where: { userId, isSampleData: true } });
      await tx.financialAccount.deleteMany({ where: { userId, isSampleData: true } });
    });

    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/loans");
    revalidatePath("/investments");
    revalidatePath("/emergency-fund");
    revalidatePath("/budget");
    return { cleared: true };
  });
}
