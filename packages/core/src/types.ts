/**
 * Mirrors the corresponding Prisma enums (prisma/schema.prisma). Kept as
 * plain string unions here — rather than importing from @prisma/client —
 * so this package never pulls the Prisma client (and its native query
 * engine binary) into a consumer that only needs these two type shapes,
 * such as the mobile app. Prisma's generated enum types are structurally
 * identical string-literal unions, so values flow between the two without
 * casting in either direction.
 */
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";

export type EmergencyTargetMethod = "FIXED_AMOUNT" | "THREE_MONTHS" | "SIX_MONTHS" | "CUSTOM_MONTHS";
