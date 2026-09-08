import { describe, expect, it } from "vitest";
import { addFrequency, daysInMonth, isLeapYear, utcDateOnly } from "./dates";

describe("daysInMonth", () => {
  it("knows February has 29 days in a leap year", () => {
    expect(daysInMonth(2024, 1)).toBe(29); // month index 1 = February
  });

  it("knows February has 28 days in a non-leap year", () => {
    expect(daysInMonth(2023, 1)).toBe(28);
  });
});

describe("isLeapYear", () => {
  it("treats years divisible by 400 as leap", () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it("treats century years not divisible by 400 as non-leap", () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it("treats ordinary years divisible by 4 as leap", () => {
    expect(isLeapYear(2024)).toBe(true);
  });
});

describe("addFrequency month-length handling", () => {
  it("clamps Jan 31 + 1 month to the last day of February", () => {
    const jan31 = utcDateOnly(2026, 0, 31);
    const next = addFrequency(jan31, "MONTHLY");
    expect(next.getUTCMonth()).toBe(1); // February
    expect(next.getUTCDate()).toBe(28); // 2026 is not a leap year
  });

  it("advances daily frequency by exactly one day", () => {
    const day = utcDateOnly(2026, 0, 1);
    const next = addFrequency(day, "DAILY");
    expect(next.getUTCDate()).toBe(2);
  });

  it("advances custom frequency by the configured interval", () => {
    const day = utcDateOnly(2026, 0, 1);
    const next = addFrequency(day, "CUSTOM", 10);
    expect(next.getUTCDate()).toBe(11);
  });
});
