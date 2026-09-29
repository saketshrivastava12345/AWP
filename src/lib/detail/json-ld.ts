import type { DriveType, FuelType, PriceType, VariantDetail } from "@/types/domain";
import { carDisplayName, formatEnumLabel } from "@/lib/format";
import { PRICE_TYPE_LABELS } from "@/lib/pricing/engine";
import { toFinite } from "./figures";
import { safeExternalUrl } from "./provenance";

/**
 * Structured data for a car's page (schema.org), built only from figures that
 * exist. A property whose value is not published is omitted — never filled
 * with a placeholder, which search engines would repeat as fact.
 *
 * Units use UN/CEFACT common codes, as schema.org recommends: CMQ (cm³),
 * NMT (newton metre), SEC (second), KMH (km/h), KGM (kg), MMT (mm), LTR (litre).
 * Power stays `unitText: "hp"` because the catalogue stores it as published —
 * metric PS for European makers, SAE hp for others — and a single unit code
 * would misstate one of them.
 */

export type JsonLd = { [key: string]: JsonLdValue };
type JsonLdValue = string | number | boolean | null | JsonLd | JsonLdValue[];

export type JsonLdPrice = {
  /** The sourced amount, in its own currency. Never converted. */
  amount: number | string;
  /** ISO 4217 code of the amount. */
  currency: string;
  /** Where the price applies, e.g. "Mumbai, India". */
  areaServed?: string | null;
  /** ISO date the price applies from (or was verified). */
  validFrom?: string | null;
  /** A price_type, or "base_price" for the catalogue's indicative price. */
  priceType?: PriceType | "base_price" | null;
};

const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  phev: "Plug-in hybrid",
  electric: "Electric",
  hydrogen: "Hydrogen",
};

/** schema.org DriveWheelConfigurationValue members. */
export const DRIVE_WHEEL_CONFIGURATIONS: Record<DriveType, string> = {
  fwd: "https://schema.org/FrontWheelDriveConfiguration",
  rwd: "https://schema.org/RearWheelDriveConfiguration",
  awd: "https://schema.org/AllWheelDriveConfiguration",
  "4wd": "https://schema.org/FourWheelDriveConfiguration",
};

/** schema.org PriceTypeEnumeration, where one honestly applies. */
const PRICE_TYPE_ENUMERATION: Partial<Record<PriceType | "base_price", string>> = {
  manufacturer_list: "https://schema.org/MSRP",
  dealer_list: "https://schema.org/ListPrice",
  ex_showroom: "https://schema.org/ListPrice",
  base_price: "https://schema.org/ListPrice",
};

function quantity(
  value: number | string | null | undefined,
  unit: { unitCode: string } | { unitText: string },
  extra: JsonLd = {},
): JsonLd | null {
  const number = toFinite(value);
  if (number === null) return null;
  return { "@type": "QuantitativeValue", value: number, ...unit, ...extra };
}

/** Adds `key: value` only when value is not null/undefined/empty. */
function put(target: JsonLd, key: string, value: JsonLdValue | undefined): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && !value.trim()) return;
  target[key] = value;
}

export function buildCarJsonLd(
  detail: VariantDetail,
  options: { url: string; imageUrl?: string | null; price?: JsonLdPrice | null },
): JsonLd {
  const {
    variant,
    model,
    manufacturer,
    engine,
    transmission,
    performance,
    dimensions,
    fuel,
  } = detail;
  const name = carDisplayName(manufacturer.name, model.name, variant.name);

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name,
    url: options.url,
  };
  put(data, "description", variant.description);
  data.brand = { "@type": "Brand", name: manufacturer.name };

  const organisation: JsonLd = { "@type": "Organization", name: manufacturer.name };
  put(organisation, "url", safeExternalUrl(manufacturer.website));
  data.manufacturer = organisation;

  data.model = model.name;
  data.vehicleConfiguration = variant.name;
  put(data, "vehicleModelDate", variant.year_start ? String(variant.year_start) : null);
  put(data, "bodyType", formatEnumLabel(model.body_type, ""));
  put(data, "fuelType", variant.fuel_type ? FUEL_LABELS[variant.fuel_type] : null);
  put(
    data,
    "driveWheelConfiguration",
    variant.drive_type ? DRIVE_WHEEL_CONFIGURATIONS[variant.drive_type] : null,
  );

  // --- Engine (or motors: schema.org uses EngineSpecification for both) ----
  const engineSpec: JsonLd = { "@type": "EngineSpecification" };
  put(engineSpec, "name", engine?.name);
  put(
    engineSpec,
    "engineDisplacement",
    quantity(engine?.displacement_cc, { unitCode: "CMQ" }),
  );
  put(engineSpec, "enginePower", quantity(performance?.power_hp, { unitText: "hp" }));
  put(engineSpec, "torque", quantity(performance?.torque_nm, { unitCode: "NMT" }));
  if (
    "engineDisplacement" in engineSpec ||
    "enginePower" in engineSpec ||
    "torque" in engineSpec
  ) {
    data.vehicleEngine = engineSpec;
  }

  put(data, "vehicleTransmission", transmission?.name);
  put(data, "numberOfForwardGears", toFinite(transmission?.gears));

  // --- Performance ------------------------------------------------------------
  put(
    data,
    "accelerationTime",
    quantity(
      performance?.zero_to_100_s,
      { unitCode: "SEC" },
      { description: "0–100 km/h" },
    ),
  );
  const topSpeed = toFinite(performance?.top_speed_kmh);
  if (topSpeed !== null) {
    // `speed` is a range; the top speed is its upper limit.
    data.speed = { "@type": "QuantitativeValue", maxValue: topSpeed, unitCode: "KMH" };
  }

  // --- Dimensions -------------------------------------------------------------
  put(
    data,
    "weight",
    quantity(
      dimensions?.kerb_weight_kg,
      { unitCode: "KGM" },
      { description: "Kerb weight" },
    ),
  );
  // schema.org's Product has depth/width/height; a car's length is its depth.
  put(
    data,
    "depth",
    quantity(
      dimensions?.length_mm,
      { unitCode: "MMT" },
      { description: "Overall length" },
    ),
  );
  put(data, "width", quantity(dimensions?.width_mm, { unitCode: "MMT" }));
  put(data, "height", quantity(dimensions?.height_mm, { unitCode: "MMT" }));
  put(data, "wheelbase", quantity(dimensions?.wheelbase_mm, { unitCode: "MMT" }));
  put(data, "seatingCapacity", toFinite(dimensions?.seating_capacity));

  // --- Fuel -------------------------------------------------------------------
  put(data, "fuelCapacity", quantity(fuel?.tank_capacity_l, { unitCode: "LTR" }));
  put(data, "emissionsCO2", toFinite(fuel?.co2_g_km));

  put(data, "image", options.imageUrl ?? null);

  // --- Offer: only for a real, sourced price handed in by the page -------------
  const price = options.price ? toFinite(options.price.amount) : null;
  const currency = options.price?.currency?.trim().toUpperCase();
  if (
    options.price &&
    price !== null &&
    price > 0 &&
    currency &&
    /^[A-Z]{3}$/.test(currency)
  ) {
    const specification: JsonLd = {
      "@type": "UnitPriceSpecification",
      price,
      priceCurrency: currency,
    };
    const type = options.price.priceType ?? null;
    if (type) {
      put(specification, "priceType", PRICE_TYPE_ENUMERATION[type]);
      put(
        specification,
        "name",
        type === "base_price" ? "Base price" : PRICE_TYPE_LABELS[type],
      );
    }
    const offer: JsonLd = {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      url: options.url,
    };
    put(offer, "areaServed", options.price.areaServed);
    put(offer, "validFrom", options.price.validFrom);
    offer.priceSpecification = specification;
    data.offers = offer;
  }

  return data;
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * JSON for a <script type="application/ld+json"> tag, with every character
 * that could close the tag early escaped. One implementation for the whole
 * site lives in lib/json-ld; this re-export keeps the detail page's imports
 * in one module.
 */
export { serializeJsonLd } from "@/lib/json-ld";
