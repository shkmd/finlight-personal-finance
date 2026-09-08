import { z } from "zod";

export const recurringTypeEnum = z.enum(["INCOME", "EXPENSE"]);
export const frequencyEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]);

export const recurringTransactionSchema = z.object({
  type: recurringTypeEnum,
  name: z.string().trim().min(1, "Name is required").max(150),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  frequency: frequencyEnum,
  customIntervalDays: z.coerce.number().int().positive().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  nextOccurrenceDate: z.coerce.date(),
  autoGenerate: z.boolean().default(false),
  requireConfirmation: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
