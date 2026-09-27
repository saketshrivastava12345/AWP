import { describe, expect, it } from "vitest";
import { makeDetail } from "./test-fixtures";
import {
  absoluteUrl,
  detailDescription,
  detailPath,
  detailTitle,
  planChapters,
  sourcedOffer,
  type ListedPriceRow,
} from "./metadata";

describe("detailTitle", () => {
  it("names the car and what the page covers", () => {
    expect(detailTitle(makeDetail())).toBe(
      "Porsche 911 GT3 — Specifications, Performance & Price",
    );
  });

  it("does not repeat a variant that restates the model", () => {
    expect(
      detailTitle(
        makeDetail({ model: { name: "296 GTB" }, variant: { name: "296 GTB" } }),
      ),
    ).toBe("Porsche 296 GTB — Specifications, Performance & Price");
  });
});

describe("detailDescription", () => {
  it("uses published figures only", () => {
    expect(detailDescription(makeDetail())).toBe(
      "Porsche 911 GT3 (2021 – present): 510 hp, 0–100 km/h in 3.4 s, 320 km/h top speed. " +
        "Specifications, performance, dimensions, engineering and sourced prices on AURIX.",
    );
  });

  it("leaves a missing figure out rather than filling it", () => {
    const text = detailDescription(
      makeDetail({ performance: { zero_to_100_s: null, top_speed_kmh: null } }),
    );
    expect(text).toContain("510 hp.");
    expect(text).not.toMatch(/0–100|top speed|null|undefined|NaN/);
  });

  it("names an electric car's range with its test standard", () => {
    const text = detailDescription(
      makeDetail({
        variant: { fuel_type: "electric" },
        performance: null,
        ev: { range_km: 600, range_standard: "epa" },
      }),
    );
    expect(text).toBe(
      "Porsche 911 GT3 (2021 – present): 600 km range (EPA). " +
        "Specifications, performance, dimensions, engineering and sourced prices on AURIX.",
    );
  });

  it("still names the car when nothing is published", () => {
    const text = detailDescription(
      makeDetail({ performance: null, variant: { year_start: null } }),
    );
    expect(text.startsWith("Porsche 911 GT3. ")).toBe(true);
  });
});

describe("paths", () => {
  it("builds the page path and absolute URLs", () => {
    expect(detailPath(makeDetail())).toBe("/cars/porsche/911/gt3");
    expect(absoluteUrl("/cars/porsche/911/gt3", "https://aurix.example")).toBe(
      "https://aurix.example/cars/porsche/911/gt3",
    );
    expect(absoluteUrl("/images/a.jpg", "https://aurix.example/")).toBe(
      "https://aurix.example/images/a.jpg",
    );
    expect(absoluteUrl("https://cdn.example.org/a.jpg", "https://aurix.example")).toBe(
      "https://cdn.example.org/a.jpg",
    );
  });
});

describe("planChapters", () => {
  it("numbers every chapter in order by default", () => {
    expect(planChapters({}).map((chapter) => `${chapter.number} ${chapter.label}`)).toEqual([
      "01 The Machine",
      "02 Performance",
      "03 Engineering",
      "04 Technology",
      "05 Design",
      "06 Pricing",
      "07 Explore",
    ]);
  });

  it("closes up the numbers when a chapter is left out", () => {
    const chapters = planChapters({ technology: false });
    expect(chapters.map((chapter) => chapter.id)).not.toContain("technology");
    expect(chapters.find((chapter) => chapter.id === "design")?.number).toBe("04");
    expect(chapters.at(-1)?.number).toBe("06");
  });
});

describe("sourcedOffer", () => {
  const row = (overrides: Partial<ListedPriceRow>): ListedPriceRow => ({
    listed_price: "2815000.00",
    listed_price_currency: "inr",
    listed_price_type: "ex_showroom",
    listed_price_market: "Mumbai, Maharashtra, India",
    listed_price_verified_at: "2026-09-01T00:00:00Z",
    ...overrides,
  });

  it("offers a sourced market price as published, in its own currency", () => {
    expect(sourcedOffer(row({}))).toEqual({
      amount: 2815000,
      currency: "INR",
      areaServed: "Mumbai, Maharashtra, India",
      validFrom: "2026-09-01",
      priceType: "ex_showroom",
    });
  });

  it("never offers the unsourced base price or an estimate", () => {
    expect(sourcedOffer(row({ listed_price_type: "base_price" }))).toBeNull();
    expect(sourcedOffer(row({ listed_price_type: "estimated_on_road" }))).toBeNull();
    expect(sourcedOffer(null)).toBeNull();
  });

  it("rejects a missing amount or a malformed currency", () => {
    expect(sourcedOffer(row({ listed_price: null }))).toBeNull();
    expect(sourcedOffer(row({ listed_price: "0" }))).toBeNull();
    expect(sourcedOffer(row({ listed_price_currency: "rupees" }))).toBeNull();
  });
});
