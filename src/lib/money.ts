/**
 * Money handling conventions for this app:
 *
 * - Every persisted amount is an integer in MINOR UNITS (paise for INR,
 *   cents for USD, etc.) — never a float. This avoids floating point
 *   rounding drift across thousands of transactions.
 * - Rounding policy: round-half-away-from-zero to the nearest minor unit,
 *   applied only at the point an amount is about to be persisted or
 *   displayed. Intermediate calculation steps (e.g. amortization) may use
 *   floating point rupees internally but must round back to minor units
 *   before being written to the schedule.
 * - `currency`/`locale` are read from UserFinancialPreference; INR / en-IN
 *   are the defaults everywhere a preference isn't available yet.
 */

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";
export const MINOR_UNITS_PER_MAJOR = 100;

/** Round-half-away-from-zero to the nearest integer. */
export function roundHalfAwayFromZero(value: number): number {
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

/** Convert a major-unit amount (e.g. rupees, possibly fractional) to integer minor units. */
export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount)) return 0;
  return roundHalfAwayFromZero(majorAmount * MINOR_UNITS_PER_MAJOR);
}

/** Convert integer minor units back to a major-unit number (e.g. paise -> rupees). */
export function fromMinorUnits(minorAmount: number): number {
  return minorAmount / MINOR_UNITS_PER_MAJOR;
}

/** Parse a user-typed amount string (may contain commas, currency symbols) into minor units. */
export function parseAmountToMinorUnits(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? toMinorUnits(value) : 0;
}

export function formatCurrency(
  minorAmount: number,
  options?: { currency?: string; locale?: string; showSign?: boolean }
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const value = fromMinorUnits(minorAmount);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  if (!options?.showSign) return value < 0 ? `-${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatCurrencyPrecise(
  minorAmount: number,
  options?: { currency?: string; locale?: string }
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(fromMinorUnits(minorAmount));
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function sumMinor(amounts: Array<number | null | undefined>): number {
  return amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
}

export function clampMinorNonNegative(amount: number): number {
  return amount < 0 ? 0 : amount;
}
