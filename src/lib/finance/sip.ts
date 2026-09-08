import { roundHalfAwayFromZero } from "@/lib/money";
import type { Frequency } from "@prisma/client";

/**
 * Normalize any recurring contribution frequency into its monthly
 * equivalent, per the spec's fixed conversion factors. Used to compare
 * SIPs/investments/recurring bills of different cadences on one monthly
 * budget line, and to compute how much cash is released when one is
 * paused.
 */
export function monthlyEquivalentMinor(amountMinor: number, frequency: Frequency): number {
  switch (frequency) {
    case "DAILY":
      return roundHalfAwayFromZero((amountMinor * 365) / 12);
    case "WEEKLY":
      return roundHalfAwayFromZero((amountMinor * 52) / 12);
    case "MONTHLY":
      return amountMinor;
    case "QUARTERLY":
      return roundHalfAwayFromZero(amountMinor / 3);
    case "YEARLY":
      return roundHalfAwayFromZero(amountMinor / 12);
    case "CUSTOM":
      return amountMinor;
    default:
      return amountMinor;
  }
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
};

const TAX_LINKED_WARNING =
  "Pausing future contributions does not normally remove the lock-in that already applies to money already invested. This is not tax or investment advice — check your specific plan's terms before deciding.";

export function taxLinkedPauseWarning(): string {
  return TAX_LINKED_WARNING;
}
