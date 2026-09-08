import { z } from "zod";

export const expenseStatusEnum = z.enum(["PAID", "PENDING", "REFUNDED", "CANCELLED"]);
export const essentialTypeEnum = z.enum(["ESSENTIAL", "DISCRETIONARY"]);

export const expenseSplitSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const expenseSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  name: z.string().trim().min(1, "Name is required").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().min(1, "Select an account"),
  paymentMethodId: z.string().optional().nullable(),
  merchant: z.string().trim().max(150).optional().or(z.literal("")),
  isRecurring: z.boolean().default(false),
  essentialType: essentialTypeEnum.default("DISCRETIONARY"),
  linkedLoanId: z.string().optional().nullable(),
  linkedInvestmentId: z.string().optional().nullable(),
  reimbursable: z.boolean().default(false),
  refundOfExpenseId: z.string().optional().nullable(),
  status: expenseStatusEnum.default("PAID"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  tagNames: z.array(z.string().trim().min(1).max(50)).default([]),
  splits: z.array(expenseSplitSchema).default([]),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const expenseFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  merchant: z.string().optional(),
  status: expenseStatusEnum.optional(),
  essentialType: essentialTypeEnum.optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  search: z.string().optional(),
  recurringOnly: z.boolean().optional(),
});

export type ExpenseFilterInput = z.infer<typeof expenseFilterSchema>;
