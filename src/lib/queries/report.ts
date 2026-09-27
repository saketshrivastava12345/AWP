import "server-only";

/**
 * Error reporting for the data layer.
 *
 * Every query returns an empty value instead of throwing, and logs why. In
 * development Next replays server-side `console.error` calls in the browser,
 * where each one counts as an "issue" in the dev overlay. When the database
 * is simply behind the code — migrations 0006–0008 not yet applied — every
 * query that touches a new table or column fails the same way, and a page
 * showed a dozen cryptic issues for one cause. Those failures are reported
 * once, as a single warning that says what to run; anything else is still an
 * error.
 */

const MIGRATION_HINT =
  "[AURIX] The database is missing tables or columns this version needs " +
  "(migrations 0006–0008). Apply them with `npm run db:push`, then run " +
  "`npm run db:seed`. See README section 5.";

/** PostgREST / Postgres signatures of "that object does not exist yet". */
const SCHEMA_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "42883", // undefined_function
  "42704", // undefined_object (e.g. an enum value)
  "PGRST200", // relationship not found
  "PGRST202", // function not found
  "PGRST204", // column not found
  "PGRST205", // table not found
]);

const SCHEMA_MESSAGES = [
  /does not exist/i,
  /could not find (the|a) (table|function|column|relationship)/i,
  /in the schema cache/i,
  /invalid input value for enum/i,
];

let warnedAboutSchema = false;

function describe(value: unknown): { code: string | null; message: string } {
  if (typeof value === "string") return { code: null, message: value };
  if (value && typeof value === "object") {
    const record = value as { code?: unknown; message?: unknown };
    return {
      code: typeof record.code === "string" ? record.code : null,
      message: typeof record.message === "string" ? record.message : "",
    };
  }
  return { code: null, message: "" };
}

/** True when an error means "the database schema is older than the code". */
export function isSchemaMismatch(...parts: unknown[]): boolean {
  return parts.some((part) => {
    const { code, message } = describe(part);
    if (code && SCHEMA_CODES.has(code)) return true;
    return message !== "" && SCHEMA_MESSAGES.some((pattern) => pattern.test(message));
  });
}

/**
 * Drop-in for `console.error(label, error)` in query functions. A schema
 * mismatch is reported once per server process as a warning with the fix;
 * every other failure is logged as an error exactly as before.
 */
export function reportQueryError(...args: unknown[]): void {
  if (isSchemaMismatch(...args)) {
    if (!warnedAboutSchema) {
      warnedAboutSchema = true;
      const detail = args.map((arg) => describe(arg).message || String(arg)).join(" ");
      console.warn(`${MIGRATION_HINT}\n  First failure: ${detail}`);
    }
    return;
  }
  console.error(...args);
}
