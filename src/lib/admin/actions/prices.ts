"use server";

import { redirect } from "next/navigation";
import type { TablesInsert } from "@/types/database";
import { getCsvData } from "@/lib/queries/admin";
import { adminAction, adminActionWith, dbFailed } from "../action-helpers";
import { describeDbError } from "../errors";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import type { AdminSupabase } from "../auth";
import { validatePriceCsv, type CsvLookups, type CsvRowResult } from "../csv";
import { readPriceFields } from "../price-input";
import { afterWrite, CACHE_TAGS } from "../revalidate";
import { addDays, todayIso } from "../validation";

/**
 * Market prices: add, edit, verify, close, delete, and CSV import.
 *
 * Every row is a sourced observation. Nothing here derives a price: the one
 * derived figure on the public site (a calculated on-road sum) is computed at
 * display time and labelled as such.
 */

type Market = { countryId: string; regionId: string | null; cityId: string | null };

/** Confirms the region is in the country and the city in the region. */
async function checkMarket(
  supabase: AdminSupabase,
  market: Market,
): Promise<{ field: string; message: string } | { currency: string | null }> {
  const { data: country } = await supabase
    .from("countries")
    .select("id, currency_code")
    .eq("id", market.countryId)
    .maybeSingle();
  if (!country) return { field: "country_id", message: "Choose a country." };
  if (market.regionId) {
    const { data: region } = await supabase
      .from("market_regions")
      .select("id")
      .eq("id", market.regionId)
      .eq("country_id", market.countryId)
      .maybeSingle();
    if (!region)
      return { field: "region_id", message: "That state is not in the chosen country." };
  }
  if (market.cityId) {
    if (!market.regionId)
      return { field: "region_id", message: "Choose the city's state." };
    const { data: city } = await supabase
      .from("market_cities")
      .select("id")
      .eq("id", market.cityId)
      .eq("region_id", market.regionId)
      .maybeSingle();
    if (!city)
      return { field: "city_id", message: "That city is not in the chosen state." };
  }
  return { currency: country.currency_code };
}

export async function savePrice(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const today = todayIso();
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const priceId = reader.uuid("price_id", "Price");
    const previousId = reader.uuid("previous_id", "Previous price");
    const closePrevious = reader.boolean("close_previous");
    const countryId = reader.uuid("country_id", "Country", { required: true });
    const regionId = reader.uuid("region_id", "State");
    const cityId = reader.uuid("city_id", "City");
    const fields = readPriceFields(reader, { today });
    if (!reader.ok || !fields || !variantId || !countryId) {
      return failed(CHECK_FIELDS, reader.errors, values);
    }

    const { data: vehicle } = await supabase
      .from("car_variants")
      .select("id")
      .eq("id", variantId)
      .maybeSingle();
    if (!vehicle) return failed("That vehicle no longer exists.", {}, values);
    const market = await checkMarket(supabase, { countryId, regionId, cityId });
    if ("field" in market)
      return failed(CHECK_FIELDS, { [market.field]: market.message }, values);

    const row: TablesInsert<"market_prices"> = {
      ...fields,
      variant_id: variantId,
      country_id: countryId,
      region_id: regionId,
      city_id: cityId,
    };

    let savedId: string;
    if (priceId) {
      const { data, error } = await supabase
        .from("market_prices")
        .update(row)
        .eq("id", priceId)
        .eq("variant_id", variantId)
        .select("id");
      if (error) return dbFailed(error, values);
      if (!data?.[0]) return failed("That price no longer exists.", {}, values);
      savedId = data[0].id;
    } else {
      const { data, error } = await supabase
        .from("market_prices")
        .insert(row)
        .select("id")
        .single();
      if (error || !data) return dbFailed(error, values);
      savedId = data.id;

      // "Add newer price": optionally end the previous observation the day
      // before the new one takes effect, so the history reads as a sequence.
      if (previousId && closePrevious) {
        const { data: previous } = await supabase
          .from("market_prices")
          .select("id, effective_from, effective_to")
          .eq("id", previousId)
          .eq("variant_id", variantId)
          .maybeSingle();
        const closeOn = addDays(fields.effective_from, -1);
        if (previous && previous.effective_from <= closeOn && !previous.effective_to) {
          await supabase
            .from("market_prices")
            .update({ effective_to: closeOn })
            .eq("id", previous.id);
        }
      }
    }

    afterWrite(CACHE_TAGS.prices, CACHE_TAGS.catalogue);
    redirect(`/admin/vehicles/${variantId}/prices?saved=${savedId}`);
  });
}

export async function priceRowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const priceId = reader.uuid("price_id", "Price", { required: true });
    const operation = reader.raw("operation");
    if (!priceId) return failed(CHECK_FIELDS, reader.errors, values);
    const today = todayIso();

    const { data: price } = await supabase
      .from("market_prices")
      .select("id, effective_from, effective_to")
      .eq("id", priceId)
      .maybeSingle();
    if (!price) return failed("That price no longer exists.", {}, values);

    if (operation === "verify") {
      const { error } = await supabase
        .from("market_prices")
        .update({ is_verified: true, last_verified_at: today })
        .eq("id", priceId);
      if (error) return dbFailed(error, values);
      afterWrite(CACHE_TAGS.prices, CACHE_TAGS.catalogue);
      return succeeded("Price marked verified today.");
    }

    if (operation === "close") {
      const closeOn =
        reader.date("effective_to", "Close on", { required: true }) ?? today;
      if (!reader.ok) return failed(CHECK_FIELDS, reader.errors, values);
      if (closeOn < price.effective_from) {
        return failed(
          CHECK_FIELDS,
          { effective_to: "A price cannot end before it starts." },
          values,
        );
      }
      const { error } = await supabase
        .from("market_prices")
        .update({ effective_to: closeOn })
        .eq("id", priceId);
      if (error) return dbFailed(error, values);
      afterWrite(CACHE_TAGS.prices, CACHE_TAGS.catalogue);
      return succeeded(`Price closed: in force until ${closeOn}.`);
    }

    if (operation === "delete") {
      const { data, error } = await supabase
        .from("market_prices")
        .delete()
        .eq("id", priceId)
        .select("id");
      if (error) return dbFailed(error, values);
      if (!data?.length) return failed("Nothing was deleted.", {}, values);
      afterWrite(CACHE_TAGS.prices, CACHE_TAGS.catalogue);
      return succeeded("Price deleted.");
    }

    return failed("Unknown operation.", {}, values);
  });
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export type CsvPreviewRow = Pick<
  CsvRowResult,
  "line" | "variantPath" | "marketPath" | "variantLabel" | "marketLabel" | "errors"
> & {
  priceType: string | null;
  currency: string | null;
  exShowroom: number | null;
  onRoad: number | null;
  effectiveFrom: string | null;
};

export type CsvState = ActionState & {
  csv: string;
  headerErrors: string[];
  rows: CsvPreviewRow[];
  validCount: number;
  committed: { inserted: number; failed: { line: number; message: string }[] } | null;
};

async function csvLookups(supabase: AdminSupabase): Promise<CsvLookups> {
  const { labels, geography } = await getCsvData(supabase);
  return {
    today: todayIso(),
    variants: new Map(
      labels.map((label) => [label.path, { id: label.id, label: label.title }]),
    ),
    countries: new Map(
      geography.countries.map((country) => [
        country.slug,
        {
          id: country.id,
          name: country.name,
          currency: country.currency_code,
          regions: new Map(
            country.regions.map((region) => [
              region.slug,
              {
                id: region.id,
                name: region.name,
                cities: new Map(
                  region.cities.map((city) => [
                    city.slug,
                    { id: city.id, name: city.name },
                  ]),
                ),
              },
            ]),
          ),
        },
      ]),
    ),
  };
}

function toPreview(row: CsvRowResult): CsvPreviewRow {
  return {
    line: row.line,
    variantPath: row.variantPath,
    marketPath: row.marketPath,
    variantLabel: row.variantLabel,
    marketLabel: row.marketLabel,
    errors: row.errors,
    priceType: row.fields?.price_type ?? null,
    currency: row.fields?.currency ?? null,
    exShowroom: row.fields?.ex_showroom_price ?? null,
    onRoad: row.fields?.on_road_price ?? null,
    effectiveFrom: row.fields?.effective_from ?? null,
  };
}

const MAX_CSV_CHARS = 900_000;

function csvState(
  base: ActionState,
  csv: string,
  extra: Partial<
    Pick<CsvState, "headerErrors" | "rows" | "validCount" | "committed">
  > = {},
): CsvState {
  return {
    ...base,
    csv,
    headerErrors: [],
    rows: [],
    validCount: 0,
    committed: null,
    ...extra,
  };
}

/** Parses and validates the CSV; saves nothing. */
export async function previewPriceCsv(
  _prev: CsvState,
  formData: FormData,
): Promise<CsvState> {
  const file = formData.get("file");
  let csv = "";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV_CHARS) {
      return csvState(
        failed("The file is too large. Import at most 1,000 rows at a time."),
        "",
      );
    }
    csv = await file.text();
  } else {
    const pasted = formData.get("csv");
    csv = typeof pasted === "string" ? pasted : "";
  }

  return adminActionWith(
    formData,
    async ({ supabase }) => {
      if (!csv.trim())
        return csvState(failed("Choose a CSV file or paste its contents."), csv);
      if (csv.length > MAX_CSV_CHARS) {
        return csvState(
          failed("The CSV is too large. Import at most 1,000 rows at a time."),
          csv,
        );
      }
      const validation = validatePriceCsv(csv, await csvLookups(supabase));
      const rows = validation.rows.length;
      const base = validation.headerErrors.length
        ? failed("The CSV cannot be read: fix the header first.")
        : succeeded(
            `${validation.validCount} of ${rows} row${rows === 1 ? "" : "s"} ready to import.`,
          );
      return csvState(base, csv, {
        headerErrors: validation.headerErrors,
        rows: validation.rows.map(toPreview),
        validCount: validation.validCount,
      });
    },
    (state) => csvState(state, csv),
  );
}

/**
 * Re-validates the CSV on the server (the preview in the browser is never
 * trusted) and inserts every valid row in one statement. If the batch is
 * refused (for example a row duplicates a price already stored), rows are
 * inserted one by one so each failure is reported against its line.
 */
export async function commitPriceCsv(
  _prev: CsvState,
  formData: FormData,
): Promise<CsvState> {
  const csv = String(formData.get("csv") ?? "");
  return adminActionWith(
    formData,
    async ({ supabase }) => {
      if (!csv.trim() || csv.length > MAX_CSV_CHARS)
        return csvState(failed("Nothing to import."), csv);
      const validation = validatePriceCsv(csv, await csvLookups(supabase));
      const valid = validation.rows.filter(
        (row) => row.errors.length === 0 && row.fields,
      );
      if (validation.headerErrors.length || valid.length === 0) {
        return csvState(failed("No valid rows to import."), csv, {
          headerErrors: validation.headerErrors,
          rows: validation.rows.map(toPreview),
        });
      }

      const toInsert = valid.map((row) => ({
        line: row.line,
        insert: {
          ...row.fields!,
          variant_id: row.variantId!,
          country_id: row.countryId!,
          region_id: row.regionId,
          city_id: row.cityId,
        } satisfies TablesInsert<"market_prices">,
      }));

      const failures: { line: number; message: string }[] = [];
      let inserted = 0;
      const batch = await supabase
        .from("market_prices")
        .insert(toInsert.map((row) => row.insert))
        .select("id");
      if (!batch.error) {
        inserted = batch.data?.length ?? 0;
      } else {
        for (const row of toInsert) {
          const { error } = await supabase.from("market_prices").insert(row.insert);
          if (error) failures.push({ line: row.line, message: describeDbError(error) });
          else inserted += 1;
        }
      }
      for (const row of validation.rows) {
        if (row.errors.length)
          failures.push({ line: row.line, message: row.errors.join(" ") });
      }
      failures.sort((a, b) => a.line - b.line);

      if (inserted > 0) afterWrite(CACHE_TAGS.prices, CACHE_TAGS.catalogue);
      const message = `Imported ${inserted} price${inserted === 1 ? "" : "s"}; ${failures.length} row${
        failures.length === 1 ? "" : "s"
      } not imported.`;
      return csvState(inserted > 0 ? succeeded(message) : failed(message), "", {
        committed: { inserted, failed: failures },
      });
    },
    (state) => csvState(state, csv),
  );
}
