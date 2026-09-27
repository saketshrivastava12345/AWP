import { describe, expect, it } from "vitest";
import type { MarketGeography, MarketPrice } from "@/types/domain";
import { buildBreakdown } from "./engine";
import {
  fallbackNotice,
  freshness,
  headlineFigure,
  isHttpUrl,
  joinList,
  marketLabel,
  missingTotalMessage,
  partitionPriced,
  pricedMarkets,
  publishedFigure,
  scopeName,
  todayUtc,
  totalCaption,
} from "./presentation";

// Fixture ids. Amounts are arbitrary test numbers, not prices.
const IN = "country-in";
const MH = "region-mh";
const KA = "region-ka";
const DL = "region-dl";
const MUMBAI = "city-mumbai";
const PUNE = "city-pune";
const BENGALURU = "city-bengaluru";

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
        {
          id: KA,
          name: "Karnataka",
          slug: "karnataka",
          cities: [{ id: BENGALURU, name: "Bengaluru", slug: "bengaluru" }],
        },
        { id: DL, name: "Delhi", slug: "delhi", cities: [] },
      ],
    },
  ],
};

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

describe("market labels", () => {
  it("reads most specific first", () => {
    expect(marketLabel(geo, { countryId: IN, regionId: MH, cityId: MUMBAI })).toBe(
      "Mumbai, Maharashtra, India",
    );
    expect(marketLabel(geo, { countryId: IN, regionId: null, cityId: null })).toBe(
      "India",
    );
  });

  it("never prints an empty label for an unknown market", () => {
    expect(marketLabel(geo, { countryId: "gone", regionId: null, cityId: null })).toBe(
      "Unlisted market",
    );
  });

  it("names the scope a price row applies to", () => {
    expect(scopeName(geo, price({ region_id: MH, city_id: MUMBAI }))).toBe("Mumbai");
    expect(scopeName(geo, price({ region_id: MH }))).toBe("Maharashtra");
    expect(scopeName(geo, price({}))).toBe("India (national)");
  });
});

describe("fallbackNotice", () => {
  const mumbai = { countryId: IN, regionId: MH, cityId: MUMBAI };

  it("is silent when the price is for exactly the chosen market", () => {
    expect(fallbackNotice(geo, mumbai, { exact: true, scope: "city" })).toBeNull();
  });

  it("says plainly when a state price stands in for a city", () => {
    expect(fallbackNotice(geo, mumbai, { exact: false, scope: "region" })).toBe(
      "No Mumbai-specific price recorded — showing the Maharashtra price.",
    );
  });

  it("says plainly when a national price stands in", () => {
    expect(
      fallbackNotice(
        geo,
        { countryId: IN, regionId: KA, cityId: BENGALURU },
        { exact: false, scope: "country" },
      ),
    ).toBe(
      "No Bengaluru-specific price recorded — showing the national price for India.",
    );
    expect(
      fallbackNotice(
        geo,
        { countryId: IN, regionId: KA, cityId: null },
        { exact: false, scope: "country" },
      ),
    ).toBe(
      "No Karnataka-specific price recorded — showing the national price for India.",
    );
  });
});

describe("headlineFigure and totalCaption", () => {
  it("leads with a published on-road total, labelled as published", () => {
    const breakdown = buildBreakdown(
      price({
        price_type: "on_road",
        ex_showroom_price: 1000,
        rto_tax: 120,
        insurance_estimate: 40,
        on_road_price: 1170,
      }),
    );
    expect(headlineFigure(breakdown)).toMatchObject({
      amount: 1170,
      label: "On-road price",
      kind: "published",
    });
    expect(totalCaption(breakdown.total!)).toEqual({
      label: "On-road price",
      detail: "Published by source",
    });
  });

  it("labels AURIX's own sum as calculated, never as an on-road price", () => {
    const breakdown = buildBreakdown(
      price({ ex_showroom_price: 1000, rto_tax: 120, insurance_estimate: 40 }),
    );
    const headline = headlineFigure(breakdown);
    expect(headline).toMatchObject({
      amount: 1160,
      label: "Calculated on-road",
      kind: "calculated",
    });
    expect(headline?.note).toMatch(/not a quotation/i);
    expect(totalCaption(breakdown.total!)).toEqual({
      label: "Calculated on-road",
      detail: "Sum of the published components, not a quotation",
    });
  });

  it("falls back to the listed price, with that type's own label", () => {
    const breakdown = buildBreakdown(
      price({ price_type: "manufacturer_list", ex_showroom_price: 900 }),
    );
    expect(headlineFigure(breakdown)).toMatchObject({
      amount: 900,
      label: "Manufacturer list price",
      kind: "listed",
    });
  });

  it("takes an estimated on-road figure at its word, and its name", () => {
    const breakdown = buildBreakdown(
      price({
        price_type: "estimated_on_road",
        ex_showroom_price: null,
        on_road_price: 1500,
      }),
    );
    expect(headlineFigure(breakdown)?.label).toBe("Estimated on-road");
  });

  it("accepts numeric strings as PostgREST can return them", () => {
    const row = price({ ex_showroom_price: "34800000.00" as unknown as number });
    expect(headlineFigure(buildBreakdown(row))?.amount).toBe(34_800_000);
    expect(publishedFigure(row)?.amount).toBe(34_800_000);
  });
});

describe("missing totals", () => {
  it("names what is missing", () => {
    expect(missingTotalMessage(["RTO / road tax", "Insurance (estimate)"])).toBe(
      "No on-road total: RTO / road tax and Insurance (estimate) are not recorded for this market, so AURIX does not add one up.",
    );
    expect(missingTotalMessage(["Insurance (estimate)"])).toMatch(
      /Insurance \(estimate\) is not recorded/,
    );
  });

  it("joins lists the way a sentence does", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["A"])).toBe("A");
    expect(joinList(["A", "B"])).toBe("A and B");
    expect(joinList(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("publishedFigure", () => {
  it("shows the figure the row's type names", () => {
    const listedWithTotal = price({ ex_showroom_price: 1000, on_road_price: 1300 });
    expect(publishedFigure(listedWithTotal)).toEqual({
      amount: 1000,
      currency: "INR",
      label: "Ex-showroom",
    });
    const onRoad = price({ price_type: "on_road", on_road_price: 1300 });
    expect(publishedFigure(onRoad)?.amount).toBe(1300);
  });
});

describe("freshness", () => {
  it("claims nothing relative until today is known", () => {
    expect(freshness("2026-09-01", null)).toBeNull();
  });

  it("counts days and flags prices older than the threshold", () => {
    expect(freshness("2026-09-27", "2026-09-27")).toEqual({
      days: 0,
      stale: false,
      relative: "today",
    });
    expect(freshness("2026-09-26", "2026-09-27")?.relative).toBe("yesterday");
    expect(freshness("2025-12-01", "2026-09-27")).toEqual({
      days: 300,
      stale: true,
      relative: "300 days ago",
    });
    // Exactly at the threshold is not yet stale.
    expect(freshness("2026-03-31", "2026-09-27")).toMatchObject({
      days: 180,
      stale: false,
    });
  });

  it("formats today in UTC", () => {
    expect(todayUtc(new Date("2026-09-27T23:30:00Z"))).toBe("2026-09-27");
  });
});

describe("pricedMarkets", () => {
  it("lists each priced market once, country → state → city, with its own figure", () => {
    const rows = [
      price({ region_id: MH, city_id: PUNE, ex_showroom_price: 1100 }),
      price({ price_type: "manufacturer_list", ex_showroom_price: 900 }),
      price({
        region_id: MH,
        city_id: MUMBAI,
        price_type: "on_road",
        ex_showroom_price: 1000,
        on_road_price: 1300,
      }),
      price({ region_id: MH, city_id: MUMBAI, ex_showroom_price: 1000 }),
      price({ region_id: MH, ex_showroom_price: 1000 }),
    ];
    const markets = pricedMarkets(geo, rows);
    expect(markets.map((market) => market.label)).toEqual([
      "India",
      "Maharashtra, India",
      "Mumbai, Maharashtra, India",
      "Pune, Maharashtra, India",
    ]);
    // Mumbai's on-road total wins over its ex-showroom row.
    expect(markets[2]?.figure).toEqual({
      amount: 1300,
      currency: "INR",
      label: "On-road price",
      source: "Test source",
      last_verified_at: "2026-09-01",
    });
    expect(markets[0]?.selection).toEqual({
      countryId: IN,
      regionId: null,
      cityId: null,
    });
  });

  it("is empty without prices", () => {
    expect(pricedMarkets(geo, [])).toEqual([]);
  });
});

describe("partitionPriced", () => {
  it("splits and keeps order", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(partitionPriced(items, new Set(["c", "a"]))).toEqual({
      priced: [{ id: "a" }, { id: "c" }],
      other: [{ id: "b" }],
    });
  });
});

describe("isHttpUrl", () => {
  it("only lets http(s) links through", () => {
    expect(isHttpUrl("https://example.com/price")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });
});
