import { describe, expect, it } from "vitest";
import type { MarketGeography, MarketPrice } from "@/types/domain";
import {
  buildBreakdown,
  daysSince,
  pricesForSelection,
  priceHistory,
  primaryPrice,
  scopeOf,
} from "./engine";
import {
  defaultSelection,
  pricedMarketIds,
  selectionFromPath,
  selectionLabel,
  selectionToPath,
} from "./selection";

// Fixture ids. The amounts below are arbitrary test numbers, not prices.
const IN = "country-in";
const DE = "country-de";
const MH = "region-mh";
const KA = "region-ka";
const MUMBAI = "city-mumbai";
const PUNE = "city-pune";

let seq = 0;
function price(overrides: Partial<MarketPrice>): MarketPrice {
  seq += 1;
  return {
    id: `p${seq}`,
    variant_id: "variant",
    country_id: IN,
    region_id: null,
    city_id: null,
    currency: "INR",
    price_type: "ex_showroom",
    ex_showroom_price: 1000,
    rto_tax: null,
    registration_fee: null,
    insurance_estimate: null,
    handling_charges: null,
    fastag: null,
    other_charges: null,
    on_road_price: null,
    source: "Test source",
    source_url: "https://example.com",
    effective_from: "2026-01-01",
    effective_to: null,
    last_verified_at: "2026-09-01",
    is_verified: true,
    notes: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("scopeOf", () => {
  it("is as specific as the most specific id present", () => {
    expect(scopeOf({ region_id: null, city_id: null })).toBe("country");
    expect(scopeOf({ region_id: MH, city_id: null })).toBe("region");
    expect(scopeOf({ region_id: MH, city_id: MUMBAI })).toBe("city");
  });
});

describe("pricesForSelection", () => {
  const national = price({});
  const maharashtra = price({ region_id: MH, ex_showroom_price: 1100 });
  const mumbai = price({ region_id: MH, city_id: MUMBAI, ex_showroom_price: 1200 });
  const pune = price({ region_id: MH, city_id: PUNE, ex_showroom_price: 1150 });
  const karnataka = price({ region_id: KA, ex_showroom_price: 1300 });
  const germany = price({ country_id: DE, currency: "EUR", ex_showroom_price: 900 });
  const all = [national, maharashtra, mumbai, pune, karnataka, germany];

  it("returns nothing without a country", () => {
    expect(
      pricesForSelection(all, { countryId: null, regionId: null, cityId: null }),
    ).toEqual([]);
  });

  it("orders city, then state, then national, and excludes other cities and states", () => {
    const resolved = pricesForSelection(all, {
      countryId: IN,
      regionId: MH,
      cityId: MUMBAI,
    });
    expect(resolved.map((entry) => entry.price.id)).toEqual([
      mumbai.id,
      maharashtra.id,
      national.id,
    ]);
    expect(resolved[0]?.exact).toBe(true);
    expect(resolved[1]?.exact).toBe(false);
  });

  it("falls back to the state price for a city with none of its own", () => {
    const resolved = pricesForSelection([national, maharashtra], {
      countryId: IN,
      regionId: MH,
      cityId: PUNE,
    });
    expect(primaryPrice(resolved)?.price.id).toBe(maharashtra.id);
    expect(primaryPrice(resolved)?.exact).toBe(false);
  });

  it("never uses another country's price", () => {
    const resolved = pricesForSelection(all, {
      countryId: DE,
      regionId: null,
      cityId: null,
    });
    expect(resolved.map((entry) => entry.price.id)).toEqual([germany.id]);
  });

  it("prefers a published on-road row over a listed price at the same scope", () => {
    const listed = price({ region_id: MH, city_id: MUMBAI });
    const onRoad = price({
      region_id: MH,
      city_id: MUMBAI,
      price_type: "on_road",
      on_road_price: 1500,
    });
    const resolved = pricesForSelection([listed, onRoad], {
      countryId: IN,
      regionId: MH,
      cityId: MUMBAI,
    });
    expect(primaryPrice(resolved)?.price.id).toBe(onRoad.id);
  });

  it("has no primary price when nothing applies", () => {
    expect(primaryPrice([])).toBeNull();
  });
});

describe("buildBreakdown", () => {
  it("never labels a total on a listed row as the listed price", () => {
    const breakdown = buildBreakdown(
      price({ price_type: "ex_showroom", ex_showroom_price: 1000, on_road_price: 1200 }),
    );
    expect(breakdown.total).toBeNull();
    expect(breakdown.listed).toEqual({ amount: 1000, type: "ex_showroom" });
  });

  it("uses a published on-road total as published, never recalculated", () => {
    const breakdown = buildBreakdown(
      price({
        price_type: "on_road",
        ex_showroom_price: 1000,
        rto_tax: 130,
        insurance_estimate: 40,
        on_road_price: 1200,
      }),
    );
    expect(breakdown.total).toEqual({ amount: 1200, kind: "published", type: "on_road" });
    expect(breakdown.listed).toEqual({ amount: 1000, type: "ex_showroom" });
    expect(breakdown.components.map((line) => line.key)).toEqual([
      "rto_tax",
      "insurance_estimate",
    ]);
  });

  it("sums components only when road tax and insurance are both recorded", () => {
    const breakdown = buildBreakdown(
      price({
        ex_showroom_price: 1000,
        rto_tax: 130,
        registration_fee: 5,
        insurance_estimate: 40,
        fastag: 1,
      }),
    );
    expect(breakdown.total).toEqual({
      amount: 1176,
      kind: "calculated",
      type: "calculated",
    });
    expect(breakdown.missingForTotal).toEqual([]);
  });

  it("refuses to sum an incomplete set and says what is missing", () => {
    const breakdown = buildBreakdown(price({ ex_showroom_price: 1000, rto_tax: 130 }));
    expect(breakdown.total).toBeNull();
    expect(breakdown.missingForTotal).toEqual(["Insurance (estimate)"]);
  });

  it("shows a bare listed price with no total at all", () => {
    const breakdown = buildBreakdown(
      price({ price_type: "manufacturer_list", ex_showroom_price: 1000 }),
    );
    expect(breakdown.listed).toEqual({ amount: 1000, type: "manufacturer_list" });
    expect(breakdown.components).toEqual([]);
    expect(breakdown.total).toBeNull();
  });

  it("accepts numeric strings the way PostgREST returns numerics", () => {
    const breakdown = buildBreakdown(
      price({
        ex_showroom_price: "1000.50" as unknown as number,
        rto_tax: "130" as unknown as number,
        insurance_estimate: "40" as unknown as number,
      }),
    );
    expect(breakdown.total?.amount).toBe(1171);
  });
});

describe("priceHistory", () => {
  it("plots the listed price for listed rows even when a total is present", () => {
    const points = priceHistory(
      [price({ ex_showroom_price: 1000, on_road_price: 1200 })],
      price({}),
    );
    expect(points.map((point) => point.amount)).toEqual([1000]);
    expect(points[0]?.source).toBe("Test source");
  });

  it("follows one scope and type, oldest first, and ignores other markets", () => {
    const rows = [
      price({
        region_id: MH,
        city_id: MUMBAI,
        effective_from: "2026-07-01",
        ex_showroom_price: 1300,
      }),
      price({
        region_id: MH,
        city_id: MUMBAI,
        effective_from: "2026-01-01",
        ex_showroom_price: 1200,
      }),
      price({
        region_id: MH,
        city_id: PUNE,
        effective_from: "2026-04-01",
        ex_showroom_price: 1250,
      }),
      price({ effective_from: "2026-04-01", ex_showroom_price: 1100 }),
    ];
    const like = rows[0]!;
    expect(priceHistory(rows, like).map((point) => point.amount)).toEqual([1200, 1300]);
  });

  it("does not mix currencies", () => {
    const rows = [
      price({ effective_from: "2026-01-01" }),
      price({ effective_from: "2026-02-01", currency: "USD" }),
    ];
    expect(priceHistory(rows, rows[0]!)).toHaveLength(1);
  });
});

describe("daysSince", () => {
  it("counts whole days in UTC", () => {
    expect(daysSince("2026-09-01", new Date("2026-09-26T23:00:00Z"))).toBe(25);
    expect(daysSince("2026-09-27", new Date("2026-09-26T00:00:00Z"))).toBe(0);
  });
});

describe("market selection paths", () => {
  const geo: MarketGeography = {
    countries: [
      {
        id: IN,
        name: "India",
        slug: "india",
        iso_code: "IN",
        flag_emoji: null,
        currency_code: "INR",
        regions: [
          {
            id: MH,
            name: "Maharashtra",
            slug: "maharashtra",
            cities: [
              { id: MUMBAI, name: "Mumbai", slug: "mumbai" },
              { id: PUNE, name: "Pune", slug: "pune" },
            ],
          },
        ],
      },
      {
        id: DE,
        name: "Germany",
        slug: "germany",
        iso_code: "DE",
        flag_emoji: null,
        currency_code: "EUR",
        regions: [],
      },
    ],
  };

  it("round-trips a full path", () => {
    const selection = selectionFromPath(geo, "india/maharashtra/mumbai");
    expect(selection).toEqual({ countryId: IN, regionId: MH, cityId: MUMBAI });
    expect(selectionToPath(geo, selection)).toBe("india/maharashtra/mumbai");
    expect(selectionLabel(geo, selection)).toBe("Mumbai, Maharashtra, India");
  });

  it("degrades to the deepest level that exists", () => {
    expect(selectionFromPath(geo, "india/maharashtra/atlantis")).toEqual({
      countryId: IN,
      regionId: MH,
      cityId: null,
    });
    expect(selectionFromPath(geo, "india/nowhere")).toEqual({
      countryId: IN,
      regionId: null,
      cityId: null,
    });
    expect(selectionFromPath(geo, "narnia").countryId).toBeNull();
  });

  it("marks the markets that have prices, and preselects the latest verified one", () => {
    const rows = [
      price({ region_id: MH, city_id: PUNE, last_verified_at: "2026-08-01" }),
      price({ country_id: DE, currency: "EUR", last_verified_at: "2026-09-10" }),
    ];
    expect([...pricedMarketIds(rows)].sort()).toEqual([DE, IN, MH, PUNE].sort());
    expect(defaultSelection(rows)).toEqual({
      countryId: DE,
      regionId: null,
      cityId: null,
    });
    expect(defaultSelection([])).toEqual({
      countryId: null,
      regionId: null,
      cityId: null,
    });
  });
});
