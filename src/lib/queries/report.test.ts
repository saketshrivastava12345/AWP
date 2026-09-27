import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isNetworkFailure, isSchemaMismatch, reportQueryError } from "./report";

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

describe("isNetworkFailure", () => {
  it("recognises a failed fetch however it is reported", () => {
    // PostgREST builder: the error object's message is the stringified TypeError.
    expect(isNetworkFailure("listCars failed:", "TypeError: fetch failed")).toBe(true);
    // A thrown Error with the socket error as its cause.
    const thrown = new TypeError("fetch failed", {
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:54321"), {
        code: "ECONNREFUSED",
      }),
    });
    expect(isNetworkFailure("listCars threw:", thrown)).toBe(true);
    expect(isNetworkFailure({ message: "getaddrinfo ENOTFOUND x.supabase.co" })).toBe(
      true,
    );
  });

  it("does not match ordinary database errors", () => {
    expect(isNetworkFailure({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isNetworkFailure("column x does not exist")).toBe(false);
  });
});

describe("reportQueryError", () => {
  // Each test starts more than a minute after the previous one, so the
  // once-a-minute rate limit does not carry over between them.
  let clock = Date.now();
  beforeEach(() => {
    vi.useFakeTimers();
    clock += 120_000;
    vi.setSystemTime(new Date(clock));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it("collapses an unreachable Supabase into one warning that names the fix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const label of ["getHomeCounts", "listCountries", "listCars", "getFacetRows"]) {
      reportQueryError(`${label} failed:`, "TypeError: fetch failed");
    }
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    const text = String(warn.mock.calls[0]?.[0]);
    expect(text).toContain("could not be reached");
    expect(text).toContain("npm run doctor");
  });

  it("warns again once a minute has passed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportQueryError("x failed:", "TypeError: fetch failed");
    vi.setSystemTime(new Date(Date.now() + 61_000));
    reportQueryError("y failed:", "TypeError: fetch failed");
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
