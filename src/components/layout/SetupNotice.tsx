import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { isSchemaMismatch } from "@/lib/queries/report";

type SetupState =
  | { kind: "ok" }
  | { kind: "unconfigured" }
  | { kind: "unreachable"; detail: string }
  | { kind: "outdated"; detail: string }
  | { kind: "unseeded" };

/**
 * Checks, on every request, that the database matches this version of the
 * code. Uncached on purpose: the whole point is to notice the moment the
 * developer fixes it.
 */
async function checkSetup(): Promise<SetupState> {
  const env = getPublicEnv();
  if (!env) return { kind: "unconfigured" };

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });

  try {
    // One probe per migration this version depends on: 0006 (engine
    // position), 0008 (catalogue price columns, markets, search function).
    const probes = await Promise.all([
      supabase.from("car_models").select("engine_position").limit(1),
      supabase.from("car_catalog").select("listed_price, status").limit(1),
      supabase.from("market_cities").select("id", { count: "exact", head: true }),
      supabase.rpc("search_catalogue", { q: "a", per_kind: 1 }),
    ]);
    for (const probe of probes) {
      if (!probe.error) continue;
      if (isSchemaMismatch(probe.error)) {
        return { kind: "outdated", detail: probe.error.message };
      }
      return { kind: "unreachable", detail: probe.error.message };
    }
    const cities = probes[2];
    const catalogue = probes[1];
    if ((cities.count ?? 0) === 0 || (catalogue.data?.length ?? 0) === 0) {
      return { kind: "unseeded" };
    }
    return { kind: "ok" };
  } catch (error) {
    return {
      kind: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

const MESSAGES: Record<
  Exclude<SetupState["kind"], "ok">,
  { title: string; fix: string }
> = {
  unconfigured: {
    title: "Supabase is not configured",
    fix: "Copy .env.example to .env.local, fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart `npm run dev`.",
  },
  unreachable: {
    title: "The database could not be reached",
    fix: "Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (copy the key in one piece) and that the Supabase project is not paused.",
  },
  outdated: {
    title: "The database is older than this code",
    fix: "Run `npm run db:push` and then `npm run db:seed` (README section 5), or paste migrations 0006, 0007 and 0008 and then seed.sql into the Supabase SQL Editor.",
  },
  unseeded: {
    title: "The database has no catalogue data",
    fix: "Run `npm run db:seed` (it is safe to re-run).",
  },
};

/**
 * A development-only banner that explains a broken setup in one sentence,
 * instead of leaving the developer to decode a page of failed queries. It
 * renders nothing in production, and nothing when the setup is healthy.
 */
export async function SetupNotice() {
  if (process.env.NODE_ENV !== "development") return null;

  const state = await checkSetup();
  if (state.kind === "ok") return null;
  const message = MESSAGES[state.kind];
  const detail = "detail" in state ? state.detail : null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-(--z-toast) mx-auto max-w-2xl rounded-md border border-gold-500/60 bg-surface-2/95 px-4 py-3 text-sm shadow-lg backdrop-blur-md"
    >
      <p className="font-display text-micro tracking-hud text-gold-300 uppercase">
        Developer notice · {message.title}
      </p>
      <p className="mt-1.5 leading-relaxed text-ink-100">{message.fix}</p>
      {detail ? (
        <p className="mt-1.5 font-mono text-xs break-words text-ink-400">{detail}</p>
      ) : null}
      <p className="mt-1.5 text-xs text-ink-500">Shown only by `npm run dev`.</p>
    </div>
  );
}
