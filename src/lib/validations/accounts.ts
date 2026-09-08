import { z } from "zod";

export const accountTypeEnum = z.enum([
  "BANK",
  "CASH",
  "CREDIT_CARD",
  "WALLET",
  "INVESTMENT",
  "LOAN",
  "OTHER",
]);

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: accountTypeEnum,
  institution: z.string().trim().max(100).optional().or(z.literal("")),
  openingBalance: z.coerce.number().finite().default(0),
  currency: z.string().trim().min(1).max(10).default("INR"),
  creditLimit: z.coerce.number().finite().nonnegative().optional().nullable(),
  statementDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  billingDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  paymentDueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AccountInput = z.infer<typeof accountSchema>;

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Select a source account"),
    toAccountId: z.string().min(1, "Select a destination account"),
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    fee: z.coerce.number().nonnegative().default(0),
    date: z.coerce.date(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
