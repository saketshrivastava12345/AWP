import { readPriceFields, type PriceFields } from "./price-input";
import { FieldReader } from "./validation";

/**
 * CSV import for market prices.
 *
 * `parseCsv` is a small RFC 4180 reader (quoted fields, doubled quotes,
 * embedded commas and newlines, CRLF or LF, a UTF-8 BOM from Excel).
 * `validatePriceCsv` resolves every row's vehicle and market paths against the
 * catalogue and runs the same price rules as the form, so the preview shows
 * exactly what would be saved and why a row would not be.
 *
 * Pure and client-safe; the server re-runs it before committing anything.
 */

export const PRICE_CSV_COLUMNS = [
  "variant",
  "market",
  "price_type",
  "currency",
  "ex_showroom_price",
  "rto_tax",
  "registration_fee",
  "insurance_estimate",
  "handling_charges",
  "fastag",
  "other_charges",
  "on_road_price",
  "effective_from",
  "effective_to",
  "source",
  "source_url",
  "last_verified_at",
  "is_verified",
  "notes",
] as const;

const REQUIRED_COLUMNS = [
  "variant",
  "market",
  "price_type",
  "effective_from",
  "source",
  "source_url",
  "last_verified_at",
] as const;

export const MAX_CSV_ROWS = 1000;

/** The downloadable template: the header row only. No sample data. */
export function priceCsvTemplate(): string {
  return `${PRICE_CSV_COLUMNS.join(",")}\r\n`;
}

export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"' && field === "") {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += char === "\r" && input[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Blank lines (including the trailing newline) carry no data.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export type CsvCity = { id: string; name: string };
export type CsvRegion = { id: string; name: string; cities: Map<string, CsvCity> };
export type CsvCountry = {
  id: string;
  name: string;
  currency: string | null;
  regions: Map<string, CsvRegion>;
};

export type CsvLookups = {
  /** "manufacturer/model/variant" slugs -> variant. */
  variants: Map<string, { id: string; label: string }>;
  /** country slug -> country with its regions and cities (by slug). */
  countries: Map<string, CsvCountry>;
  today: string;
};

export type CsvRowResult = {
  /** 1-based line number in the file (the header is line 1). */
  line: number;
  variantPath: string;
  marketPath: string;
  variantId: string | null;
  variantLabel: string | null;
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
  marketLabel: string | null;
  fields: PriceFields | null;
  errors: string[];
};

export type CsvValidation = {
  headerErrors: string[];
  rows: CsvRowResult[];
  validCount: number;
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const IS_VERIFIED_VALUES = new Set([
  "",
  "true",
  "false",
  "yes",
  "no",
  "y",
  "n",
  "1",
  "0",
]);

export function validatePriceCsv(text: string, lookups: CsvLookups): CsvValidation {
  const table = parseCsv(text);
  const header = table[0];
  if (!header) {
    return { headerErrors: ["The file is empty."], rows: [], validCount: 0 };
  }

  const columns = header.map(normalizeHeader);
  const headerErrors: string[] = [];
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length)
    headerErrors.push(`Missing required column(s): ${missing.join(", ")}.`);
  const known = new Set<string>(PRICE_CSV_COLUMNS);
  const unknown = columns.filter((name) => name && !known.has(name));
  if (unknown.length) headerErrors.push(`Unknown column(s): ${unknown.join(", ")}.`);
  const duplicated = columns.filter(
    (name, index) => name && columns.indexOf(name) !== index,
  );
  if (duplicated.length)
    headerErrors.push(`Repeated column(s): ${[...new Set(duplicated)].join(", ")}.`);

  const body = table.slice(1);
  if (body.length === 0) headerErrors.push("The file has a header row but no prices.");
  if (body.length > MAX_CSV_ROWS) {
    headerErrors.push(
      `At most ${MAX_CSV_ROWS} rows can be imported at once (found ${body.length}).`,
    );
  }
  if (headerErrors.length) return { headerErrors, rows: [], validCount: 0 };

  const seen = new Map<string, number>();
  const rows = body.map((cells, index): CsvRowResult => {
    const line = index + 2;
    const record: Record<string, string> = {};
    columns.forEach((name, column) => {
      record[name] = (cells[column] ?? "").trim();
    });
    const errors: string[] = [];
    if (
      cells.length > columns.length &&
      cells.slice(columns.length).some((c) => c.trim())
    ) {
      errors.push("The row has more values than the header has columns.");
    }

    const variantPath = (record.variant ?? "").toLowerCase().replace(/^\/+|\/+$/g, "");
    const marketPath = (record.market ?? "").toLowerCase().replace(/^\/+|\/+$/g, "");
    const variant = lookups.variants.get(variantPath) ?? null;
    if (!variantPath) errors.push("variant is required (manufacturer/model/variant).");
    else if (!variant) errors.push(`No vehicle at “${variantPath}”.`);

    const [countrySlug = "", regionSlug, citySlug, ...extra] = marketPath.split("/");
    const country = lookups.countries.get(countrySlug) ?? null;
    let region: CsvRegion | null = null;
    let city: CsvCity | null = null;
    if (!marketPath) errors.push("market is required (country[/state[/city]]).");
    else if (!country) errors.push(`No country “${countrySlug}”.`);
    else {
      if (regionSlug) {
        region = country.regions.get(regionSlug) ?? null;
        if (!region) errors.push(`No state “${regionSlug}” in ${country.name}.`);
      }
      if (citySlug && region) {
        city = region.cities.get(citySlug) ?? null;
        if (!city) errors.push(`No city “${citySlug}” in ${region.name}.`);
      }
      if (extra.length)
        errors.push("market has too many levels (country/state/city at most).");
    }

    if (!IS_VERIFIED_VALUES.has((record.is_verified ?? "").toLowerCase())) {
      errors.push("is_verified must be true or false.");
    }

    const reader = FieldReader.fromRecord(record);
    const fields = readPriceFields(reader, {
      today: lookups.today,
      defaultCurrency: country?.currency ?? null,
    });
    for (const [name, message] of Object.entries(reader.errors)) {
      errors.push(message.includes(name) ? message : `${name}: ${message}`);
    }

    if (fields && variant && country && errors.length === 0) {
      const key = [
        variant.id,
        country.id,
        region?.id ?? "",
        city?.id ?? "",
        fields.price_type,
        fields.effective_from,
      ].join("|");
      const earlier = seen.get(key);
      if (earlier !== undefined) {
        errors.push(
          `Duplicates line ${earlier}: same vehicle, market, type and effective date.`,
        );
      } else {
        seen.set(key, line);
      }
    }

    const marketLabel = country
      ? [city?.name, region?.name, country.name].filter(Boolean).join(", ")
      : null;

    return {
      line,
      variantPath,
      marketPath,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      countryId: country?.id ?? null,
      regionId: region?.id ?? null,
      cityId: city?.id ?? null,
      marketLabel,
      fields: errors.length ? null : fields,
      errors,
    };
  });

  return {
    headerErrors: [],
    rows,
    validCount: rows.filter((row) => row.errors.length === 0).length,
  };
}
