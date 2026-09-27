import { describe, expect, it } from "vitest";
import {
  EM_DASH,
  NOT_AVAILABLE,
  carDisplayName,
  distinctVariantName,
  formatDate,
  formatPrice,
  formatPriceCompact,
  formatNumberRange,
  formatYearRange,
  firstSentence,
  formatYearSpan,
  modelVariantName,
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

describe("modelVariantName", () => {
  it("joins a distinct variant to the model", () => {
    expect(modelVariantName("911", "GT3")).toBe("911 GT3");
  });
  it("drops a variant that repeats or is contained in the model", () => {
    expect(modelVariantName("SF90 Stradale", "SF90 Stradale")).toBe("SF90 Stradale");
    expect(modelVariantName("Civic Type R", "Type R")).toBe("Civic Type R");
  });
  it("shows a variant that already names the model on its own", () => {
    expect(modelVariantName("M3", "M3 Competition")).toBe("M3 Competition");
  });
  it("copes with missing parts", () => {
    expect(modelVariantName("Model S", null)).toBe("Model S");
    expect(modelVariantName(null, "Plaid")).toBe("Plaid");
  });
});

describe("formatYearSpan and formatNumberRange", () => {
  it("uses an en dash without spaces", () => {
    expect(formatYearSpan(2021, null)).toBe("2021–present");
    expect(formatYearSpan(2019, 2024)).toBe("2019–2024");
    expect(formatYearSpan(2020, 2020)).toBe("2020");
    expect(formatYearSpan(null, 2020)).toBe(NOT_AVAILABLE);
  });
  it("formats ranges, collapsing equal ends", () => {
    expect(formatNumberRange(450, 761)).toBe("450–761");
    expect(formatNumberRange(2.7, 3.7, 1)).toBe("2.7–3.7");
    expect(formatNumberRange(510, 510)).toBe("510");
    expect(formatNumberRange(null, 5, 0, EM_DASH)).toBe(EM_DASH);
  });
});

describe("firstSentence", () => {
  it("cuts at the first sentence boundary", () => {
    expect(firstSentence("Built in Stuttgart. Known for the 911.")).toBe(
      "Built in Stuttgart.",
    );
  });
  it("does not cut at abbreviations", () => {
    expect(firstSentence("Dr. Ing. h.c. F. Porsche AG makes cars. Since 1931.")).toBe(
      "Dr. Ing. h.c. F. Porsche AG makes cars.",
    );
  });
  it("returns null for nothing and the whole text without a boundary", () => {
    expect(firstSentence(null)).toBeNull();
    expect(firstSentence("  ")).toBeNull();
    expect(firstSentence("One line only")).toBe("One line only");
  });
});
