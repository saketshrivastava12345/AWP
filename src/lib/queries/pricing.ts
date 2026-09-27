import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { MarketGeography, MarketPrice, VariantPricing } from "@/types/domain";

/**
 * Market prices and the geography they apply to.
 *
 * Prices are cached under their own tag with a shorter lifetime than the rest
 * of the catalogue; admin price edits invalidate it with updateTag("prices").
 * Like every other query here, failures return empty data rather than
 * throwing, and the UI then says "Price data unavailable".
 */

type GeographyRow = {
  id: string;
  name: string;
  slug: string;
  iso_code: string;
  flag_emoji: string | null;
  currency_code: string | null;
  market_regions:
    | {
        id: string;
        name: string;
        slug: string;
        display_order: number;
        market_cities:
          { id: string; name: string; slug: string; display_order: number }[] | null;
      }[]
    | null;
};

const byOrderThenName = (
  a: { display_order: number; name: string },
  b: { display_order: number; name: string },
) => a.display_order - b.display_order || a.name.localeCompare(b.name);

/** Every country with its regions and cities, for the market selector. */
export async function getMarketGeography(): Promise<MarketGeography> {
  const empty: MarketGeography = { countries: [] };
  if (!isConfigured()) return empty;

  try {
    const supabase = createStaticClient(CACHE_TAGS.markets);
    const { data, error } = await supabase
      .from("countries")
      .select(
        "id, name, slug, iso_code, flag_emoji, currency_code, market_regions ( id, name, slug, display_order, market_cities ( id, name, slug, display_order ) )",
      )
      .order("name")
      .returns<GeographyRow[]>();

    if (error) {
      console.error("getMarketGeography failed:", error.message);
      return empty;
    }

    return {
      countries: (data ?? []).map((country) => ({
        id: country.id,
        name: country.name,
        slug: country.slug,
        iso_code: country.iso_code,
        flag_emoji: country.flag_emoji,
        currency_code: country.currency_code,
        regions: [...(country.market_regions ?? [])]
          .sort(byOrderThenName)
          .map((region) => ({
            id: region.id,
            name: region.name,
            slug: region.slug,
            cities: [...(region.market_cities ?? [])]
              .sort(byOrderThenName)
              .map(({ id, name, slug }) => ({ id, name, slug })),
          })),
      })),
    };
  } catch (error) {
    console.error("getMarketGeography threw:", error);
    return empty;
  }
}

/** Every public column; created_by is deliberately left out (see MarketPrice). */
export const PRICE_COLUMNS =
  "id, variant_id, country_id, region_id, city_id, currency, price_type, ex_showroom_price, rto_tax, registration_fee, insurance_estimate, handling_charges, fastag, other_charges, on_road_price, source, source_url, effective_from, effective_to, last_verified_at, is_verified, notes, created_at, updated_at";

/**
 * Every price row recorded for a variant: the ones in force today (from the
 * current_market_prices view, the single definition of "current") and the
 * full history, newest first.
 */
export async function getVariantPricing(variantId: string): Promise<VariantPricing> {
  const empty: VariantPricing = { current: [], history: [] };
  if (!isConfigured()) return empty;

  try {
    const supabase = createStaticClient(CACHE_TAGS.prices);
    const [current, history] = await Promise.all([
      supabase
        .from("current_market_prices")
        .select(PRICE_COLUMNS)
        .eq("variant_id", variantId)
        .returns<MarketPrice[]>(),
      supabase
        .from("market_prices")
        .select(PRICE_COLUMNS)
        .eq("variant_id", variantId)
        .order("effective_from", { ascending: false })
        .limit(500)
        .returns<MarketPrice[]>(),
    ]);

    if (current.error) console.error("getVariantPricing current:", current.error.message);
    if (history.error) console.error("getVariantPricing history:", history.error.message);

    return { current: current.data ?? [], history: history.data ?? [] };
  } catch (error) {
    console.error("getVariantPricing threw:", error);
    return empty;
  }
}
