import { z } from "zod";

export const incomeCategoryEnum = z.enum([
  "SALARY",
  "FREELANCE",
  "BUSINESS",
  "RENTAL",
  "INTEREST",
  "DIVIDENDS",
  "BONUS",
  "REIMBURSEMENT",
  "OTHER",
]);

export const incomeStatusEnum = z.enum(["EXPECTED", "RECEIVED", "PARTIALLY_RECEIVED", "DELAYED", "CANCELLED"]);

export const incomeSchema = z.object({
  sourceName: z.string().trim().min(1, "Source is required").max(150),
  category: incomeCategoryEnum,
  plannedAmount: z.coerce.number().nonnegative("Planned amount can't be negative"),
  actualAmount: z.coerce.number().nonnegative().optional().nullable(),
  expectedDate: z.coerce.date(),
  receivedDate: z.coerce.date().optional().nullable(),
  accountId: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  status: incomeStatusEnum.default("EXPECTED"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
