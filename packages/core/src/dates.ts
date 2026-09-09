import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarMonths,
  format,
  isBefore,
  isEqual,
  startOfMonth,
} from "date-fns";
import type { Frequency } from "./types";

/**
 * Date convention for this app:
 *
 * Financial dates (transaction date, EMI due date, SIP date, budget month)
 * are calendar-day concepts, not moments in time — "the 5th of March" means
 * the same thing regardless of timezone. We store these as UTC midnight
 * (`new Date(Date.UTC(y, m, d))`) and always read/format them using the
 * UTC getters below, so the calendar day never shifts under a viewer's
 * local timezone. Audit timestamps (`createdAt`/`updatedAt`) are true UTC
 * instants and are formatted using the browser's local timezone instead,
 * since "when was this row written" *is* a moment in time.
 */

export function utcDateOnly(year: number, monthIndex0: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex0, day));
}

export function toUtcDateOnly(date: Date): Date {
  return utcDateOnly(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatDateOnly(date: Date, pattern = "d MMM yyyy"): string {
  // Format using UTC components so the displayed calendar day is stable.
  const shifted = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return format(shifted, pattern);
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * How many times a given weekday (0=Sunday..6=Saturday) falls within a
 * specific calendar month — 4 or 5, never a flat average. Used to convert a
 * weekly recurring amount into "how much is actually due this month"
 * instead of a smoothed 52/12 estimate, which over- or under-states most
 * individual months even though it averages out correctly over a year.
 */
export function countWeekdayOccurrencesInMonth(year: number, monthIndex0: number, weekday: number): number {
  const total = daysInMonth(year, monthIndex0);
  const firstWeekday = utcDateOnly(year, monthIndex0, 1).getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return offset >= total ? 0 : Math.floor((total - 1 - offset) / 7) + 1;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Advance a UTC-date-only value by one occurrence of the given frequency. */
export function addFrequency(
  date: Date,
  frequency: Frequency,
  customIntervalDays?: number | null
): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "MONTHLY":
      return clampToMonthLength(addMonths(date, 1));
    case "QUARTERLY":
      return clampToMonthLength(addQuarters(date, 1));
    case "YEARLY":
      return addYears(date, 1);
    case "CUSTOM":
      return addDays(date, Math.max(1, customIntervalDays ?? 30));
    default:
      return addMonths(date, 1);
  }
}

/**
 * date-fns' addMonths clamps overflow days itself (e.g. Jan 31 + 1 month =
 * Feb 28), which is exactly the "month-length differences" edge case the
 * spec calls out. This helper exists to make that clamping explicit and
 * testable rather than incidental.
 */
function clampToMonthLength(candidate: Date): Date {
  return toUtcDateOnly(candidate);
}

export function monthsBetween(from: Date, to: Date): number {
  return differenceInCalendarMonths(to, from);
}

export function isOnOrBefore(a: Date, b: Date): boolean {
  return isBefore(a, b) || isEqual(a, b);
}

export function addMonthsUtc(date: Date, months: number): Date {
  return toUtcDateOnly(addMonths(date, months));
}

export function startOfMonthUtc(date: Date): Date {
  return toUtcDateOnly(startOfMonth(date));
}
