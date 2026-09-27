import type { MarketPrice, PriceType } from "@/types/domain";
import { PRICE_TYPES } from "./labels";
import { LONG_TEXT_MAX, addDays, type FieldReader, type NumberRule } from "./validation";

/**
 * Validation for one market price, shared by the price form and the CSV
 * importer so both apply exactly the same rules.
 *
 * Mirrors market_prices' constraints — listed types need the listed price,
 * on-road types need the published total — and adds the honesty rules the
 * schema cannot express: a listed price never carries an on-road total (that
 * belongs in an on-road row), and every row names its source, links to it
 * and says when it was checked. Client-safe and pure.
 */

const LISTED_TYPES: readonly PriceType[] = [
  "manufacturer_list",
  "dealer_list",
  "ex_showroom",
];
export const isListedType = (type: PriceType) => LISTED_TYPES.includes(type);

/** numeric(14,2) and numeric(10,2) upper bounds. */
const MAX_14_2 = 999_999_999_999.99;
const MAX_10_2 = 99_999_999.99;

export type AmountField = {
  name:
    | "ex_showroom_price"
    | "rto_tax"
    | "registration_fee"
    | "insurance_estimate"
    | "handling_charges"
    | "fastag"
    | "other_charges"
    | "on_road_price";
  label: string;
  rule: NumberRule;
  hint?: string;
};

export const AMOUNT_FIELDS: AmountField[] = [
  {
    name: "ex_showroom_price",
    label: "Ex-showroom / listed price",
    rule: { above: 0, max: MAX_14_2, scale: 2 },
    hint: "The vehicle price before on-road charges, as published.",
  },
  { name: "rto_tax", label: "RTO / road tax", rule: { min: 0, max: MAX_14_2, scale: 2 } },
  {
    name: "registration_fee",
    label: "Registration",
    rule: { min: 0, max: MAX_14_2, scale: 2 },
  },
  {
    name: "insurance_estimate",
    label: "Insurance (estimate)",
    rule: { min: 0, max: MAX_14_2, scale: 2 },
  },
  {
    name: "handling_charges",
    label: "Handling charges",
    rule: { min: 0, max: MAX_14_2, scale: 2 },
  },
  { name: "fastag", label: "FASTag", rule: { min: 0, max: MAX_10_2, scale: 2 } },
  {
    name: "other_charges",
    label: "Other charges",
    rule: { min: 0, max: MAX_14_2, scale: 2 },
  },
  {
    name: "on_road_price",
    label: "On-road total (as published)",
    rule: { above: 0, max: MAX_14_2, scale: 2 },
    hint: "Only a total the source itself publishes. AURIX never stores its own sum.",
  },
];

export type PriceFields = {
  price_type: PriceType;
  currency: string;
  ex_showroom_price: number | null;
  rto_tax: number | null;
  registration_fee: number | null;
  insurance_estimate: number | null;
  handling_charges: number | null;
  fastag: number | null;
  other_charges: number | null;
  on_road_price: number | null;
  effective_from: string;
  effective_to: string | null;
  source: string;
  source_url: string;
  last_verified_at: string;
  is_verified: boolean;
  notes: string | null;
};

/** Earliest effective date accepted; older prices are not useful history. */
export const PRICE_HISTORY_START = "1990-01-01";

export function readPriceFields(
  reader: FieldReader,
  options: { today: string; defaultCurrency?: string | null },
): PriceFields | null {
  const price_type = reader.choice("price_type", "Price type", PRICE_TYPES, {
    required: true,
  });

  // A blank currency (allowed in CSV rows) means the market's own currency.
  const currency = reader.has("currency")
    ? reader.currency("currency", "Currency", { required: true })
    : options.defaultCurrency
      ? options.defaultCurrency
      : reader.currency("currency", "Currency", { required: true });

  const amounts = Object.fromEntries(
    AMOUNT_FIELDS.map((field) => [
      field.name,
      reader.number(field.name, field.label, field.rule),
    ]),
  ) as Record<AmountField["name"], number | null>;

  const effective_from = reader.date("effective_from", "Effective from", {
    required: true,
    notBefore: PRICE_HISTORY_START,
    notAfter: addDays(options.today, 366),
  });
  const effective_to = reader.date("effective_to", "Effective to", {
    notBefore: PRICE_HISTORY_START,
  });
  const source = reader.text("source", "Source", { required: true, max: 500 });
  const source_url = reader.url("source_url", "Source URL", { required: true });
  const last_verified_at = reader.date("last_verified_at", "Last verified", {
    required: true,
    notAfter: options.today,
    notBefore: PRICE_HISTORY_START,
  });
  const is_verified = reader.boolean("is_verified");
  const notes = reader.text("notes", "Notes", { max: LONG_TEXT_MAX });

  if (price_type) {
    if (isListedType(price_type)) {
      if (amounts.ex_showroom_price === null && !("ex_showroom_price" in reader.errors)) {
        reader.fail("ex_showroom_price", "This price type needs the listed price.");
      }
      if (amounts.on_road_price !== null) {
        reader.fail(
          "on_road_price",
          "A published on-road total belongs in an “On-road” or “Estimated on-road” row.",
        );
      }
    } else if (amounts.on_road_price === null && !("on_road_price" in reader.errors)) {
      reader.fail(
        "on_road_price",
        "An on-road price type needs the published on-road total.",
      );
    }
  }
  if (
    amounts.on_road_price !== null &&
    amounts.ex_showroom_price !== null &&
    amounts.on_road_price < amounts.ex_showroom_price
  ) {
    reader.fail(
      "on_road_price",
      "The on-road total cannot be below the ex-showroom price.",
    );
  }
  if (effective_from && effective_to && effective_to < effective_from) {
    reader.fail("effective_to", "“Effective to” cannot be before “effective from”.");
  }

  if (
    !reader.ok ||
    !price_type ||
    !currency ||
    !effective_from ||
    !source ||
    !source_url ||
    !last_verified_at
  ) {
    return null;
  }

  return {
    price_type,
    currency,
    ...amounts,
    effective_from,
    effective_to,
    source,
    source_url,
    last_verified_at,
    is_verified,
    notes,
  };
}

/**
 * A MarketPrice-shaped row from form values, for the live preview (which runs
 * the public pricing engine on it). Unparseable amounts are left out rather
 * than guessed.
 */
export function previewPrice(input: {
  price_type: PriceType;
  currency: string;
  amounts: Partial<Record<AmountField["name"], number | null>>;
  countryId: string;
  regionId: string | null;
  cityId: string | null;
}): MarketPrice {
  const amount = (name: AmountField["name"]) => input.amounts[name] ?? null;
  return {
    id: "preview",
    variant_id: "preview",
    country_id: input.countryId,
    region_id: input.regionId,
    city_id: input.cityId,
    currency: input.currency,
    price_type: input.price_type,
    ex_showroom_price: amount("ex_showroom_price"),
    rto_tax: amount("rto_tax"),
    registration_fee: amount("registration_fee"),
    insurance_estimate: amount("insurance_estimate"),
    handling_charges: amount("handling_charges"),
    fastag: amount("fastag"),
    other_charges: amount("other_charges"),
    on_road_price: amount("on_road_price"),
    source: "",
    source_url: "",
    effective_from: "",
    effective_to: null,
    last_verified_at: "",
    is_verified: false,
    notes: null,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
}
