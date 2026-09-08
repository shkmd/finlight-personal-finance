import { describe, expect, it } from "vitest";
import { monthlyEquivalentMinor } from "./sip";

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
