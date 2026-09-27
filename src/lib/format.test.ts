import { describe, expect, it } from "vitest";
import {
  EM_DASH,
  NOT_AVAILABLE,
  carDisplayName,
  distinctVariantName,
  formatDate,
  formatPrice,
  formatPriceCompact,
  formatYearRange,
} from "./format";

describe("carDisplayName", () => {
  it("joins manufacturer, model and variant", () => {
    expect(carDisplayName("Porsche", "911", "GT3")).toBe("Porsche 911 GT3");
  });

  it("does not repeat a variant that restates the model", () => {
    expect(carDisplayName("Ferrari", "F8 Tributo", "F8 Tributo")).toBe(
      "Ferrari F8 Tributo",
    );
    expect(carDisplayName("BMW", "M3", "m3")).toBe("BMW M3");
  });

  it("keeps a variant that only starts with the model name", () => {
    expect(carDisplayName("BMW", "M3", "M3 Competition")).toBe("BMW M3 M3 Competition");
  });

  it("skips missing parts", () => {
    expect(carDisplayName("Tesla", "Model S", null)).toBe("Tesla Model S");
    expect(carDisplayName(null, "Model S", "Plaid")).toBe("Model S Plaid");
  });
});

describe("distinctVariantName", () => {
  it("returns null when the variant only repeats the model", () => {
    expect(distinctVariantName("SF90 Stradale", "SF90 Stradale")).toBeNull();
    expect(distinctVariantName("SF90 Stradale", "  ")).toBeNull();
  });

  it("returns the variant otherwise", () => {
    expect(distinctVariantName("911", "Turbo S")).toBe("Turbo S");
  });
});

describe("formatPrice", () => {
  it("groups rupees in lakhs and other currencies in thousands", () => {
    expect(formatPrice(28000000, "INR")).toBe("₹2,80,00,000");
    expect(formatPrice(161100, "USD")).toBe("$161,100");
  });

  it("accepts numeric strings from PostgREST", () => {
    expect(formatPrice("4560000", "INR")).toBe("₹45,60,000");
  });

  it("never prints a price without both parts", () => {
    expect(formatPrice(null, "INR")).toBe(NOT_AVAILABLE);
    expect(formatPrice(100, null, EM_DASH)).toBe(EM_DASH);
  });

  it("degrades on an unknown currency code", () => {
    expect(formatPrice(1000, "ZZZ1")).toBe("ZZZ1 1,000");
  });
});

describe("formatPriceCompact", () => {
  it("uses crore and lakh for rupees", () => {
    expect(formatPriceCompact(28000000, "INR")).toBe("₹2.80 Cr");
    expect(formatPriceCompact(4560000, "INR")).toBe("₹45.60 L");
  });

  it("uses compact notation for large amounts in other currencies", () => {
    expect(formatPriceCompact(161100, "USD")).toBe("$161.1K");
    expect(formatPriceCompact(45000, "EUR")).toBe("€45,000");
  });
});

describe("formatDate and formatYearRange", () => {
  it("formats plain dates in UTC", () => {
    expect(formatDate("2026-09-12")).toBe("12 Sep 2026");
    expect(formatDate("not a date")).toBe(NOT_AVAILABLE);
  });

  it("describes production spans", () => {
    expect(formatYearRange(2019, null)).toBe("2019 – present");
    expect(formatYearRange(2019, 2019)).toBe("2019");
    expect(formatYearRange(null, 2020)).toBe(NOT_AVAILABLE);
  });
});
