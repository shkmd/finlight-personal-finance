import { roundHalfAwayFromZero } from "@/lib/money";
import { countWeekdayOccurrencesInMonth, daysInMonth } from "@/lib/dates";
import type { Frequency } from "@prisma/client";

/**
 * Normalize any recurring contribution frequency into its monthly
 * equivalent, per the spec's fixed conversion factors. Used to compare
 * SIPs/investments/recurring bills of different cadences on one monthly
 * budget line, and to compute how much cash is released when one is
 * paused.
 *
 * This is a smoothed annual average (52 weeks/12 months = 4.33), correct
 * over a year but not what any single calendar month actually adds up to —
 * a weekly contribution lands 4 or 5 times in a given month, never 4.33
 * times. Use monthlyEquivalentMinorForMonth instead when the figure is
 * presented as "this month's" commitment rather than a general rate.
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

/**
 * Same conversion, but exact for a specific calendar month instead of a
 * flat annual average: a weekly contribution counts the real number of
 * times its recurring weekday (taken from anchorDate, e.g. the investment's
 * next contribution date) falls within that month, and a daily one counts
 * that month's actual day count. Monthly/quarterly/yearly/custom cadences
 * don't reliably land in every month without knowing the full cycle from
 * the anchor date, so they fall back to the same average as above.
 */
export function monthlyEquivalentMinorForMonth(
  amountMinor: number,
  frequency: Frequency,
  anchorDate: Date,
  year: number,
  monthIndex0: number
): number {
  switch (frequency) {
    case "DAILY":
      return amountMinor * daysInMonth(year, monthIndex0);
    case "WEEKLY":
      return amountMinor * countWeekdayOccurrencesInMonth(year, monthIndex0, anchorDate.getUTCDay());
    default:
      return monthlyEquivalentMinor(amountMinor, frequency);
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
