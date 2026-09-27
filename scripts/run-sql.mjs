#!/usr/bin/env node
/**
 * Run a .sql file, or an inline query, against the hosted Supabase database.
 *
 * Exists because `psql` is not available on this machine and the Supabase CLI's
 * `db dump` / `db reset` paths require Docker, which this project deliberately
 * does not use. `supabase db push` handles migrations; this script covers the
 * seed file and ad-hoc verification queries.
 *
 * Usage:
 *   node scripts/run-sql.mjs supabase/seed.sql
 *   node scripts/run-sql.mjs --query "select count(*) from public.countries"
 *
 * Reads SUPABASE_DB_URL from .env.local.
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Could not read .env.local. Copy .env.example and fill it in.");
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}

loadEnvLocal();

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("SUPABASE_DB_URL is not set in .env.local.");
  process.exit(1);
}

// The example connection string from .env.example points at a host that does
// not exist, so a copy of that file that was never filled in fails here with
// "ENOTFOUND aws-0-region.pooler.supabase.com". Say so instead.
if (/your-project-ref|YOUR_DB_PASSWORD|aws-0-region/.test(connectionString)) {
  console.error(
    "SUPABASE_DB_URL in .env.local still holds the example value from .env.example.\n" +
      "Replace it with your project's connection string: Supabase dashboard -> Project\n" +
      "Settings -> Database -> Connection string (URI), with your database password\n" +
      "filled in. `npm run doctor` checks every value in .env.local.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const queryIndex = args.indexOf("--query");
if (queryIndex === -1 && !args[0]) {
  console.error(
    'Usage: node scripts/run-sql.mjs <file.sql>\n       node scripts/run-sql.mjs --query "<sql>"',
  );
  process.exit(1);
}
const sql = queryIndex !== -1 ? args[queryIndex + 1] : readFileSync(args[0], "utf8");

if (!sql) {
  console.error('Nothing to run. Pass a .sql file path or --query "<sql>".');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // The seed is a single large multi-statement script.
  statement_timeout: 300_000,
});

try {
  await client.connect();
  const result = await client.query(sql);
  const results = Array.isArray(result) ? result : [result];
  for (const r of results) {
    if (r.rows?.length) console.table(r.rows);
    else if (r.rowCount != null)
      console.log(`${r.command ?? "OK"}: ${r.rowCount} row(s)`);
  }
  console.log("Done.");
} catch (error) {
  console.error("SQL failed:");
  console.error(error instanceof Error ? error.message : error);
  if (error && typeof error === "object" && "position" in error) {
    const pos = Number(error.position);
    if (Number.isFinite(pos)) {
      console.error("--- context ---");
      console.error(sql.slice(Math.max(0, pos - 400), pos + 200));
    }
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
