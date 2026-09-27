/**
 * Server-side input validation for the admin tools.
 *
 * Pure and dependency-free: the same readers validate a submitted form, a CSV
 * row and a unit test. Every rule mirrors a database constraint (or is
 * stricter), so a bad value is refused with a readable message before the
 * database ever sees it — the database constraints stay as the second line of
 * defence.
 *
 * Data honesty: an empty field reads as NULL. Nothing here ever substitutes a
 * default number for a missing one.
 */

export type FieldErrors = Record<string, string>;

export const PATTERNS = {
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  currency: /^[A-Z]{3}$/,
  url: /^https?:\/\/[^\s/$.?#][^\s]*$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  hex: /^#[0-9a-fA-F]{6}$/,
} as const;

/** The first automobile (Benz Patent-Motorwagen) to the schema's upper bound. */
export const YEAR_MIN = 1885;
export const YEAR_MAX = 2100;

/** Postgres `integer`. */
export const INT4_MAX = 2_147_483_647;

/** Longest free text accepted anywhere in the admin (descriptions, notes). */
export const LONG_TEXT_MAX = 5000;
/** Default limit for short text fields (names, sources). */
export const SHORT_TEXT_MAX = 200;
export const URL_MAX = 2048;

/** Today's date as YYYY-MM-DD in UTC. Injected in tests. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const time = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10);
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!PATTERNS.date.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && PATTERNS.uuid.test(value);
}

/**
 * A URL-safe slug suggestion from a display name: "Model S Plaid" ->
 * "model-s-plaid", "Škoda Octavia RS" -> "skoda-octavia-rs". The admin can
 * always overwrite it; it is only a starting point.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Parses a number typed by a person. Grouping separators are tolerated
 * ("2,80,00,000", "1 250", "1_250") because prices are routinely pasted that
 * way; anything else that is not a plain decimal is refused rather than
 * guessed at ("12abc" is an error, not 12).
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s,_  ]/g, "");
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function decimalPlaces(raw: string): number {
  const cleaned = raw.replace(/[\s,_  ]/g, "");
  const dot = cleaned.indexOf(".");
  return dot === -1 ? 0 : cleaned.length - dot - 1;
}

type Getter = (name: string) => string | null;

type Common = { required?: boolean };

export type NumberRule = Common & {
  /** Inclusive lower bound. */
  min?: number;
  /** Exclusive lower bound (the DB's `> 0`). */
  above?: number;
  /** Inclusive upper bound. */
  max?: number;
  /** Maximum decimal places (the column's numeric scale). 0 = integer. */
  scale?: number;
  unit?: string;
};

/**
 * Reads and validates named fields, collecting one message per field.
 *
 *   const r = FieldReader.fromFormData(formData);
 *   const power = r.number("power_hp", "Power", { above: 0, max: 5000, scale: 0 });
 *   if (!r.ok) return { fieldErrors: r.errors };
 */
export class FieldReader {
  readonly errors: FieldErrors = {};
  private readonly get: Getter;

  constructor(get: Getter) {
    this.get = get;
  }

  static fromFormData(formData: FormData): FieldReader {
    return new FieldReader((name) => {
      const value = formData.get(name);
      return typeof value === "string" ? value : null;
    });
  }

  static fromRecord(record: Readonly<Record<string, string | null | undefined>>) {
    return new FieldReader((name) => record[name] ?? null);
  }

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  /** Records an error unless the field already has one. */
  fail(name: string, message: string): null {
    if (!(name in this.errors)) this.errors[name] = message;
    return null;
  }

  /** The trimmed raw value, or "" when absent. */
  raw(name: string): string {
    return (this.get(name) ?? "").trim();
  }

  has(name: string): boolean {
    return this.raw(name) !== "";
  }

  text(
    name: string,
    label: string,
    rule: Common & { max?: number; min?: number } = {},
  ): string | null {
    const value = this.raw(name);
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    const max = rule.max ?? SHORT_TEXT_MAX;
    if (value.length > max) {
      return this.fail(name, `${label} must be at most ${max} characters.`);
    }
    if (rule.min && value.length < rule.min) {
      return this.fail(name, `${label} must be at least ${rule.min} characters.`);
    }
    return value;
  }

  number(name: string, label: string, rule: NumberRule = {}): number | null {
    const raw = this.raw(name);
    if (!raw) return rule.required ? this.fail(name, `${label} is required.`) : null;
    const value = parseNumber(raw);
    if (value === null) return this.fail(name, `${label} must be a number.`);
    const scale = rule.scale ?? 0;
    if (decimalPlaces(raw) > scale) {
      return this.fail(
        name,
        scale === 0
          ? `${label} must be a whole number.`
          : `${label} allows at most ${scale} decimal place${scale === 1 ? "" : "s"}.`,
      );
    }
    const unit = rule.unit ? ` ${rule.unit}` : "";
    if (rule.above !== undefined && !(value > rule.above)) {
      return this.fail(name, `${label} must be greater than ${rule.above}${unit}.`);
    }
    if (rule.min !== undefined && value < rule.min) {
      return this.fail(name, `${label} must be at least ${rule.min}${unit}.`);
    }
    const max = rule.max ?? (scale === 0 ? INT4_MAX : undefined);
    if (max !== undefined && value > max) {
      return this.fail(
        name,
        `${label} must be at most ${max.toLocaleString("en-US")}${unit}.`,
      );
    }
    return value;
  }

  year(name: string, label: string, rule: Common = {}): number | null {
    return this.number(name, label, { ...rule, min: YEAR_MIN, max: YEAR_MAX, scale: 0 });
  }

  date(
    name: string,
    label: string,
    rule: Common & { notAfter?: string; notBefore?: string } = {},
  ): string | null {
    const value = this.raw(name);
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    if (!isIsoDate(value))
      return this.fail(name, `${label} must be a date (YYYY-MM-DD).`);
    if (rule.notAfter && value > rule.notAfter) {
      return this.fail(name, `${label} cannot be after ${rule.notAfter}.`);
    }
    if (rule.notBefore && value < rule.notBefore) {
      return this.fail(name, `${label} cannot be before ${rule.notBefore}.`);
    }
    return value;
  }

  url(name: string, label: string, rule: Common = {}): string | null {
    const value = this.raw(name);
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    if (value.length > URL_MAX) return this.fail(name, `${label} is too long.`);
    if (!PATTERNS.url.test(value)) {
      return this.fail(name, `${label} must start with http:// or https://.`);
    }
    try {
      new URL(value);
    } catch {
      return this.fail(name, `${label} is not a valid address.`);
    }
    return value;
  }

  slug(name: string, label: string, rule: Common = {}): string | null {
    const value = this.raw(name);
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    if (value.length > 80)
      return this.fail(name, `${label} must be at most 80 characters.`);
    if (!PATTERNS.slug.test(value)) {
      return this.fail(
        name,
        `${label} may only use lowercase letters, digits and single hyphens (e.g. "turbo-s").`,
      );
    }
    return value;
  }

  currency(name: string, label: string, rule: Common = {}): string | null {
    const value = this.raw(name).toUpperCase();
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    if (!PATTERNS.currency.test(value)) {
      return this.fail(
        name,
        `${label} must be a three-letter ISO code such as INR or USD.`,
      );
    }
    return value;
  }

  hex(name: string, label: string, rule: Common = {}): string | null {
    const value = this.raw(name);
    if (!value) return rule.required ? this.fail(name, `${label} is required.`) : null;
    if (!PATTERNS.hex.test(value)) {
      return this.fail(name, `${label} must be a colour like #1A2B3C.`);
    }
    return value.toUpperCase();
  }

  uuid(name: string, label: string, rule: Common = {}): string | null {
    const value = this.raw(name);
    if (!value)
      return rule.required ? this.fail(name, `Choose a ${label.toLowerCase()}.`) : null;
    if (!PATTERNS.uuid.test(value)) return this.fail(name, `${label} is not valid.`);
    return value.toLowerCase();
  }

  choice<T extends string>(
    name: string,
    label: string,
    values: readonly T[],
    rule: Common = {},
  ): T | null {
    const value = this.raw(name);
    if (!value)
      return rule.required ? this.fail(name, `Choose a ${label.toLowerCase()}.`) : null;
    const match = values.find((candidate) => candidate === value);
    if (match === undefined)
      return this.fail(name, `${label} "${value}" is not a valid option.`);
    return match;
  }

  /** Checkbox semantics: present and truthy ("on", "true", "1", "yes"). */
  boolean(name: string): boolean {
    return ["on", "true", "1", "yes", "y"].includes(this.raw(name).toLowerCase());
  }

  /**
   * A tri-state yes/no answer that must be given ("true" / "false"), e.g.
   * "is this the exact vehicle?". There is no default.
   */
  answer(name: string, message: string): boolean | null {
    const value = this.raw(name).toLowerCase();
    if (value === "true" || value === "yes") return true;
    if (value === "false" || value === "no") return false;
    return this.fail(name, message);
  }
}

/** Every value in a FormData as trimmed strings (for echoing a form back). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/**
 * Provenance fields shared by every sourced section: a source is required as
 * soon as any figure is recorded, a URL must be http(s), and a verification
 * date cannot be in the future or recorded without a source.
 */
export function readProvenance(
  reader: FieldReader,
  options: { hasData: boolean; today: string; sourceRequired?: boolean },
): { source: string | null; source_url: string | null; last_verified_at: string | null } {
  const source = reader.text("source", "Source", {
    max: 500,
    required: options.sourceRequired ?? options.hasData,
  });
  const source_url = reader.url("source_url", "Source URL");
  const last_verified_at = reader.date("last_verified_at", "Last verified", {
    notAfter: options.today,
    notBefore: "1990-01-01",
  });
  if (last_verified_at && !source && !("source" in reader.errors)) {
    reader.fail("source", "Record the source you verified against.");
  }
  if (source_url && !source && !("source" in reader.errors)) {
    reader.fail("source", "Name the source this URL belongs to.");
  }
  return { source, source_url, last_verified_at };
}
