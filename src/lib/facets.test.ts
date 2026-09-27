import { describe, expect, it } from "vitest";
import { computeFacets, countMatching, rowMatches, type FacetRow } from "./facets";
import type { CarFilters } from "./car-query";

function row(overrides: Partial<FacetRow>): FacetRow {
  return {
    country_slug: null,
    country_name: null,
    manufacturer_slug: null,
    manufacturer_name: null,
    category_slug: null,
    category_name: null,
    body_type: null,
    fuel_type: null,
    transmission_type: null,
    drive_type: null,
    engine_layout: null,
    engine_cylinders: null,
    aspiration: null,
    status: null,
    power_hp: null,
    top_speed_kmh: null,
    year_start: null,
    range_km: null,
    listed_price: null,
    listed_price_currency: null,
    ...overrides,
  };
}

const ROWS: FacetRow[] = [
  row({
    country_slug: "germany",
    country_name: "Germany",
    manufacturer_slug: "porsche",
    manufacturer_name: "Porsche",
    fuel_type: "petrol",
    drive_type: "awd",
    engine_cylinders: 6,
    power_hp: 650,
    top_speed_kmh: 330,
    year_start: 2020,
    listed_price: 203500,
    listed_price_currency: "USD",
  }),
  row({
    country_slug: "germany",
    country_name: "Germany",
    manufacturer_slug: "porsche",
    manufacturer_name: "Porsche",
    fuel_type: "electric",
    drive_type: "awd",
    power_hp: 761,
    top_speed_kmh: 260,
    year_start: 2020,
    range_km: 452,
  }),
  row({
    country_slug: "italy",
    country_name: "Italy",
    manufacturer_slug: "ferrari",
    manufacturer_name: "Ferrari",
    fuel_type: "petrol",
    drive_type: "rwd",
    engine_cylinders: 8,
    power_hp: 720,
    // top speed unpublished
    year_start: 2019,
    listed_price: 35100000,
    listed_price_currency: "INR",
  }),
  row({
    country_slug: "japan",
    country_name: "Japan",
    manufacturer_slug: "toyota",
    manufacturer_name: "Toyota",
    fuel_type: "hybrid",
    drive_type: "fwd",
    engine_cylinders: 4,
    power_hp: 140,
    top_speed_kmh: 180,
    year_start: 2018,
    listed_price: 2700000,
    listed_price_currency: "INR",
    status: "available",
  }),
];

function facet(filters: CarFilters, key: string) {
  const options = computeFacets(ROWS, filters);
  return options.lists.find((entry) => entry.key === key);
}

describe("rowMatches", () => {
  it("follows SQL NULL semantics for ranges and lists", () => {
    const ferrari = ROWS[2]!;
    expect(rowMatches(ferrari, { speedMin: 1 })).toBe(false);
    expect(rowMatches(ferrari, { status: ["available"] })).toBe(false);
    expect(rowMatches(ferrari, { cylinders: [8], powerMin: 700, powerMax: 720 })).toBe(
      true,
    );
  });

  it("never compares prices across currencies", () => {
    // 2,700,000 INR is "under 3,000,000" only in rupees; the USD car is not
    // considered at all once a currency is chosen.
    const filters: CarFilters = { priceCurrency: "INR", priceMax: 3000000 };
    expect(ROWS.filter((entry) => rowMatches(entry, filters))).toEqual([ROWS[3]]);
  });

  it("can ignore one facet when counting", () => {
    expect(rowMatches(ROWS[0]!, { country: ["italy"] }, "country")).toBe(true);
  });
});

describe("computeFacets", () => {
  it("derives every option from the data, with counts", () => {
    const fuel = facet({}, "fuel");
    expect(fuel?.options.map((option) => [option.value, option.count])).toEqual([
      ["electric", 1],
      ["hybrid", 1],
      ["petrol", 2],
    ]);
    // No car is diesel or hydrogen, so neither is offered.
    expect(fuel?.options.some((option) => option.value === "diesel")).toBe(false);
  });

  it("counts each facet under every OTHER active filter", () => {
    const filters: CarFilters = { country: ["germany"], fuel: ["petrol"] };
    const country = facet(filters, "country");
    // Country counts ignore the country filter but apply fuel=petrol.
    expect(
      country?.options.map((option) => [option.value, option.count, option.selected]),
    ).toEqual([
      ["germany", 1, true],
      ["italy", 1, false],
      ["japan", 0, false],
    ]);
    const fuel = facet(filters, "fuel");
    // Fuel counts apply country=germany.
    expect(
      Object.fromEntries(fuel!.options.map((option) => [option.value, option.count])),
    ).toEqual({
      electric: 1,
      petrol: 1,
      hybrid: 0,
    });
  });

  it("sorts numeric facets numerically and labels slugs from the data", () => {
    const cylinders = facet({}, "cylinders");
    expect(cylinders?.options.map((option) => option.value)).toEqual(["4", "6", "8"]);
    expect(facet({}, "manufacturer")?.options.map((option) => option.label)).toEqual([
      "Ferrari",
      "Porsche",
      "Toyota",
    ]);
  });

  it("omits a facet no car has a value for, but keeps an active stale value", () => {
    expect(
      computeFacets(ROWS.slice(0, 3), {}).lists.some((entry) => entry.key === "status"),
    ).toBe(false);
    const stale = computeFacets(ROWS, { country: ["atlantis"] });
    const country = stale.lists.find((entry) => entry.key === "country");
    expect(country?.options.find((option) => option.value === "atlantis")).toMatchObject({
      label: "Atlantis",
      count: 0,
      selected: true,
    });
    expect(stale.total).toBe(0);
  });

  it("bounds ranges by the cars matching the other filters", () => {
    const options = computeFacets(ROWS, { country: ["germany"] });
    const power = options.ranges.find((entry) => entry.key === "power");
    expect(power?.bounds).toEqual([650, 761]);
  });

  it("keeps performance ranges when the other filters match nothing", () => {
    const options = computeFacets(ROWS, { country: ["japan"], fuel: ["electric"] });
    expect(options.total).toBe(0);
    expect(options.ranges.find((entry) => entry.key === "power")?.bounds).toEqual([
      140, 761,
    ]);
    expect(options.ranges.some((entry) => entry.key === "range")).toBe(false);
  });

  it("offers electric range only when an EV is in the result set", () => {
    const withEv = computeFacets(ROWS, { country: ["germany"] });
    expect(withEv.ranges.find((entry) => entry.key === "range")?.bounds).toEqual([
      452, 452,
    ]);
    const withoutEv = computeFacets(ROWS, { country: ["italy"] });
    expect(withoutEv.ranges.some((entry) => entry.key === "range")).toBe(false);
    // Still listed while active, so it can be changed or removed.
    const active = computeFacets(ROWS, { country: ["italy"], rangeMin: 300 });
    expect(active.ranges.find((entry) => entry.key === "range")).toMatchObject({
      bounds: null,
      min: 300,
    });
  });

  it("lists price currencies and bounds prices only within the chosen one", () => {
    const none = computeFacets(ROWS, {});
    expect(none.price?.currencies.map((option) => [option.value, option.count])).toEqual([
      ["INR", 2],
      ["USD", 1],
    ]);
    expect(none.price?.bounds).toBeNull();

    const inr = computeFacets(ROWS, { priceCurrency: "INR" });
    expect(inr.price?.bounds).toEqual([2700000, 35100000]);
    expect(inr.total).toBe(2);
  });

  it("reports totals that agree with countMatching", () => {
    const filters: CarFilters = { drive: ["awd"], powerMin: 700 };
    const options = computeFacets(ROWS, filters);
    expect(options.total).toBe(1);
    expect(countMatching(ROWS, filters)).toBe(1);
    expect(options.universe).toBe(4);
  });
});
