import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  fromMinorUnits,
  parseAmountToMinorUnits,
  roundHalfAwayFromZero,
  toMinorUnits,
} from "./money";

describe("minor unit conversion", () => {
  it("round-trips whole rupee amounts", () => {
    expect(toMinorUnits(1234)).toBe(123_400);
    expect(fromMinorUnits(123_400)).toBe(1234);
  });

  it("rounds fractional paise using round-half-away-from-zero", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });
});

describe("parseAmountToMinorUnits", () => {
  it("strips thousands separators and currency symbols", () => {
    expect(parseAmountToMinorUnits("₹1,234.56")).toBe(123_456);
    expect(parseAmountToMinorUnits("1,000")).toBe(100_000);
  });

  it("returns 0 for unparsable input instead of throwing", () => {
    expect(parseAmountToMinorUnits("abc")).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats INR amounts without decimals by default", () => {
    const formatted = formatCurrency(150_000);
    expect(formatted).toMatch(/1,500/);
  });

  it("shows a leading minus for negative amounts", () => {
    const formatted = formatCurrency(-50_000);
    expect(formatted.startsWith("-")).toBe(true);
  });

  it("can show an explicit + sign for positive amounts", () => {
    const formatted = formatCurrency(50_000, { showSign: true });
    expect(formatted.startsWith("+")).toBe(true);
  });
});
