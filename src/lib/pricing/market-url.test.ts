import { describe, expect, it } from "vitest";
import type { MarketGeography, MarketPrice } from "@/types/domain";
import {
  MARKET_PENDING_ATTRIBUTE,
  MARKET_PENDING_SCRIPT,
  readMarketParam,
  resolveMarketSelection,
  sameSelection,
  withMarketParam,
} from "./market-url";

// Fixture ids. Amounts are arbitrary test numbers, not prices.
const IN = "country-in";
const US = "country-us";
const MH = "region-mh";
const KA = "region-ka";
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
      ],
    },
    {
      id: US,
      name: "United States",
      slug: "united-states",
      iso_code: "US",
      flag_emoji: null,
      currency_code: "USD",
      regions: [],
    },
  ],
};

function price(overrides: Partial<MarketPrice>): MarketPrice {
  return {
    id: "p1",
    variant_id: "variant",
    country_id: IN,
    region_id: MH,
    city_id: PUNE,
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

const current = [price({})];
const MUMBAI_SELECTION = { countryId: IN, regionId: MH, cityId: MUMBAI };
const PUNE_SELECTION = { countryId: IN, regionId: MH, cityId: PUNE };

describe("readMarketParam", () => {
  it("distinguishes absent from explicitly empty", () => {
    expect(readMarketParam("")).toBeNull();
    expect(readMarketParam("?tab=specs")).toBeNull();
    expect(readMarketParam("?market=")).toBe("");
    expect(readMarketParam("?market=%20")).toBe("");
  });

  it("decodes escaped and unescaped slashes alike", () => {
    expect(readMarketParam("?market=india/maharashtra/mumbai")).toBe(
      "india/maharashtra/mumbai",
    );
    expect(readMarketParam("?market=india%2Fmaharashtra%2Fmumbai")).toBe(
      "india/maharashtra/mumbai",
    );
  });
});

describe("withMarketParam", () => {
  it("adds the parameter with readable slashes", () => {
    expect(withMarketParam("", "india/maharashtra/mumbai")).toBe(
      "?market=india/maharashtra/mumbai",
    );
  });

  it("keeps other parameters and replaces an existing market", () => {
    expect(withMarketParam("?car=gt3&market=india", "india/karnataka")).toBe(
      "?car=gt3&market=india/karnataka",
    );
  });

  it("records an explicit empty choice, or removes the parameter", () => {
    expect(withMarketParam("?market=india&x=1", "")).toBe("?x=1&market=");
    expect(withMarketParam("?market=india&x=1", null)).toBe("?x=1");
    expect(withMarketParam("?market=india", null)).toBe("");
  });

  it("round-trips through readMarketParam", () => {
    const search = withMarketParam("?a=b", "india/maharashtra/pune");
    expect(readMarketParam(search)).toBe("india/maharashtra/pune");
  });
});

describe("resolveMarketSelection priority", () => {
  it("prefers the URL over storage and the default", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "india/maharashtra/mumbai",
        storedPath: "india/karnataka/bengaluru",
      }),
    ).toEqual({ selection: MUMBAI_SELECTION, source: "url" });
  });

  it("uses storage when the URL has no market", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: null,
        storedPath: "india/maharashtra/mumbai",
      }),
    ).toEqual({ selection: MUMBAI_SELECTION, source: "storage" });
  });

  it("falls back to the most recently verified price's market", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: null,
        storedPath: null,
      }),
    ).toEqual({ selection: PUNE_SELECTION, source: "default" });
  });

  it("selects nothing when there is nothing to go on", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current: [],
        urlPath: null,
        storedPath: null,
      }),
    ).toEqual({
      selection: { countryId: null, regionId: null, cityId: null },
      source: "none",
    });
  });

  it("honours an explicit empty URL choice instead of re-selecting a default", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "",
        storedPath: "india/maharashtra/mumbai",
      }),
    ).toEqual({
      selection: { countryId: null, regionId: null, cityId: null },
      source: "url",
    });
  });

  it("skips an unknown URL market rather than blanking the section", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "atlantis/north",
        storedPath: "india/maharashtra/mumbai",
      }).source,
    ).toBe("storage");
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "atlantis",
        storedPath: "nowhere",
      }).source,
    ).toBe("default");
  });

  it("keeps the deepest valid level of a partly stale link", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "india/maharashtra/atlantis",
        storedPath: null,
      }),
    ).toEqual({
      selection: { countryId: IN, regionId: MH, cityId: null },
      source: "url",
    });
  });

  it("lets a country with no regions stand alone", () => {
    expect(
      resolveMarketSelection({
        geography: geo,
        current,
        urlPath: "united-states",
        storedPath: null,
      }).selection,
    ).toEqual({ countryId: US, regionId: null, cityId: null });
  });
});

describe("sameSelection", () => {
  it("compares all three levels", () => {
    expect(sameSelection(MUMBAI_SELECTION, { ...MUMBAI_SELECTION })).toBe(true);
    expect(sameSelection(MUMBAI_SELECTION, PUNE_SELECTION)).toBe(false);
  });
});

describe("MARKET_PENDING_SCRIPT", () => {
  /** Runs the inline script against a stub document and reports what it did. */
  function run({ search, stored }: { search: string; stored: string | null }) {
    const attributes = new Map<string, string>();
    const timers: (() => void)[] = [];
    const root = {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    };
    const execute = new Function(
      "document",
      "location",
      "localStorage",
      "setTimeout",
      MARKET_PENDING_SCRIPT,
    ) as (...args: unknown[]) => void;
    execute(
      { currentScript: { parentElement: root } },
      { search },
      { getItem: () => stored },
      (callback: () => void) => timers.push(callback),
    );
    return { attributes, timers };
  }

  it("marks the section when the URL names a market", () => {
    const { attributes, timers } = run({ search: "?market=india", stored: null });
    expect(attributes.has(MARKET_PENDING_ATTRIBUTE)).toBe(true);
    // The safety timer always lifts it.
    timers.forEach((timer) => timer());
    expect(attributes.has(MARKET_PENDING_ATTRIBUTE)).toBe(false);
  });

  it("marks the section when a market is remembered", () => {
    expect(
      run({ search: "", stored: "india/maharashtra" }).attributes.has(
        MARKET_PENDING_ATTRIBUTE,
      ),
    ).toBe(true);
  });

  it("leaves the default visible when there is nothing to apply", () => {
    const { attributes, timers } = run({ search: "?car=gt3", stored: null });
    expect(attributes.size).toBe(0);
    expect(timers).toHaveLength(0);
  });
});
