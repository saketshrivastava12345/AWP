import "server-only";

import { getPublicEnv } from "@/lib/env";
import { explainFetchFailure } from "@/lib/supabase/diagnose";

/**
 * Error reporting for the data layer.
 *
 * Every query returns an empty value instead of throwing, and logs why. In
 * development Next replays server-side `console.error` calls in the browser,
 * where each one counts as an "issue" in the dev overlay. Two whole classes
 * of failure hit every query on a page in the same way, and showed a dozen
 * cryptic issues for one cause:
 *
 *   - the database is behind the code (migrations 0006–0008 not applied);
 *   - Supabase cannot be reached at all (`TypeError: fetch failed`: a wrong
 *     URL, the example URL left in .env.local, no network, a proxy).
 *
 * Each is reported once a minute as a single warning that says what to do.
 * Anything else is still an error, exactly as before.
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

/** Transport failures: the request never got an answer from Supabase. */
const NETWORK_MESSAGES = [
  /fetch failed/i,
  /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ENETUNREACH|EHOSTUNREACH/,
  /UND_ERR_/,
  /socket hang up/i,
  /certificate|self.signed/i,
];

const REPEAT_AFTER_MS = 60_000;
const lastWarned: Record<"schema" | "network", number> = { schema: 0, network: 0 };

function describe(value: unknown): { code: string | null; message: string } {
  if (typeof value === "string") return { code: null, message: value };
  if (value && typeof value === "object") {
    const record = value as { code?: unknown; message?: unknown; cause?: unknown };
    const message = typeof record.message === "string" ? record.message : "";
    const code = typeof record.code === "string" ? record.code : null;
    // An Error thrown by fetch keeps the system code on its cause.
    const cause =
      record.cause && typeof record.cause === "object" ? describe(record.cause) : null;
    return {
      code: code ?? cause?.code ?? null,
      message: [message, cause?.message].filter(Boolean).join(": "),
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

/** True when an error means "Supabase could not be reached". */
export function isNetworkFailure(...parts: unknown[]): boolean {
  return parts.some((part) => {
    const { code, message } = describe(part);
    const text = `${code ?? ""} ${message}`;
    return NETWORK_MESSAGES.some((pattern) => pattern.test(text));
  });
}

function warnOnce(kind: "schema" | "network", message: string): void {
  const now = Date.now();
  if (now - lastWarned[kind] < REPEAT_AFTER_MS) return;
  lastWarned[kind] = now;
  console.warn(message);
}

function networkHint(args: unknown[]): string {
  const url = getPublicEnv()?.supabaseUrl ?? "";
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Leave the raw value; an unparsable URL is itself the problem.
  }
  const failure = args.find((arg) => isNetworkFailure(arg));
  const explained = explainFetchFailure(failure, host || "the Supabase URL");
  return (
    `[AURIX] Supabase could not be reached, so every query on this page ` +
    `returned nothing. ${explained.summary} ${explained.fix} ` +
    `Run \`npm run doctor\` to check the setup step by step.`
  );
}

/**
 * Drop-in for `console.error(label, error)` in query functions. A schema
 * mismatch or an unreachable Supabase is reported as one warning with the
 * fix (at most once a minute); every other failure is logged as an error.
 */
export function reportQueryError(...args: unknown[]): void {
  if (isSchemaMismatch(...args)) {
    const detail = args.map((arg) => describe(arg).message || String(arg)).join(" ");
    warnOnce("schema", `${MIGRATION_HINT}\n  First failure: ${detail}`);
    return;
  }
  if (isNetworkFailure(...args)) {
    warnOnce("network", networkHint(args));
    return;
  }
  console.error(...args);
}
