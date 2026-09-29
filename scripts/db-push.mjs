#!/usr/bin/env node
/**
 * Apply pending migrations in supabase/migrations/ to the hosted database.
 *
 * A thin wrapper around `supabase db push --db-url ...` that reads
 * SUPABASE_DB_URL from .env.local, so the connection string (which contains the
 * database password) never has to be typed on the command line or committed.
 *
 * `supabase db push` talks to Postgres directly and does NOT require Docker —
 * unlike `supabase db dump`, `db reset` and `gen types --db-url`, which do.
 *
 * Usage:
 *   node scripts/db-push.mjs              apply pending migrations
 *   node scripts/db-push.mjs --dry-run    list what would be applied
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set in .env.local.");
  process.exit(1);
}

// The example connection string from .env.example points at a host that does
// not exist, so a copy of that file that was never filled in fails here with
// "ENOTFOUND aws-0-region.pooler.supabase.com". Say so instead.
if (/your-project-ref|YOUR_DB_PASSWORD|aws-0-region/.test(dbUrl)) {
  console.error(
    "SUPABASE_DB_URL in .env.local still holds the example value from .env.example.\n" +
      "Replace it with your project's connection string: Supabase dashboard -> Project\n" +
      "Settings -> Database -> Connection string (URI), with your database password\n" +
      "filled in. `npm run doctor` checks every value in .env.local.",
  );
  process.exit(1);
}

// Invoke the CLI's JS entry point with the current Node binary rather than the
// `supabase` shim. Node 22 refuses to spawn .cmd shims without `shell: true`,
// and putting the connection string through a shell would risk mangling it.
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);

const result = spawnSync(
  process.execPath,
  [cli, "db", "push", "--db-url", dbUrl, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
