import { afterEach, describe, expect, it, vi } from "vitest";
import { isSchemaMismatch, reportQueryError } from "./report";

describe("isSchemaMismatch", () => {
  it("recognises PostgREST and Postgres 'not there yet' errors", () => {
    expect(
      isSchemaMismatch({
        code: "42703",
        message: "column car_catalog.status does not exist",
      }),
    ).toBe(true);
    expect(
      isSchemaMismatch({
        code: "PGRST205",
        message: "Could not find the table 'public.market_regions' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isSchemaMismatch(
        "listCars failed:",
        "column car_catalog.listed_price does not exist",
      ),
    ).toBe(true);
    expect(
      isSchemaMismatch({
        message:
          "Could not find the function public.search_catalogue(per_kind, q) in the schema cache",
      }),
    ).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(
      isSchemaMismatch({
        code: "42501",
        message: "permission denied for table market_prices",
      }),
    ).toBe(false);
    expect(isSchemaMismatch("getMarketGeography threw:", new Error("fetch failed"))).toBe(
      false,
    );
  });
});

describe("reportQueryError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("warns once for schema mismatches and still logs real errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    reportQueryError("a failed:", "column car_catalog.status does not exist");
    reportQueryError("b failed:", "column car_catalog.listed_price does not exist");
    reportQueryError("c failed:", "permission denied for table x");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("npm run db:push");
    expect(error).toHaveBeenCalledTimes(1);
  });
});
