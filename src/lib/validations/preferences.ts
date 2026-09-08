import { z } from "zod";

export const preferenceSchema = z.object({
  currency: z.string().trim().min(1).max(10),
  locale: z.string().trim().min(1).max(20),
  timezone: z.string().trim().min(1).max(60),
  defaultBudgetingMethod: z.enum(["ZERO_BASED", "PERCENTAGE", "CUSTOM"]),
  needsPercent: z.coerce.number().min(0).max(100),
  wantsPercent: z.coerce.number().min(0).max(100),
  savingsDebtPercent: z.coerce.number().min(0).max(100),
  safeCashBuffer: z.coerce.number().nonnegative(),
  creditUtilizationWarningPct: z.coerce.number().min(0).max(100),
  emiBurdenWarningPct: z.coerce.number().min(0).max(100),
});

export type PreferenceInput = z.infer<typeof preferenceSchema>;
