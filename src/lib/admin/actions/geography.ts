"use server";

import { adminAction, dbFailed } from "../action-helpers";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import { afterWrite, CACHE_TAGS } from "../revalidate";

/**
 * Market geography: the states and cities prices can be recorded for, and
 * each country's default currency. A region or city with prices cannot be
 * deleted (the foreign keys RESTRICT); the admin is told how many prices
 * stand in the way instead of seeing a database error.
 */

function geographyChanged() {
  // Names appear in price labels on cards and detail pages.
  afterWrite(CACHE_TAGS.markets, CACHE_TAGS.prices, CACHE_TAGS.catalogue);
}

export async function saveRegion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("region_id", "State");
    const countryId = reader.uuid("country_id", "Country", { required: true });
    const name = reader.text("name", "Name", { required: true, max: 120 });
    const slug = reader.slug("slug", "Slug", { required: true });
    const order = reader.number("display_order", "Display order", {
      min: -32768,
      max: 32767,
    });
    if (!reader.ok || !countryId || !name || !slug)
      return failed(CHECK_FIELDS, reader.errors, values);

    const row = { country_id: countryId, name, slug, display_order: order ?? 0 };
    const result = id
      ? await supabase.from("market_regions").update(row).eq("id", id).select("id")
      : await supabase.from("market_regions").insert(row).select("id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length) return failed("That state no longer exists.", {}, values);
    geographyChanged();
    return succeeded(id ? `${name} saved.` : `${name} added.`, id ? values : null);
  });
}

export async function saveCity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("city_id", "City");
    const regionId = reader.uuid("region_id", "State", { required: true });
    const name = reader.text("name", "Name", { required: true, max: 120 });
    const slug = reader.slug("slug", "Slug", { required: true });
    const order = reader.number("display_order", "Display order", {
      min: -32768,
      max: 32767,
    });
    if (!reader.ok || !regionId || !name || !slug)
      return failed(CHECK_FIELDS, reader.errors, values);

    const row = { region_id: regionId, name, slug, display_order: order ?? 0 };
    if (id) {
      // Moving a city to another state would orphan its prices' state.
      const { count } = await supabase
        .from("market_prices")
        .select("id", { count: "exact", head: true })
        .eq("city_id", id)
        .neq("region_id", regionId);
      if (count) {
        return failed(
          CHECK_FIELDS,
          { region_id: `${count} price(s) record this city under its current state.` },
          values,
        );
      }
    }
    const result = id
      ? await supabase.from("market_cities").update(row).eq("id", id).select("id")
      : await supabase.from("market_cities").insert(row).select("id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length) return failed("That city no longer exists.", {}, values);
    geographyChanged();
    return succeeded(id ? `${name} saved.` : `${name} added.`, id ? values : null);
  });
}

export async function deleteMarketPlace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const kind = reader.raw("kind") === "city" ? "city" : "region";
    const id = reader.uuid("id", kind === "city" ? "City" : "State", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);

    const { count, error: countError } = await supabase
      .from("market_prices")
      .select("id", { count: "exact", head: true })
      .eq(kind === "city" ? "city_id" : "region_id", id);
    if (countError) return dbFailed(countError, values);
    if (count) {
      return failed(
        `${count} price${count === 1 ? " is" : "s are"} recorded for this ${kind === "city" ? "city" : "state"}. Delete or move ${count === 1 ? "it" : "them"} first.`,
        {},
        values,
      );
    }
    const { data, error } =
      kind === "city"
        ? await supabase.from("market_cities").delete().eq("id", id).select("id")
        : await supabase.from("market_regions").delete().eq("id", id).select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was deleted.", {}, values);
    geographyChanged();
    return succeeded(kind === "city" ? "City deleted." : "State and its cities deleted.");
  });
}

export async function setCountryCurrency(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("country_id", "Country", { required: true });
    const currency = reader.currency("currency_code", "Currency");
    if (!reader.ok || !id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data, error } = await supabase
      .from("countries")
      .update({ currency_code: currency })
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("That country no longer exists.", {}, values);
    geographyChanged();
    return succeeded(
      currency ? `Default currency set to ${currency}.` : "Default currency cleared.",
      values,
    );
  });
}
