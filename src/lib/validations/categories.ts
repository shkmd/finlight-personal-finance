import { z } from "zod";

export const categoryGroupEnum = z.enum(["ESSENTIAL", "DEBT", "INVESTMENT", "LIFESTYLE", "INCOME", "OTHER"]);

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  group: categoryGroupEnum,
  color: z.string().trim().min(1).max(20).default("#6366f1"),
  parentCategoryId: z.string().optional().nullable(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
