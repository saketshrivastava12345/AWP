import { describe, expect, it } from "vitest";
import {
  buildChips,
  buildQueryString,
  catalogueHref,
  catalogueTitle,
  clearFiltersHref,
  countFilterChips,
  filtersToParams,
  hasAnySearchParam,
  parseCarSearchParams,
  removeMatchFromQuery,
  removeTextFromQuery,
  resolveCatalogueState,
  textQuery,
  type RawSearchParams,
} from "./search-params";
import { EMPTY_FILTER_OPTIONS } from "./facets";
import { parseQuery } from "./search/parseQuery";
import type { CarFilters } from "./car-query";

/** Parse the query string of a catalogue href back into RawSearchParams. */
function paramsOf(href: string): RawSearchParams {
  const search = new URLSearchParams(href.split("?")[1] ?? "");
  const params: RawSearchParams = {};
  for (const [key, value] of search) {
    const existing = params[key];
    if (existing === undefined) params[key] = value;
    else params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return params;
}

describe("buildQueryString", () => {
  it("never splits free text on commas", () => {
    const qs = buildQueryString({ q: "porsche, v8" }, { sort: "speed-desc" });
    expect(new URLSearchParams(qs).getAll("q")).toEqual(["porsche, v8"]);
  });

  it("keeps compare slugs intact and in order", () => {
    const qs = buildQueryString(
      { car: ["porsche/911/gt3", "bmw/m3/competition,xdrive"] },
      { page: undefined },
    );
    expect(new URLSearchParams(qs).getAll("car")).toEqual([
      "porsche/911/gt3",
      "bmw/m3/competition,xdrive",
    ]);
  });

  it("replaces every value of an overridden key and drops empty overrides", () => {
    const qs = buildQueryString(
      { fuel: ["petrol", "diesel"], page: "3" },
      {
        fuel: ["electric"],
        page: undefined,
      },
    );
    const search = new URLSearchParams(qs);
    expect(search.getAll("fuel")).toEqual(["electric"]);
    expect(search.has("page")).toBe(false);
  });

  it("returns an empty string when nothing remains", () => {
    expect(buildQueryString({ page: "2" }, { page: null })).toBe("");
  });
});

describe("parseCarSearchParams", () => {
  it("accepts comma lists and repeated keys for facet params only", () => {
    const { filters, query } = parseCarSearchParams({
      fuel: "petrol,electric",
      country: ["germany", "italy"],
      q: "porsche, v8",
    });
    expect(filters.fuel).toEqual(["petrol", "electric"]);
    expect(filters.country).toEqual(["germany", "italy"]);
    expect(query).toBe("porsche, v8");
  });

  it("drops unknown enum values and malformed slugs instead of failing", () => {
    const { filters } = parseCarSearchParams({
      fuel: ["plutonium", "diesel"],
      country: ["Germany", "not a slug!"],
      cylinders: ["8", "abc", "-2"],
    });
    expect(filters.fuel).toEqual(["diesel"]);
    expect(filters.country).toEqual(["germany"]);
    expect(filters.cylinders).toEqual([8]);
  });

  it("ignores price bounds without a currency and validates the currency", () => {
    expect(parseCarSearchParams({ priceMin: "100000" }).filters).toEqual({});
    expect(
      parseCarSearchParams({ priceCurrency: "dollars", priceMax: "5" }).filters,
    ).toEqual({});
    expect(
      parseCarSearchParams({
        priceCurrency: "eur",
        priceMin: "90000",
        priceMax: "250000",
      }).filters,
    ).toEqual({ priceCurrency: "EUR", priceMin: 90000, priceMax: 250000 });
  });

  it("swaps an inverted range and clamps page and page size", () => {
    const parsed = parseCarSearchParams({
      powerMin: "800",
      powerMax: "400",
      page: "-4",
      pageSize: "13",
    });
    expect(parsed.filters.powerMin).toBe(400);
    expect(parsed.filters.powerMax).toBe(800);
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(12);
    expect(parseCarSearchParams({ pageSize: "48", page: "3" })).toMatchObject({
      pageSize: 48,
      page: 3,
    });
  });

  it("only accepts known sort keys", () => {
    expect(parseCarSearchParams({ sort: "range-desc" }).sort).toBe("range-desc");
    expect(parseCarSearchParams({ sort: "drop table" }).sort).toBeUndefined();
  });
});

describe("round trips", () => {
  const cases: CarFilters[] = [
    {},
    { country: ["germany", "italy"], fuel: ["petrol"] },
    { engineLayout: ["vee", "flat"], cylinders: [6, 8], aspiration: ["twin_turbo"] },
    { powerMin: 400, powerMax: 800, speedMin: 300, rangeMin: 450, yearMin: 2019 },
    { priceCurrency: "INR", priceMin: 2500000, priceMax: 40000000 },
    {
      status: ["upcoming"],
      body: ["off_road"],
      drive: ["4wd"],
      transmission: ["single_speed"],
    },
  ];

  it.each(cases)("filters survive serialise → parse: %o", (filters) => {
    const href = catalogueHref({ filters });
    expect(parseCarSearchParams(paramsOf(href)).filters).toEqual(filters);
  });

  it("keeps q, sort, page size and page, and omits defaults", () => {
    const href = catalogueHref({
      query: "porsche, gt",
      filters: { fuel: ["petrol"] },
      sort: "price-asc",
      pageSize: 24,
      page: 2,
    });
    const parsed = parseCarSearchParams(paramsOf(href));
    expect(parsed.query).toBe("porsche, gt");
    expect(parsed.sort).toBe("price-asc");
    expect(parsed.pageSize).toBe(24);
    expect(parsed.page).toBe(2);
    expect(
      catalogueHref({ filters: {}, sort: "power-desc", pageSize: 12, page: 1 }),
    ).toBe("/cars");
  });

  it("does not serialise price bounds without a currency", () => {
    expect(filtersToParams({ priceMin: 5, priceMax: 9 })).toEqual([]);
  });

  it("detects any search state for robots", () => {
    expect(hasAnySearchParam({})).toBe(false);
    expect(hasAnySearchParam({ page: "2" })).toBe(true);
    expect(hasAnySearchParam({ q: "" })).toBe(false);
  });
});

describe("resolveCatalogueState", () => {
  it("applies filters the parser read from q", () => {
    const state = resolveCatalogueState({ q: "german supercars" });
    expect(state.effective.country).toEqual(["germany"]);
    expect(state.effective.category).toEqual(["supercar"]);
    expect(state.effective.text).toBeUndefined();
    expect(state.searchKeys).toEqual(["country", "category"]);
  });

  it("lets an explicit URL filter win over the parser for the same key", () => {
    const state = resolveCatalogueState({ q: "german supercars", country: "italy" });
    expect(state.effective.country).toEqual(["italy"]);
    expect(state.effective.category).toEqual(["supercar"]);
    expect(state.searchKeys).toEqual(["category"]);
  });

  it("carries only leftover words once parser filters are materialised", () => {
    expect(textQuery(resolveCatalogueState({ q: "porsche turbo" }))).toBe("porsche");
    expect(textQuery(resolveCatalogueState({ q: "Porsche Cayenne" }))).toBe(
      "Porsche Cayenne",
    );
  });

  it("clear-all keeps sort, page size and free text but drops parsed filters", () => {
    const state = resolveCatalogueState({
      q: "porsche over 500 hp",
      fuel: "petrol",
      sort: "speed-desc",
      pageSize: "24",
      page: "3",
    });
    expect(parseCarSearchParams(paramsOf(clearFiltersHref(state)))).toEqual({
      filters: {},
      query: "porsche",
      sort: "speed-desc",
      pageSize: 24,
      page: 1,
    });
  });
});

describe("editing q", () => {
  it("removes one understood phrase and keeps the user's wording", () => {
    const query = "German Supercars under 500 hp";
    const parsed = parseQuery(query);
    const germany = parsed.matches.find((match) => match.kind === "country");
    expect(germany).toBeDefined();
    expect(removeMatchFromQuery(query, parsed, germany!)).toBe("Supercars under 500 hp");
  });

  it("removing the last phrase leaves no query", () => {
    const parsed = parseQuery("v8");
    expect(removeMatchFromQuery("v8", parsed, parsed.matches[0]!)).toBeUndefined();
  });

  it("removes the free text but keeps every understood phrase", () => {
    const query = "porsche with a twin turbo flat-6";
    const parsed = parseQuery(query);
    const result = removeTextFromQuery(query, parsed);
    expect(result).toBeDefined();
    const reparsed = parseQuery(result!);
    expect(reparsed.text).toBeUndefined();
    expect(reparsed.filters).toEqual(parsed.filters);
  });

  it.each([
    "german supercars",
    "japanese sports cars over 400 hp",
    "twin-turbo v8 coupe",
    "electric suv above 300 km/h",
    "rwd petrol cars after 2019",
    "italian hypercars flat-12 manual",
  ])("each phrase of %j can be removed on its own", (query) => {
    const parsed = parseQuery(query);
    for (const match of parsed.matches) {
      if (match.kind === "text") continue;
      const next = removeMatchFromQuery(query, parsed, match);
      const others = parsed.matches
        .filter((entry) => entry !== match)
        .map((entry) => `${entry.kind}:${entry.label}`)
        .sort();
      const got = next
        ? parseQuery(next)
            .matches.map((entry) => `${entry.kind}:${entry.label}`)
            .sort()
        : [];
      expect(got).toEqual(others);
    }
  });
});

describe("buildChips", () => {
  it("gives every active filter its own removable chip, parsed ones included", () => {
    const state = resolveCatalogueState({
      q: "german supercars",
      fuel: "petrol",
      powerMin: "400",
    });
    const chips = buildChips(state, EMPTY_FILTER_OPTIONS);
    expect(chips.map((chip) => [chip.source, chip.label])).toEqual([
      ["search", "Germany"],
      ["search", "Supercar"],
      ["filter", "Petrol"],
      ["filter", "Power ≥ 400 hp"],
    ]);
    expect(countFilterChips(chips)).toBe(4);

    const withoutGermany = parseCarSearchParams(paramsOf(chips[0]!.href));
    expect(withoutGermany.query).toBe("supercars");
    expect(withoutGermany.filters).toEqual({ fuel: ["petrol"], powerMin: 400 });
    expect(chips[0]!.after.country).toBeUndefined();
    expect(chips[0]!.after.category).toEqual(["supercar"]);

    const withoutPetrol = parseCarSearchParams(paramsOf(chips[2]!.href));
    expect(withoutPetrol.query).toBe("german supercars");
    expect(withoutPetrol.filters).toEqual({ powerMin: 400 });
  });

  it("adds a text chip that is not counted as a filter", () => {
    const chips = buildChips(
      resolveCatalogueState({ q: "porsche turbo" }),
      EMPTY_FILTER_OPTIONS,
    );
    expect(chips.map((chip) => chip.source)).toEqual(["search", "text"]);
    expect(countFilterChips(chips)).toBe(1);
    const text = chips[1]!;
    expect(text.sameText).toBe(false);
    expect(parseCarSearchParams(paramsOf(text.href)).query).toBe("turbo");
  });

  it("skips a parsed phrase that a URL filter fully overrides", () => {
    const chips = buildChips(
      resolveCatalogueState({ q: "german cars", country: "italy" }),
      EMPTY_FILTER_OPTIONS,
    );
    expect(chips.map((chip) => chip.label)).toEqual(["Italy"]);
  });

  it("labels price chips in their own currency and removes all price params together", () => {
    const chips = buildChips(
      resolveCatalogueState({ priceCurrency: "INR", priceMax: "5000000" }),
      EMPTY_FILTER_OPTIONS,
    );
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toBe("Up to ₹50.00 L");
    expect(chips[0]!.href).toBe("/cars");
  });

  it("resets the page when a chip is removed", () => {
    const chips = buildChips(
      resolveCatalogueState({ fuel: ["petrol", "diesel"], page: "4", sort: "year-desc" }),
      EMPTY_FILTER_OPTIONS,
    );
    expect(chips[0]!.href).toBe("/cars?fuel=diesel&sort=year-desc");
  });
});

describe("catalogueTitle", () => {
  const title = (params: RawSearchParams) =>
    catalogueTitle(resolveCatalogueState(params), EMPTY_FILTER_OPTIONS);

  it("names the unfiltered catalogue", () => {
    expect(title({})).toBe("All cars");
    expect(title({ sort: "speed-desc", page: "2" })).toBe("All cars");
  });

  it("builds a phrase from single values", () => {
    expect(title({ country: "germany" })).toBe("German cars");
    expect(title({ fuel: "electric", body: "suv" })).toBe("Electric SUVs");
    expect(title({ manufacturer: "porsche" })).toBe("Porsche");
    expect(title({ manufacturer: "porsche", fuel: "electric" })).toBe(
      "Electric Porsche cars",
    );
    expect(title({ category: "ev" })).toBe("Electric cars");
    expect(title({ country: "japan", category: "sports-car" })).toBe(
      "Japanese sports cars",
    );
  });

  it("reads filters the search parser found", () => {
    expect(title({ q: "german supercars" })).toBe("German supercars");
  });

  it("falls back when the filters do not make a phrase", () => {
    expect(title({ powerMin: "500" })).toBe("Cars matching your filters");
    expect(title({ country: ["germany", "italy"] })).toBe("Cars matching your filters");
  });
});
