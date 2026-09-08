import type { CategoryGroup } from "@prisma/client";

export interface DefaultCategorySeed {
  name: string;
  group: CategoryGroup;
  color: string;
}

const ESSENTIAL_COLOR = "#0891b2"; // cyan
const DEBT_COLOR = "#dc2626"; // red
const INVESTMENT_COLOR = "#16a34a"; // green
const LIFESTYLE_COLOR = "#9333ea"; // purple

export const DEFAULT_BUDGET_CATEGORIES: DefaultCategorySeed[] = [
  // Essential expenses
  { name: "Rent", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Groceries", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Electricity", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Water", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Gas", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Internet", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Mobile", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Fuel", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Medical", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Insurance", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Education", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Childcare", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Household", group: "ESSENTIAL", color: ESSENTIAL_COLOR },
  { name: "Family Support", group: "ESSENTIAL", color: ESSENTIAL_COLOR },

  // Debt repayments
  { name: "Loan EMI", group: "DEBT", color: DEBT_COLOR },
  { name: "Credit Card Payment", group: "DEBT", color: DEBT_COLOR },
  { name: "Extra Debt Repayment", group: "DEBT", color: DEBT_COLOR },
  { name: "Loan Interest", group: "DEBT", color: DEBT_COLOR },
  { name: "Prepayment / Foreclosure Charges", group: "DEBT", color: DEBT_COLOR },

  // Investments and savings
  { name: "Mutual Fund SIP", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "ELSS", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Gold", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Silver", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Stocks", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "NPS", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "PPF", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Recurring Deposit", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Emergency Fund", group: "INVESTMENT", color: INVESTMENT_COLOR },
  { name: "Other Savings", group: "INVESTMENT", color: INVESTMENT_COLOR },

  // Lifestyle and discretionary
  { name: "Dining", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Shopping", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Entertainment", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Travel", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Subscriptions", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Personal Care", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Gifts", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Charity", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
  { name: "Other Expenses", group: "LIFESTYLE", color: LIFESTYLE_COLOR },
];

export const DEFAULT_PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Debit Card",
  "Credit Card",
  "Bank Transfer",
  "Digital Wallet",
  "Auto-Debit",
  "Other",
];

export const ESSENTIAL_CATEGORY_NAMES = new Set(
  DEFAULT_BUDGET_CATEGORIES.filter((c) => c.group === "ESSENTIAL").map((c) => c.name)
);
