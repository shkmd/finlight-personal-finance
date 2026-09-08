import { z } from "zod";

export const investmentTypeEnum = z.enum([
  "MUTUAL_FUND",
  "ELSS",
  "GOLD",
  "SILVER",
  "STOCKS",
  "NPS",
  "PPF",
  "RECURRING_DEPOSIT",
  "FIXED_DEPOSIT",
  "OTHER",
]);
export const frequencyEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]);
export const cashAllocationTargetEnum = z.enum([
  "NEXT_DEBT",
  "EMERGENCY_FUND",
  "SIP_RESUME",
  "NEW_INVESTMENT",
  "CASH_BUFFER",
  "UNALLOCATED",
]);

const TAX_LINKED_TYPES = new Set(["ELSS", "NPS", "PPF"]);

export const investmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  provider: z.string().trim().max(150).optional().or(z.literal("")),
  investmentType: investmentTypeEnum,
  category: z.string().trim().max(100).optional().or(z.literal("")),
  frequency: frequencyEnum,
  contributionAmount: z.coerce.number().positive("Contribution must be greater than zero"),
  startDate: z.coerce.date(),
  nextContributionDate: z.coerce.date(),
  currentInvestedValue: z.coerce.number().nonnegative().optional().nullable(),
  currentMarketValue: z.coerce.number().nonnegative().optional().nullable(),
  isTaxLinked: z.boolean().default(false),
  lockInEndDate: z.coerce.date().optional().nullable(),
  autoDebit: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

export function isTaxLinkedType(type: string): boolean {
  return TAX_LINKED_TYPES.has(type);
}

export const pauseInvestmentSchema = z.object({
  pauseDate: z.coerce.date(),
  plannedResumeDate: z.coerce.date().optional().nullable(),
  allocationChoice: cashAllocationTargetEnum,
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
  confirmedTaxLinkedWarning: z.boolean().optional(),
});

export type PauseInvestmentInput = z.infer<typeof pauseInvestmentSchema>;

export const contributionSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  accountId: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
