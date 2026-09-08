import { z } from "zod";

export const budgetingMethodEnum = z.enum(["ZERO_BASED", "PERCENTAGE", "CUSTOM"]);

export const createBudgetMonthSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  budgetingMethod: budgetingMethodEnum.default("ZERO_BASED"),
  needsPercent: z.coerce.number().min(0).max(100).optional(),
  wantsPercent: z.coerce.number().min(0).max(100).optional(),
  savingsDebtPercent: z.coerce.number().min(0).max(100).optional(),
  copyFromPreviousMonth: z.boolean().default(false),
  templateId: z.string().optional().nullable(),
  autoIncludeEmis: z.boolean().default(true),
  autoIncludeSips: z.boolean().default(true),
  autoIncludeRecurringBills: z.boolean().default(true),
});
export type CreateBudgetMonthInput = z.infer<typeof createBudgetMonthSchema>;

export const budgetAllocationSchema = z.object({
  categoryId: z.string().min(1),
  plannedAmount: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BudgetAllocationInput = z.infer<typeof budgetAllocationSchema>;
