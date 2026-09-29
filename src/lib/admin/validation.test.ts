import { describe, expect, it } from "vitest";
import {
  FieldReader,
  addDays,
  formValues,
  isIsoDate,
  isUuid,
  parseNumber,
  readProvenance,
  slugify,
  todayIso,
} from "./validation";

const reader = (record: Record<string, string>) => FieldReader.fromRecord(record);

describe("parseNumber", () => {
  it("accepts plain and grouped numbers", () => {
    expect(parseNumber("1250")).toBe(1250);
    expect(parseNumber("1,250")).toBe(1250);
    expect(parseNumber("2,80,00,000")).toBe(28_000_000);
    expect(parseNumber("1 250.5")).toBe(1250.5);
    expect(parseNumber(".5")).toBe(0.5);
  });

  it("refuses anything that is not a number instead of guessing", () => {
    expect(parseNumber("12abc")).toBeNull();
    expect(parseNumber("1e5")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("₹100")).toBeNull();
    expect(parseNumber("1.2.3")).toBeNull();
  });

  it("refuses decimal commas and malformed grouping instead of dropping the separator", () => {
    expect(parseNumber("3,2")).toBeNull();
    expect(parseNumber("82,5")).toBeNull();
    expect(parseNumber("1,5")).toBeNull();
    expect(parseNumber("12 34")).toBeNull();
    expect(parseNumber("45000,50")).toBeNull();
    expect(parseNumber("1,2345")).toBeNull();
    expect(parseNumber("1_250")).toBe(1250);
    expect(parseNumber("1,250,000.75")).toBe(1_250_000.75);
  });

  it("tells the editor to use a dot for decimals", () => {
    const r = reader({ t: "3,2" });
    expect(r.number("t", "0-100", { above: 0, max: 99.99, scale: 2 })).toBeNull();
    expect(r.errors.t).toMatch(/Use a dot for decimals/);
  });
});

describe("FieldReader.number", () => {
  it("reads empty as null, never as a default", () => {
    const r = reader({ power_hp: "" });
    expect(r.number("power_hp", "Power", { above: 0 })).toBeNull();
    expect(r.ok).toBe(true);
  });

  it("enforces the database's > 0 and ranges", () => {
    const r = reader({ a: "0", b: "-5", c: "17", d: "3.14159", e: "650" });
    expect(r.number("a", "Power", { above: 0 })).toBeNull();
    expect(r.errors.a).toMatch(/greater than 0/);
    expect(r.number("b", "Boot", { min: 0 })).toBeNull();
    expect(r.errors.b).toMatch(/at least 0/);
    expect(r.number("c", "Cylinders", { min: 1, max: 16 })).toBeNull();
    expect(r.errors.c).toMatch(/at most 16/);
    expect(r.number("d", "0–100", { above: 0, scale: 2 })).toBeNull();
    expect(r.errors.d).toMatch(/2 decimal places/);
    expect(r.number("e", "Power", { above: 0, max: 5000 })).toBe(650);
  });

  it("requires whole numbers for integer columns", () => {
    const r = reader({ seats: "4.5" });
    expect(r.number("seats", "Seats", { min: 1, max: 9 })).toBeNull();
    expect(r.errors.seats).toMatch(/whole number/);
  });

  it("flags a required number", () => {
    const r = reader({});
    r.number("x", "Price", { required: true });
    expect(r.errors.x).toBe("Price is required.");
  });
});

describe("FieldReader text formats", () => {
  it("validates years 1885–2100", () => {
    const r = reader({ a: "1884", b: "2101", c: "2024" });
    expect(r.year("a", "Year")).toBeNull();
    expect(r.year("b", "Year")).toBeNull();
    expect(r.year("c", "Year")).toBe(2024);
    expect(Object.keys(r.errors)).toEqual(["a", "b"]);
  });

  it("validates ISO currency codes (upper-casing input)", () => {
    const r = reader({ a: "inr", b: "RUPEE", c: "US" });
    expect(r.currency("a", "Currency")).toBe("INR");
    expect(r.currency("b", "Currency")).toBeNull();
    expect(r.currency("c", "Currency")).toBeNull();
  });

  it("accepts only http(s) URLs", () => {
    const r = reader({
      a: "https://www.porsche.com/india/models/911/",
      b: "ftp://example.com/file",
      c: "javascript:alert(1)",
      d: "www.example.com",
      e: "http://example.com",
    });
    expect(r.url("a", "URL")).toBe("https://www.porsche.com/india/models/911/");
    expect(r.url("b", "URL")).toBeNull();
    expect(r.url("c", "URL")).toBeNull();
    expect(r.url("d", "URL")).toBeNull();
    expect(r.url("e", "URL")).toBe("http://example.com");
  });

  it("validates slugs like the database domain", () => {
    const r = reader({
      a: "turbo-s",
      b: "Turbo S",
      c: "turbo--s",
      d: "-turbo",
      e: "gt3-rs-2",
    });
    expect(r.slug("a", "Slug")).toBe("turbo-s");
    expect(r.slug("b", "Slug")).toBeNull();
    expect(r.slug("c", "Slug")).toBeNull();
    expect(r.slug("d", "Slug")).toBeNull();
    expect(r.slug("e", "Slug")).toBe("gt3-rs-2");
  });

  it("validates calendar dates and bounds", () => {
    const r = reader({
      a: "2026-02-30",
      b: "2026-09-27",
      c: "2027-01-01",
      d: "27/09/2026",
    });
    expect(r.date("a", "Date")).toBeNull();
    expect(r.date("b", "Date", { notAfter: "2026-09-27" })).toBe("2026-09-27");
    expect(r.date("c", "Date", { notAfter: "2026-09-27" })).toBeNull();
    expect(r.errors.c).toMatch(/cannot be after/);
    expect(r.date("d", "Date")).toBeNull();
  });

  it("validates uuids and choices", () => {
    const r = reader({
      id: "0f8fad5b-d9cb-469f-a165-70867728950e",
      bad: "42",
      fuel: "electric",
      other: "steam",
    });
    expect(r.uuid("id", "Model")).toBe("0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(r.uuid("bad", "Model")).toBeNull();
    expect(r.choice("fuel", "Fuel", ["petrol", "electric"] as const)).toBe("electric");
    expect(r.choice("other", "Fuel", ["petrol", "electric"] as const)).toBeNull();
    expect(r.errors.other).toMatch(/not a valid option/);
  });

  it("reads hex colours and text limits", () => {
    const r = reader({ hex: "#1a2b3c", badHex: "red", name: "x".repeat(201) });
    expect(r.hex("hex", "Colour")).toBe("#1A2B3C");
    expect(r.hex("badHex", "Colour")).toBeNull();
    expect(r.text("name", "Name")).toBeNull();
    expect(r.errors.name).toMatch(/at most 200/);
  });

  it("needs an explicit answer for tri-state questions", () => {
    expect(reader({ q: "true" }).answer("q", "Answer it")).toBe(true);
    expect(reader({ q: "false" }).answer("q", "Answer it")).toBe(false);
    const r = reader({});
    expect(r.answer("q", "Answer it")).toBeNull();
    expect(r.errors.q).toBe("Answer it");
  });

  it("reads checkboxes", () => {
    const r = reader({ a: "on", b: "", c: "false" });
    expect(r.boolean("a")).toBe(true);
    expect(r.boolean("b")).toBe(false);
    expect(r.boolean("c")).toBe(false);
  });
});

describe("readProvenance", () => {
  const today = "2026-09-27";

  it("requires a source once figures exist", () => {
    const r = reader({});
    readProvenance(r, { hasData: true, today });
    expect(r.errors.source).toMatch(/required/);
  });

  it("refuses a verification date without a source", () => {
    const r = reader({ last_verified_at: "2026-09-01" });
    readProvenance(r, { hasData: false, today });
    expect(r.errors.source).toMatch(/verified against/);
  });

  it("refuses future verification dates", () => {
    const r = reader({ source: "Porsche AG", last_verified_at: "2026-10-01" });
    readProvenance(r, { hasData: true, today });
    expect(r.errors.last_verified_at).toMatch(/cannot be after/);
  });

  it("returns clean provenance", () => {
    const r = reader({
      source: "Porsche AG press kit",
      source_url: "https://newsroom.porsche.com/",
      last_verified_at: "2026-09-01",
    });
    expect(readProvenance(r, { hasData: true, today })).toEqual({
      source: "Porsche AG press kit",
      source_url: "https://newsroom.porsche.com/",
      last_verified_at: "2026-09-01",
    });
    expect(r.ok).toBe(true);
  });
});

describe("helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Model S Plaid")).toBe("model-s-plaid");
    expect(slugify("Škoda Octavia RS")).toBe("skoda-octavia-rs");
    expect(slugify("  911 GT3 RS (992)  ")).toBe("911-gt3-rs-992");
    expect(slugify("Rolls & Royce")).toBe("rolls-and-royce");
  });

  it("handles dates", () => {
    expect(todayIso(new Date("2026-09-27T23:59:00Z"))).toBe("2026-09-27");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
  });

  it("recognises uuids", () => {
    expect(isUuid("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("collects form values without React's action fields", () => {
    const form = new FormData();
    form.set("name", "Turbo S");
    form.set("$ACTION_ID_abc", "");
    expect(formValues(form)).toEqual({ name: "Turbo S" });
  });
});
