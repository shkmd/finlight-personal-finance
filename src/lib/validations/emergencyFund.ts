import { z } from "zod";

export const emergencyTargetMethodEnum = z.enum(["FIXED_AMOUNT", "THREE_MONTHS", "SIX_MONTHS", "CUSTOM_MONTHS"]);

export const emergencyFundSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  currentSavedAmount: z.coerce.number().nonnegative().default(0),
  currentMonthlyContribution: z.coerce.number().nonnegative().default(0),
  targetMethod: emergencyTargetMethodEnum,
  fixedTargetAmount: z.coerce.number().nonnegative().optional().nullable(),
  targetMonths: z.coerce.number().int().positive().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EmergencyFundInput = z.infer<typeof emergencyFundSchema>;

export const emergencyFundTransactionSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  linkedExpenseId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EmergencyFundTransactionInput = z.infer<typeof emergencyFundTransactionSchema>;
