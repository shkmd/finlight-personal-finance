-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'CASH', 'CREDIT_CARD', 'WALLET', 'INVESTMENT', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('SALARY', 'FREELANCE', 'BUSINESS', 'RENTAL', 'INTEREST', 'DIVIDENDS', 'BONUS', 'REIMBURSEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeStatus" AS ENUM ('EXPECTED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PAID', 'PENDING', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EssentialType" AS ENUM ('ESSENTIAL', 'DISCRETIONARY');

-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('ESSENTIAL', 'DEBT', 'INVESTMENT', 'LIFESTYLE', 'INCOME', 'OTHER');

-- CreateEnum
CREATE TYPE "BudgetingMethod" AS ENUM ('ZERO_BASED', 'PERCENTAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('PERSONAL', 'CREDIT_CARD', 'VEHICLE', 'HOME', 'GOLD', 'CONSUMER', 'EDUCATION', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'FLOATING');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('MUTUAL_FUND', 'ELSS', 'GOLD', 'SILVER', 'STOCKS', 'NPS', 'PPF', 'RECURRING_DEPOSIT', 'FIXED_DEPOSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentLifecycleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RESUMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmergencyTargetMethod" AS ENUM ('FIXED_AMOUNT', 'THREE_MONTHS', 'SIX_MONTHS', 'CUSTOM_MONTHS');

-- CreateEnum
CREATE TYPE "EmergencyTxnType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "PayoffStrategy" AS ENUM ('AVALANCHE', 'SNOWBALL', 'SHORTEST_TENURE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CashAllocationTarget" AS ENUM ('NEXT_DEBT', 'EMERGENCY_FUND', 'SIP_RESUME', 'NEW_INVESTMENT', 'CASH_BUFFER', 'UNALLOCATED');

-- CreateEnum
CREATE TYPE "CashAllocationTrigger" AS ENUM ('SIP_PAUSE', 'LOAN_CLOSURE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFinancialPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "defaultBudgetingMethod" "BudgetingMethod" NOT NULL DEFAULT 'ZERO_BASED',
    "needsPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "wantsPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "savingsDebtPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "safeCashBufferMinor" INTEGER NOT NULL DEFAULT 0,
    "creditUtilizationWarningPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "emiBurdenWarningPct" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "sampleDataEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFinancialPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "institution" TEXT,
    "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
    "currentBalanceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "creditLimitMinor" INTEGER,
    "statementDay" INTEGER,
    "billingDay" INTEGER,
    "paymentDueDay" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "CategoryGroup" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "parentCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionTagAssignment" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "expenseTransactionId" TEXT NOT NULL,

    CONSTRAINT "TransactionTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "plannedAmountMinor" INTEGER NOT NULL,
    "actualAmountMinor" INTEGER,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "accountId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringTransactionId" TEXT,
    "notes" TEXT,
    "status" "IncomeStatus" NOT NULL DEFAULT 'EXPECTED',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "accountId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "merchant" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringTransactionId" TEXT,
    "essentialType" "EssentialType" NOT NULL DEFAULT 'DISCRETIONARY',
    "linkedLoanId" TEXT,
    "linkedInvestmentId" TEXT,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "reimbursedAmountMinor" INTEGER,
    "refundOfExpenseId" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID',
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseTransactionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptAttachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expenseTransactionId" TEXT,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "name" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "frequency" "Frequency" NOT NULL,
    "customIntervalDays" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextOccurrenceDate" TIMESTAMP(3) NOT NULL,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetTemplateAllocation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "plannedAmountMinor" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BudgetTemplateAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetMonth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "budgetingMethod" "BudgetingMethod" NOT NULL DEFAULT 'ZERO_BASED',
    "needsPercent" DOUBLE PRECISION,
    "wantsPercent" DOUBLE PRECISION,
    "savingsDebtPercent" DOUBLE PRECISION,
    "plannedIncomeMinor" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" TEXT NOT NULL,
    "budgetMonthId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "plannedAmountMinor" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "originalPrincipalMinor" INTEGER NOT NULL,
    "currentOutstandingPrincipalMinor" INTEGER NOT NULL,
    "annualInterestRatePercent" DOUBLE PRECISION NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'FIXED',
    "currentEmiMinor" INTEGER NOT NULL,
    "originalTenureMonths" INTEGER NOT NULL,
    "remainingTenureMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextPaymentDate" TIMESTAMP(3) NOT NULL,
    "emiPaymentDay" INTEGER,
    "lenderClosureDate" TIMESTAMP(3),
    "prepaymentChargePercent" DOUBLE PRECISION,
    "foreclosureChargePercent" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "principalMinor" INTEGER NOT NULL,
    "interestMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "extraAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "outstandingBalanceAfterMinor" INTEGER,
    "accountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "investmentType" "InvestmentType" NOT NULL,
    "category" TEXT,
    "frequency" "Frequency" NOT NULL,
    "contributionAmountMinor" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextContributionDate" TIMESTAMP(3) NOT NULL,
    "currentInvestedValueMinor" INTEGER,
    "currentMarketValueMinor" INTEGER,
    "isTaxLinked" BOOLEAN NOT NULL DEFAULT false,
    "lockInEndDate" TIMESTAMP(3),
    "autoDebit" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pauseDate" TIMESTAMP(3),
    "plannedResumeDate" TIMESTAMP(3),
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentContribution" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "accountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentStatusHistory" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "status" "InvestmentLifecycleStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "releasedMonthlyEquivalentMinor" INTEGER,
    "allocationChoice" "CashAllocationTarget",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyFund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentSavedAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "currentMonthlyContributionMinor" INTEGER NOT NULL DEFAULT 0,
    "targetMethod" "EmergencyTargetMethod" NOT NULL DEFAULT 'SIX_MONTHS',
    "fixedTargetAmountMinor" INTEGER,
    "targetMonths" INTEGER,
    "targetDate" TIMESTAMP(3),
    "accountId" TEXT,
    "isSampleData" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyFundTransaction" (
    "id" TEXT NOT NULL,
    "emergencyFundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EmergencyTxnType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "reason" TEXT,
    "linkedExpenseId" TEXT,
    "accountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyFundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoffScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" "PayoffStrategy" NOT NULL,
    "extraMonthlyAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "includeReleasedSipMinor" INTEGER NOT NULL DEFAULT 0,
    "lumpSumAmountMinor" INTEGER,
    "lumpSumMonthIndex" INTEGER,
    "annualIncreasePercent" DOUBLE PRECISION,
    "planStartMonth" TIMESTAMP(3) NOT NULL,
    "minCashBufferMinor" INTEGER NOT NULL DEFAULT 0,
    "resultsSummaryJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoffScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoffScenarioLoan" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "includedInScenario" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PayoffScenarioLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoffScheduleEntry" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openingBalanceMinor" INTEGER NOT NULL,
    "interestMinor" INTEGER NOT NULL,
    "principalMinor" INTEGER NOT NULL,
    "extraPaymentMinor" INTEGER NOT NULL DEFAULT 0,
    "closingBalanceMinor" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PayoffScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAllocationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerType" "CashAllocationTrigger" NOT NULL,
    "loanId" TEXT,
    "investmentId" TEXT,
    "targetType" "CashAllocationTarget" NOT NULL,
    "targetId" TEXT,
    "percentAllocated" DOUBLE PRECISION,
    "amountMinor" INTEGER,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashAllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdValue" DOUBLE PRECISION,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserFinancialPreference_userId_key" ON "UserFinancialPreference"("userId");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_idx" ON "FinancialAccount"("userId");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_isArchived_idx" ON "FinancialAccount"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "AccountTransfer_userId_idx" ON "AccountTransfer"("userId");

-- CreateIndex
CREATE INDEX "AccountTransfer_fromAccountId_idx" ON "AccountTransfer"("fromAccountId");

-- CreateIndex
CREATE INDEX "AccountTransfer_toAccountId_idx" ON "AccountTransfer"("toAccountId");

-- CreateIndex
CREATE INDEX "BudgetCategory_userId_idx" ON "BudgetCategory"("userId");

-- CreateIndex
CREATE INDEX "BudgetCategory_userId_group_idx" ON "BudgetCategory"("userId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_userId_name_parentCategoryId_key" ON "BudgetCategory"("userId", "name", "parentCategoryId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_userId_name_key" ON "PaymentMethod"("userId", "name");

-- CreateIndex
CREATE INDEX "TransactionTag_userId_idx" ON "TransactionTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionTag_userId_name_key" ON "TransactionTag"("userId", "name");

-- CreateIndex
CREATE INDEX "TransactionTagAssignment_expenseTransactionId_idx" ON "TransactionTagAssignment"("expenseTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionTagAssignment_tagId_expenseTransactionId_key" ON "TransactionTagAssignment"("tagId", "expenseTransactionId");

-- CreateIndex
CREATE INDEX "IncomeTransaction_userId_idx" ON "IncomeTransaction"("userId");

-- CreateIndex
CREATE INDEX "IncomeTransaction_userId_expectedDate_idx" ON "IncomeTransaction"("userId", "expectedDate");

-- CreateIndex
CREATE INDEX "IncomeTransaction_userId_status_idx" ON "IncomeTransaction"("userId", "status");

-- CreateIndex
CREATE INDEX "IncomeTransaction_accountId_idx" ON "IncomeTransaction"("accountId");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_userId_idx" ON "ExpenseTransaction"("userId");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_userId_date_idx" ON "ExpenseTransaction"("userId", "date");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_userId_categoryId_idx" ON "ExpenseTransaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_userId_status_idx" ON "ExpenseTransaction"("userId", "status");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_accountId_idx" ON "ExpenseTransaction"("accountId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_expenseTransactionId_idx" ON "ExpenseSplit"("expenseTransactionId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_categoryId_idx" ON "ExpenseSplit"("categoryId");

-- CreateIndex
CREATE INDEX "ReceiptAttachment_userId_idx" ON "ReceiptAttachment"("userId");

-- CreateIndex
CREATE INDEX "ReceiptAttachment_expenseTransactionId_idx" ON "ReceiptAttachment"("expenseTransactionId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_isActive_idx" ON "RecurringTransaction"("userId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_nextOccurrenceDate_idx" ON "RecurringTransaction"("userId", "nextOccurrenceDate");

-- CreateIndex
CREATE INDEX "BudgetTemplate_userId_idx" ON "BudgetTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetTemplateAllocation_templateId_categoryId_key" ON "BudgetTemplateAllocation"("templateId", "categoryId");

-- CreateIndex
CREATE INDEX "BudgetMonth_userId_idx" ON "BudgetMonth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMonth_userId_year_month_key" ON "BudgetMonth"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "BudgetAllocation_categoryId_idx" ON "BudgetAllocation"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAllocation_budgetMonthId_categoryId_key" ON "BudgetAllocation"("budgetMonthId", "categoryId");

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");

-- CreateIndex
CREATE INDEX "Loan_userId_status_idx" ON "Loan"("userId", "status");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_userId_idx" ON "LoanPayment"("userId");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_paymentDate_idx" ON "LoanPayment"("loanId", "paymentDate");

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "Investment_userId_isActive_idx" ON "Investment"("userId", "isActive");

-- CreateIndex
CREATE INDEX "InvestmentContribution_investmentId_idx" ON "InvestmentContribution"("investmentId");

-- CreateIndex
CREATE INDEX "InvestmentContribution_userId_idx" ON "InvestmentContribution"("userId");

-- CreateIndex
CREATE INDEX "InvestmentStatusHistory_investmentId_idx" ON "InvestmentStatusHistory"("investmentId");

-- CreateIndex
CREATE INDEX "EmergencyFund_userId_idx" ON "EmergencyFund"("userId");

-- CreateIndex
CREATE INDEX "EmergencyFundTransaction_emergencyFundId_idx" ON "EmergencyFundTransaction"("emergencyFundId");

-- CreateIndex
CREATE INDEX "EmergencyFundTransaction_userId_idx" ON "EmergencyFundTransaction"("userId");

-- CreateIndex
CREATE INDEX "PayoffScenario_userId_idx" ON "PayoffScenario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoffScenarioLoan_scenarioId_loanId_key" ON "PayoffScenarioLoan"("scenarioId", "loanId");

-- CreateIndex
CREATE INDEX "PayoffScheduleEntry_scenarioId_idx" ON "PayoffScheduleEntry"("scenarioId");

-- CreateIndex
CREATE INDEX "PayoffScheduleEntry_scenarioId_loanId_idx" ON "PayoffScheduleEntry"("scenarioId", "loanId");

-- CreateIndex
CREATE INDEX "PayoffScheduleEntry_scenarioId_monthIndex_idx" ON "PayoffScheduleEntry"("scenarioId", "monthIndex");

-- CreateIndex
CREATE INDEX "CashAllocationRule_userId_idx" ON "CashAllocationRule"("userId");

-- CreateIndex
CREATE INDEX "AlertPreference_userId_idx" ON "AlertPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertPreference_userId_alertType_key" ON "AlertPreference"("userId", "alertType");

-- CreateIndex
CREATE INDEX "AlertInstance_userId_idx" ON "AlertInstance"("userId");

-- CreateIndex
CREATE INDEX "AlertInstance_userId_isDismissed_idx" ON "AlertInstance"("userId", "isDismissed");

-- AddForeignKey
ALTER TABLE "UserFinancialPreference" ADD CONSTRAINT "UserFinancialPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTagAssignment" ADD CONSTRAINT "TransactionTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TransactionTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTagAssignment" ADD CONSTRAINT "TransactionTagAssignment_expenseTransactionId_fkey" FOREIGN KEY ("expenseTransactionId") REFERENCES "ExpenseTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_linkedLoanId_fkey" FOREIGN KEY ("linkedLoanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_linkedInvestmentId_fkey" FOREIGN KEY ("linkedInvestmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_refundOfExpenseId_fkey" FOREIGN KEY ("refundOfExpenseId") REFERENCES "ExpenseTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseTransactionId_fkey" FOREIGN KEY ("expenseTransactionId") REFERENCES "ExpenseTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptAttachment" ADD CONSTRAINT "ReceiptAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptAttachment" ADD CONSTRAINT "ReceiptAttachment_expenseTransactionId_fkey" FOREIGN KEY ("expenseTransactionId") REFERENCES "ExpenseTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTemplate" ADD CONSTRAINT "BudgetTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTemplateAllocation" ADD CONSTRAINT "BudgetTemplateAllocation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BudgetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTemplateAllocation" ADD CONSTRAINT "BudgetTemplateAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMonth" ADD CONSTRAINT "BudgetMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_budgetMonthId_fkey" FOREIGN KEY ("budgetMonthId") REFERENCES "BudgetMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentStatusHistory" ADD CONSTRAINT "InvestmentStatusHistory_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFund" ADD CONSTRAINT "EmergencyFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFund" ADD CONSTRAINT "EmergencyFund_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFundTransaction" ADD CONSTRAINT "EmergencyFundTransaction_emergencyFundId_fkey" FOREIGN KEY ("emergencyFundId") REFERENCES "EmergencyFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFundTransaction" ADD CONSTRAINT "EmergencyFundTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFundTransaction" ADD CONSTRAINT "EmergencyFundTransaction_linkedExpenseId_fkey" FOREIGN KEY ("linkedExpenseId") REFERENCES "ExpenseTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFundTransaction" ADD CONSTRAINT "EmergencyFundTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffScenario" ADD CONSTRAINT "PayoffScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffScenarioLoan" ADD CONSTRAINT "PayoffScenarioLoan_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PayoffScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffScenarioLoan" ADD CONSTRAINT "PayoffScenarioLoan_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffScheduleEntry" ADD CONSTRAINT "PayoffScheduleEntry_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PayoffScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffScheduleEntry" ADD CONSTRAINT "PayoffScheduleEntry_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAllocationRule" ADD CONSTRAINT "CashAllocationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAllocationRule" ADD CONSTRAINT "CashAllocationRule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAllocationRule" ADD CONSTRAINT "CashAllocationRule_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertPreference" ADD CONSTRAINT "AlertPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertInstance" ADD CONSTRAINT "AlertInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
