import { z } from "zod";

export const loanTypeEnum = z.enum([
  "PERSONAL",
  "CREDIT_CARD",
  "VEHICLE",
  "HOME",
  "GOLD",
  "CONSUMER",
  "EDUCATION",
  "BUSINESS",
  "OTHER",
]);
export const rateTypeEnum = z.enum(["FIXED", "FLOATING"]);
export const loanStatusEnum = z.enum(["ACTIVE", "PAID_OFF", "ARCHIVED"]);

export const loanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  lender: z.string().trim().min(1, "Lender is required").max(150),
  loanType: loanTypeEnum,
  originalPrincipal: z.coerce.number().positive("Original principal must be greater than zero"),
  currentOutstandingPrincipal: z.coerce.number().nonnegative(),
  annualInterestRatePercent: z.coerce.number().min(0).max(100),
  rateType: rateTypeEnum.default("FIXED"),
  currentEmi: z.coerce.number().positive("EMI must be greater than zero"),
  originalTenureMonths: z.coerce.number().int().positive(),
  remainingTenureMonths: z.coerce.number().int().nonnegative(),
  startDate: z.coerce.date(),
  nextPaymentDate: z.coerce.date(),
  emiPaymentDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  lenderClosureDate: z.coerce.date().optional().nullable(),
  prepaymentChargePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  foreclosureChargePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: loanStatusEnum.default("ACTIVE"),
});

export type LoanInput = z.infer<typeof loanSchema>;

export const loanPaymentSchema = z.object({
  paymentDate: z.coerce.date(),
  totalAmount: z.coerce.number().positive(),
  principal: z.coerce.number().nonnegative(),
  interest: z.coerce.number().nonnegative(),
  fee: z.coerce.number().nonnegative().default(0),
  extraAmount: z.coerce.number().nonnegative().default(0),
  outstandingBalanceAfter: z.coerce.number().nonnegative().optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type LoanPaymentInput = z.infer<typeof loanPaymentSchema>;
