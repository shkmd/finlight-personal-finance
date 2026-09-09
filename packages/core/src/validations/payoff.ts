import { z } from "zod";

export const payoffStrategyEnum = z.enum(["AVALANCHE", "SNOWBALL", "SHORTEST_TENURE", "CUSTOM"]);

export const payoffScenarioInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  loanIds: z.array(z.string()).min(1, "Select at least one loan"),
  strategy: payoffStrategyEnum,
  customOrder: z.array(z.string()).optional(),
  extraMonthlyAmount: z.coerce.number().nonnegative().default(0),
  includeReleasedSip: z.coerce.number().nonnegative().default(0),
  lumpSumAmount: z.coerce.number().nonnegative().optional().nullable(),
  lumpSumMonthIndex: z.coerce.number().int().positive().optional().nullable(),
  annualIncreasePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  planStartMonth: z.coerce.date(),
  minCashBuffer: z.coerce.number().nonnegative().default(0),
});

export type PayoffScenarioFormInput = z.infer<typeof payoffScenarioInputSchema>;
