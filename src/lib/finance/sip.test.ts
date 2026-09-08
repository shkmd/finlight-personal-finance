import { describe, expect, it } from "vitest";
import { monthlyEquivalentMinor, monthlyEquivalentMinorForMonth } from "./sip";
import { countWeekdayOccurrencesInMonth } from "@/lib/dates";

describe("monthlyEquivalentMinor", () => {
  it("converts daily contributions using 365/12", () => {
    expect(monthlyEquivalentMinor(1000, "DAILY")).toBe(Math.round((1000 * 365) / 12));
  });

  it("converts weekly contributions using 52/12", () => {
    expect(monthlyEquivalentMinor(1000, "WEEKLY")).toBe(Math.round((1000 * 52) / 12));
  });

  it("leaves monthly contributions unchanged", () => {
    expect(monthlyEquivalentMinor(5000, "MONTHLY")).toBe(5000);
  });

  it("divides quarterly contributions by 3", () => {
    expect(monthlyEquivalentMinor(3000, "QUARTERLY")).toBe(1000);
  });

  it("divides yearly contributions by 12", () => {
    expect(monthlyEquivalentMinor(12000, "YEARLY")).toBe(1000);
  });
});

describe("countWeekdayOccurrencesInMonth", () => {
  it("counts 4 Mondays in September 2026 (starts on a Tuesday)", () => {
    // Sep 2026: Mondays fall on 7, 14, 21, 28 — four, not an average.
    expect(countWeekdayOccurrencesInMonth(2026, 8, 1)).toBe(4);
  });

  it("counts 5 occurrences when a weekday lands early enough in a 31-day month", () => {
    // Aug 2026 starts on a Saturday, so Saturdays fall on 1, 8, 15, 22, 29.
    expect(countWeekdayOccurrencesInMonth(2026, 7, 6)).toBe(5);
  });
});

describe("monthlyEquivalentMinorForMonth", () => {
  it("uses the exact Monday count for a weekly contribution, not the 52/12 average", () => {
    const mondayAnchor = new Date(Date.UTC(2026, 8, 7)); // a Monday
    expect(monthlyEquivalentMinorForMonth(500, "WEEKLY", mondayAnchor, 2026, 8)).toBe(500 * 4);
  });

  it("uses the exact day count for a daily contribution", () => {
    const anchor = new Date(Date.UTC(2026, 8, 1));
    expect(monthlyEquivalentMinorForMonth(100, "DAILY", anchor, 2026, 8)).toBe(100 * 30);
  });

  it("falls back to the flat average for monthly/quarterly/yearly/custom cadences", () => {
    const anchor = new Date(Date.UTC(2026, 8, 1));
    expect(monthlyEquivalentMinorForMonth(5000, "MONTHLY", anchor, 2026, 8)).toBe(5000);
    expect(monthlyEquivalentMinorForMonth(3000, "QUARTERLY", anchor, 2026, 8)).toBe(1000);
  });
});
