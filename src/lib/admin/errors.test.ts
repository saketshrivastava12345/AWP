import { describe, expect, it } from "vitest";
import { describeDbError } from "./errors";

describe("describeDbError", () => {
  it("names the duplicate a unique index caught", () => {
    expect(
      describeDbError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "car_variants_no_duplicate_name"',
      }),
    ).toMatch(/already has a variant with that name/);
    expect(
      describeDbError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "market_prices_one_per_scope_and_date"',
      }),
    ).toMatch(/already starts on that date/);
  });

  it("explains check constraints", () => {
    expect(
      describeDbError({
        code: "23514",
        message:
          'new row for relation "car_variants" violates check constraint "car_variants_electric_has_no_engine"',
      }),
    ).toMatch(/battery-electric vehicle cannot have a combustion engine/);
    expect(
      describeDbError({
        code: "23514",
        message:
          'new row for relation "performance_specs" violates check constraint "performance_specs_source_url_http"',
      }),
    ).toMatch(/http:\/\/ or https:\/\//);
  });

  it("explains the powertrain triggers", () => {
    expect(
      describeDbError({
        code: "23514",
        message: "fuel_specs cannot be attached to a battery-electric variant (x)",
      }),
    ).toBe("A battery-electric vehicle has no fuel specifications.");
    expect(
      describeDbError({
        code: "23514",
        message: "ev_specs cannot be attached to a petrol variant (x)",
      }),
    ).toMatch(/only to electric, plug-in hybrid and hybrid/);
    expect(
      describeDbError({ code: "23514", message: "City abc is not in region def" }),
    ).toBe("That city is not in the chosen state.");
  });

  it("explains blocked deletes", () => {
    expect(
      describeDbError({
        code: "23503",
        message:
          'update or delete on table "market_regions" violates foreign key constraint "market_prices_region_id_fkey" on table "market_prices"',
      }),
    ).toMatch(/Prices are recorded for this state/);
    expect(
      describeDbError({
        code: "23503",
        message:
          'update or delete on table "x" violates foreign key constraint "something_else" on table "y"',
      }),
    ).toMatch(/cannot be deleted/);
  });

  it("maps permission and session failures", () => {
    expect(describeDbError({ code: "42501", message: "permission denied" })).toMatch(
      /admin role/,
    );
    expect(
      describeDbError({
        message: 'new row violates row-level security policy for table "x"',
      }),
    ).toMatch(/admin role/);
    expect(describeDbError({ code: "PGRST301", message: "JWT expired" })).toMatch(
      /session has expired/,
    );
  });

  it("maps the domain slug check and generic failures", () => {
    expect(
      describeDbError({
        code: "23514",
        message: 'value for domain slug violates check constraint "slug_check"',
      }),
    ).toMatch(/lowercase letters/);
    expect(describeDbError({ code: "22P02", message: "invalid input syntax" })).toBe(
      "A value has the wrong format.",
    );
    expect(describeDbError(null)).toMatch(/Nothing was saved/);
    expect(describeDbError({ code: "XX000", message: "boom" })).toMatch(
      /Nothing was saved/,
    );
  });
});
