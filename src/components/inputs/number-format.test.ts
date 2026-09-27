import { describe, expect, it } from "vitest";
import {
  countSignificant,
  currencyAffixes,
  formatRaw,
  integerDigits,
  isDecimalChar,
  localeSeparators,
  mapCaret,
  rawToNumber,
  sanitizeRaw,
} from "./number-format";

const EN_IN = { decimal: ".", maxDigits: 12, decimals: 0 };
const EN_IN_PAISE = { ...EN_IN, decimals: 2 };
const DE = { decimal: ",", maxDigits: 12, decimals: 2 };

describe("localeSeparators", () => {
  it("knows the Indian, US and German conventions", () => {
    expect(localeSeparators("en-IN")).toEqual({ group: ",", decimal: "." });
    expect(localeSeparators("en-US")).toEqual({ group: ",", decimal: "." });
    expect(localeSeparators("de-DE")).toEqual({ group: ".", decimal: "," });
  });
});

describe("formatRaw", () => {
  it("groups in lakhs and crores for en-IN", () => {
    expect(formatRaw("1250000", "en-IN")).toBe("12,50,000");
    expect(formatRaw("123456789012", "en-IN")).toBe("1,23,45,67,89,012");
    expect(formatRaw("999", "en-IN")).toBe("999");
    expect(formatRaw("1000", "en-IN")).toBe("1,000");
  });

  it("groups in thousands for en-US and with points for de-DE", () => {
    expect(formatRaw("1250000", "en-US")).toBe("1,250,000");
    expect(formatRaw("1250000", "de-DE")).toBe("1.250.000");
  });

  it("keeps the fraction exactly as typed, including a trailing point", () => {
    expect(formatRaw("1250.5", "en-IN")).toBe("1,250.5");
    expect(formatRaw("1250.", "en-IN")).toBe("1,250.");
    expect(formatRaw("1250.50", "de-DE")).toBe("1.250,50");
    expect(formatRaw("0.", "en-US")).toBe("0.");
  });

  it("renders nothing for an empty raw value", () => {
    expect(formatRaw("", "en-IN")).toBe("");
  });

  it("does not lose precision on long amounts", () => {
    expect(formatRaw("123456789012345678", "en-US")).toBe("123,456,789,012,345,678");
  });
});

describe("sanitizeRaw", () => {
  it("strips grouping, currency symbols and spaces", () => {
    expect(sanitizeRaw("12,50,000", EN_IN)).toBe("1250000");
    expect(sanitizeRaw("₹ 12,50,000", EN_IN)).toBe("1250000");
    expect(sanitizeRaw("1 250 000", EN_IN)).toBe("1250000");
    expect(sanitizeRaw("1.250.000", DE)).toBe("1250000");
  });

  it("drops letters and other noise instead of guessing", () => {
    expect(sanitizeRaw("12abc50", EN_IN)).toBe("1250");
    expect(sanitizeRaw("abc", EN_IN)).toBe("");
    expect(sanitizeRaw("", EN_IN)).toBe("");
  });

  it("cuts at the decimal point when no decimals are allowed", () => {
    expect(sanitizeRaw("12,50,000.00", EN_IN)).toBe("1250000");
    expect(sanitizeRaw("1250.", EN_IN)).toBe("1250");
    expect(sanitizeRaw(".5", EN_IN)).toBe("");
  });

  it("keeps one decimal point and caps the fraction", () => {
    expect(sanitizeRaw("1250.5", EN_IN_PAISE)).toBe("1250.5");
    expect(sanitizeRaw("1250.", EN_IN_PAISE)).toBe("1250.");
    expect(sanitizeRaw("1250.567", EN_IN_PAISE)).toBe("1250.56");
    expect(sanitizeRaw("1.2.3", EN_IN_PAISE)).toBe("1.23");
    expect(sanitizeRaw(".5", EN_IN_PAISE)).toBe("0.5");
    expect(sanitizeRaw(".", EN_IN_PAISE)).toBe("0.");
  });

  it("reads a comma as the decimal point for de-DE and a point as grouping", () => {
    expect(sanitizeRaw("1.250.000,50", DE)).toBe("1250000.50");
    expect(sanitizeRaw("1250,5", DE)).toBe("1250.5");
  });

  it("accepts the keyboard's point as a decimal wherever it is not a group separator", () => {
    expect(isDecimalChar(".", ".")).toBe(true);
    expect(isDecimalChar(".", ",")).toBe(false);
    expect(isDecimalChar(",", ",")).toBe(true);
    expect(isDecimalChar(",", ".")).toBe(false);
    expect(isDecimalChar(".", "٫")).toBe(true);
  });

  it("removes leading zeros but keeps a lone zero and the zero before a point", () => {
    expect(sanitizeRaw("007", EN_IN)).toBe("7");
    expect(sanitizeRaw("0", EN_IN)).toBe("0");
    expect(sanitizeRaw("00", EN_IN)).toBe("0");
    expect(sanitizeRaw("0.5", EN_IN_PAISE)).toBe("0.5");
    expect(sanitizeRaw("00.5", EN_IN_PAISE)).toBe("0.5");
  });

  it("caps the integer part at maxDigits", () => {
    expect(sanitizeRaw("1234567890123", EN_IN)).toBe("123456789012");
    expect(sanitizeRaw("1234", { ...EN_IN, maxDigits: 3 })).toBe("123");
  });
});

describe("caret mapping", () => {
  it("counts digits and not separators", () => {
    expect(countSignificant("12,50,000", 3, ".", 0)).toBe(2);
    expect(countSignificant("12,50,000", 9, ".", 0)).toBe(7);
    expect(countSignificant("1,250.5", 7, ".", 2)).toBe(6);
    expect(countSignificant("1,250.5", 7, ".", 0)).toBe(5);
    expect(countSignificant("abc", 10, ".", 0)).toBe(0);
  });

  it("keeps the caret after the same digits when grouping shifts", () => {
    // "12|,50,000" + "3" -> "123,50,000" (caret 3) -> "1,23,50,000"
    expect(mapCaret("123,50,000", 3, "1,23,50,000", ".", 0)).toBe(4);
    // Typing at the end stays at the end.
    expect(mapCaret("12,50,0001", 10, "1,25,00,001", ".", 0)).toBe(11);
    // Deleting the first digit.
    expect(mapCaret(",50,000", 0, "50,000", ".", 0)).toBe(0);
  });

  it("lands the caret after a freshly typed decimal point", () => {
    expect(mapCaret("1,250.", 6, "1,250.", ".", 2)).toBe(6);
    expect(mapCaret("1250,", 5, "1.250,", ",", 2)).toBe(6);
  });

  it("falls back to the end when the text lost characters", () => {
    expect(mapCaret("1,250.75", 8, "1,250", ".", 0)).toBe(5);
  });
});

describe("currencyAffixes", () => {
  it("puts the rupee and dollar before, and the euro after with a space", () => {
    expect(currencyAffixes("INR", "en-IN")).toEqual({ prefix: "₹", suffix: "" });
    expect(currencyAffixes("USD", "en-US")).toEqual({ prefix: "$", suffix: "" });
    const euro = currencyAffixes("EUR", "de-DE");
    expect(euro.prefix).toBe("");
    expect(euro.suffix.replace(/\s/g, " ")).toBe(" €");
  });

  it("gives no affix without a currency", () => {
    expect(currencyAffixes(undefined, "en-IN")).toEqual({ prefix: "", suffix: "" });
    expect(currencyAffixes("", "en-IN")).toEqual({ prefix: "", suffix: "" });
  });

  it("never throws for a malformed code", () => {
    expect(currencyAffixes("not-a-code", "en-IN")).toEqual({ prefix: "", suffix: "" });
  });
});

describe("rawToNumber / integerDigits", () => {
  it("reads finished and unfinished raw values", () => {
    expect(rawToNumber("1250000")).toBe(1250000);
    expect(rawToNumber("1250.5")).toBe(1250.5);
    expect(rawToNumber("1250.")).toBe(1250);
    expect(rawToNumber("0.")).toBe(0);
    expect(rawToNumber("")).toBeNull();
  });

  it("counts integer digits only", () => {
    expect(integerDigits("1250.5")).toBe(4);
    expect(integerDigits("1250")).toBe(4);
    expect(integerDigits("")).toBe(0);
  });
});
