import { getPublicEnv } from "@/lib/env";
import { isSchemaMismatch } from "@/lib/queries/report";
import { explainFetchFailure, isPlaceholderHost } from "@/lib/supabase/diagnose";

type SetupState =
  | { kind: "ok" }
  | { kind: "unconfigured" }
  | { kind: "badurl"; detail: string }
  | { kind: "placeholder"; host: string }
  | { kind: "unreachable"; summary: string; fix: string; code: string | null }
  | { kind: "badkey"; detail: string }
  | { kind: "noapi"; url: string; detail: string }
  | { kind: "http"; status: number; detail: string }
  | { kind: "outdated"; missing: string; detail: string }
  | { kind: "unseeded" };

type Probe = { status: number; text: string; json: unknown };

/**
 * One request to the project's API. Throws on a transport failure (DNS,
 * refused, timeout, TLS) so the caller can explain the cause; any HTTP
 * answer, including an error, comes back as a Probe.
 */
async function probe(
  env: { supabaseUrl: string; supabaseAnonKey: string },
  path: string,
  init: RequestInit = {},
): Promise<Probe> {
  const response = await fetch(`${env.supabaseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON (an HTML gateway page, say); the text is enough.
  }
  return { status: response.status, text, json };
}

/** The API gateway's answer for a path it has no route for. */
const INVALID_PATH = /invalid path specified/i;

function messageOf(result: Probe): string {
  const message = (result.json as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : result.text.slice(0, 160);
}

/** A schema probe: the object it needs, and the migration that creates it. */
const SCHEMA_PROBES = [
  {
    path: "/rest/v1/car_catalog?select=listed_price,status&limit=1",
    missing: "the catalogue price columns from migration 0008",
    missingEntirely: "the core schema (migration 0001 onwards)",
  },
  {
    path: "/rest/v1/car_models?select=engine_position&limit=1",
    missing: "the engine_position column from migration 0006",
    missingEntirely: "the core schema (migration 0001 onwards)",
  },
  {
    path: "/rest/v1/market_cities?select=id&limit=1",
    missing: "the markets tables from migration 0008",
    missingEntirely: "the markets tables from migration 0008",
  },
  {
    path: "/rest/v1/rpc/search_catalogue",
    init: { method: "POST", body: JSON.stringify({ q: "a", per_kind: 1 }) },
    missing: "the search function from migration 0008",
    missingEntirely: "the search function from migration 0008",
  },
] as const;

/**
 * Checks, on every request, that the environment and the database match
 * this version of the code. Uncached on purpose: the whole point is to
 * notice the moment the developer fixes it.
 */
async function checkSetup(): Promise<SetupState> {
  const env = getPublicEnv();
  if (!env) return { kind: "unconfigured" };

  let host: string;
  try {
    const url = new URL(env.supabaseUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("not http(s)");
    host = url.host;
  } catch {
    return { kind: "badurl", detail: env.supabaseUrl };
  }
  if (isPlaceholderHost(host) || /^sb_publishable_x+$/i.test(env.supabaseAnonKey)) {
    return { kind: "placeholder", host };
  }

  // Can the project be reached at all, and does it accept the key?
  let health: Probe;
  try {
    health = await probe(env, "/auth/v1/health");
  } catch (error) {
    const explained = explainFetchFailure(error, host);
    return { kind: "unreachable", ...explained };
  }
  if (health.status === 401 || health.status === 403) {
    return { kind: "badkey", detail: health.text.slice(0, 160) };
  }
  // A 404 from the auth health check means no Supabase API lives at this
  // address (a path pasted after the project URL, or a project that no
  // longer exists) — not a missing table.
  if (health.status === 404) {
    return { kind: "noapi", url: env.supabaseUrl, detail: messageOf(health) };
  }
  if (health.status >= 500) {
    return { kind: "http", status: health.status, detail: health.text.slice(0, 160) };
  }

  // Does the database carry what this version needs?
  const probes = await Promise.all(
    SCHEMA_PROBES.map((entry) =>
      probe(env, entry.path, "init" in entry ? entry.init : {}),
    ),
  );
  for (const [index, result] of probes.entries()) {
    const spec = SCHEMA_PROBES[index]!;
    if (result.status === 200) continue;
    if (result.status === 401)
      return { kind: "badkey", detail: result.text.slice(0, 160) };
    const record = (result.json ?? {}) as { code?: string; message?: string };
    if (INVALID_PATH.test(record.message ?? "")) {
      return { kind: "noapi", url: env.supabaseUrl, detail: messageOf(result) };
    }
    const missing =
      result.status === 404 || record.code === "42P01" || record.code === "PGRST205"
        ? spec.missingEntirely
        : spec.missing;
    if (result.status === 404 || result.status === 403 || isSchemaMismatch(record)) {
      return {
        kind: "outdated",
        missing,
        detail: record.message ?? result.text.slice(0, 160),
      };
    }
    return { kind: "http", status: result.status, detail: result.text.slice(0, 160) };
  }

  const rows = (index: number) =>
    Array.isArray(probes[index]?.json) ? probes[index]!.json.length : 0;
  if (rows(0) === 0 || rows(2) === 0) return { kind: "unseeded" };
  return { kind: "ok" };
}

function messageFor(state: Exclude<SetupState, { kind: "ok" }>): {
  title: string;
  fix: string;
  detail: string | null;
} {
  switch (state.kind) {
    case "unconfigured":
      return {
        title: "Supabase is not configured",
        fix: "Copy .env.example to .env.local, fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase → Project Settings, then restart `npm run dev`.",
        detail: null,
      };
    case "badurl":
      return {
        title: "NEXT_PUBLIC_SUPABASE_URL is not a valid URL",
        fix: "It must look like https://abcdefghijkl.supabase.co (Project Settings → Data API → Project URL). Restart `npm run dev` after changing .env.local.",
        detail: state.detail,
      };
    case "placeholder":
      return {
        title: ".env.local still has the example values",
        fix: "Replace NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY with your own project's URL and publishable key (Supabase → Project Settings → Data API and API Keys), then restart `npm run dev`.",
        detail: state.host,
      };
    case "unreachable":
      return {
        title: "Supabase could not be reached",
        fix: `${state.summary} ${state.fix} \`npm run doctor\` checks this step by step.`,
        detail: state.code ? `Error code: ${state.code}` : null,
      };
    case "badkey":
      return {
        title: "The project rejected the API key",
        fix: "NEXT_PUBLIC_SUPABASE_ANON_KEY does not match this project. Copy the publishable key again in one piece (Project Settings → API Keys); a key that lost its last characters when pasted fails exactly like this.",
        detail: state.detail,
      };
    case "noapi":
      return {
        title: "No Supabase API answered at this URL",
        fix: "NEXT_PUBLIC_SUPABASE_URL must be exactly your Project URL (Supabase → Project Settings → Data API), like https://abcdefghijkl.supabase.co — nothing after .co. Save .env.local, then stop and restart `npm run dev`: the URL is read only when the dev server starts. If it is already exact, check in the Supabase dashboard that the project still exists and is not paused.",
        detail: `${state.url} — ${state.detail}`,
      };
    case "http":
      return {
        title: `Supabase answered HTTP ${state.status}`,
        fix: "If the Supabase dashboard says the project is paused, restore it; free-tier projects pause after a week without traffic. Otherwise check the project's status page.",
        detail: state.detail,
      };
    case "outdated":
      return {
        title: "The database is older than this code",
        fix: `It is missing ${state.missing}. Run \`npm run db:push\` and then \`npm run db:seed\` (README section 5), or paste the migration files and seed.sql into the Supabase SQL Editor in order.`,
        detail: state.detail,
      };
    case "unseeded":
      return {
        title: "The database has no catalogue data",
        fix: "Run `npm run db:seed` (safe to re-run), or paste supabase/seed.sql into the SQL Editor.",
        detail: null,
      };
  }
}

/**
 * A development-only banner that explains a broken setup in one sentence,
 * instead of leaving the developer to decode a page of failed queries. It
 * renders nothing in production, and nothing when the setup is healthy.
 */
export async function SetupNotice() {
  if (process.env.NODE_ENV !== "development") return null;

  const state = await checkSetup();
  if (state.kind === "ok") return null;
  const message = messageFor(state);

  return (
    <div
      role="status"
      data-setup-notice={state.kind}
      className="fixed inset-x-3 bottom-3 z-(--z-toast) mx-auto max-w-2xl rounded-card border border-line-strong bg-surface-2/95 px-4 py-3 text-sm shadow-overlay backdrop-blur-md"
    >
      <p className="text-body-s font-medium text-ink-50">
        Developer notice · {message.title}
      </p>
      <p className="mt-1.5 leading-relaxed text-ink-100">{message.fix}</p>
      {message.detail ? (
        <p className="mt-1.5 font-mono text-xs break-words text-ink-400">
          {message.detail}
        </p>
      ) : null}
      <p className="mt-1.5 text-caption">
        Shown only by `npm run dev`. Run `npm run doctor` in a terminal for the full
        check.
      </p>
    </div>
  );
}
