#!/usr/bin/env node
/**
 * Checks the local setup step by step and says exactly what to fix.
 *
 * Every data query in the app degrades to an empty result when Supabase
 * cannot be reached, so a broken setup shows as empty pages and a wall of
 * "TypeError: fetch failed". This script walks the same path a request
 * takes — .env.local, the URL, DNS, the API key, the schema, the seed — and
 * stops at the first thing that is wrong.
 *
 * Usage:  npm run doctor
 *
 * Needs nothing but Node 22. Reads .env.local; values already in the
 * environment take precedence. Prints the project host but never the key.
 */

import { existsSync, readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";

const ROOT = new URL("../", import.meta.url);
const MIN_NODE = [22, 12, 0];
const TIMEOUT_MS = 10_000;

const lines = [];
let failed = false;
let nextStep = null;

function pass(label, detail = "") {
  lines.push(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
}
function note(label, detail = "") {
  lines.push(`  · ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label, detail, fix) {
  failed = true;
  lines.push(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (fix && !nextStep) nextStep = fix;
}

function finish() {
  console.log("\nAURIX setup check\n");
  console.log(lines.join("\n"));
  console.log("");
  if (failed) {
    console.log(`Next step: ${nextStep}\n`);
    process.exit(1);
  }
  console.log("Everything checks out. Start the app with `npm run dev`.\n");
}

// --- 1. Node -----------------------------------------------------------------

const nodeVersion = process.versions.node.split(".").map(Number);
const nodeOk = (() => {
  for (let i = 0; i < MIN_NODE.length; i++) {
    const actual = nodeVersion[i] ?? 0;
    if (actual !== MIN_NODE[i]) return actual > MIN_NODE[i];
  }
  return true;
})();
if (nodeOk) pass(`Node ${process.versions.node}`);
else {
  fail(
    `Node ${process.versions.node} is too old`,
    "this project needs 22.12 or newer",
    "Install the current Node 22 LTS from https://nodejs.org and run `npm install` again.",
  );
}

// --- 2. .env.local -----------------------------------------------------------

const envPath = new URL(".env.local", ROOT);
if (!existsSync(envPath)) {
  fail(
    ".env.local is missing",
    "",
    "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase → Project Settings.",
  );
  finish();
}
pass(".env.local found");

for (const line of readFileSync(envPath, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!match) continue;
  const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  process.env[match[1]] ??= value;
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const dbUrl = (process.env.SUPABASE_DB_URL ?? "").trim();

if (!url || !key) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty",
    "",
    "Fill both in .env.local: Project URL from Project Settings → Data API, publishable key from Project Settings → API Keys.",
  );
  finish();
}

let host = "";
try {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("not http(s)");
  host = parsed.host;
  pass("Project URL parses", host);
} catch {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL is not a valid URL",
    url,
    "It must look like https://abcdefghijkl.supabase.co (Project Settings → Data API → Project URL).",
  );
  finish();
}

if (
  /your-project-ref|example\.com|xxxx/i.test(host) ||
  /^sb_publishable_x+$/i.test(key)
) {
  fail(
    ".env.local still holds the example values",
    host,
    "Replace NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY with your own project's values (Supabase → Project Settings → Data API and API Keys).",
  );
  finish();
}
pass("Publishable key present", `${key.slice(0, 15)}… (${key.length} characters)`);
if (key.length < 30) {
  fail(
    "The publishable key looks truncated",
    `${key.length} characters`,
    "Copy the key again in one piece from Project Settings → API Keys; a key that lost its last characters when pasted is rejected with 401.",
  );
}

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  note(
    "A proxy is configured in the environment",
    "Node's fetch does not use HTTP(S)_PROXY, so the app connects directly; if only the proxy can reach the internet, the checks below will fail",
  );
}

// --- 3. DNS ------------------------------------------------------------------

const hostname = host.replace(/:\d+$/, "");
try {
  const address = await lookup(hostname);
  pass(`DNS resolves ${hostname}`, address.address);
} catch (error) {
  fail(
    `DNS lookup for ${hostname} failed`,
    error?.code ?? String(error),
    "The project URL is wrong (check Project Settings → Data API), the project was deleted, or this machine is offline.",
  );
  finish();
}

// --- 4. Reaching the API -----------------------------------------------------

async function request(path, init = {}) {
  const response = await fetch(`${url.replace(/\/+$/, "")}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, text, json };
}

function causeOf(error) {
  let current = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth++) {
    if (typeof current.code === "string" && current.code)
      return `${current.code}: ${current.message ?? ""}`;
    current = current.cause;
  }
  return error?.message ?? String(error);
}

let health;
try {
  health = await request("/auth/v1/health");
} catch (error) {
  const cause = causeOf(error);
  const fix = /ECONNREFUSED/.test(cause)
    ? "Nothing is listening at that address; a hosted project never refuses, so the URL points at the wrong place."
    : /TIMEOUT|TIMEDOUT/i.test(cause)
      ? "A firewall, VPN or proxy is blocking the connection (Node's fetch ignores HTTP(S)_PROXY)."
      : /CERT|certificate|self.signed|altname/i.test(cause)
        ? "A corporate proxy or antivirus intercepts HTTPS; point Node at its CA with NODE_EXTRA_CA_CERTS=<path to .pem>."
        : /ENETUNREACH|EHOSTUNREACH/.test(cause)
          ? "No route to the host — often IPv6 without connectivity; try NODE_OPTIONS=--dns-result-order=ipv4first."
          : "Check the network; try the URL in a browser: it should answer, even with an error page.";
  fail(`Could not connect to ${host}`, cause, fix);
  finish();
}

if (health.status === 401 || health.status === 403) {
  fail(
    "The project rejected the API key",
    health.text.slice(0, 120),
    "NEXT_PUBLIC_SUPABASE_ANON_KEY does not match this project. Copy the publishable key again, in one piece, from Project Settings → API Keys.",
  );
  finish();
}
if (health.status >= 500) {
  fail(
    `The project answered HTTP ${health.status}`,
    health.text.slice(0, 120),
    "If the Supabase dashboard says the project is paused, restore it (free-tier projects pause after a week idle).",
  );
  finish();
}
pass(`Reached ${host}`, `auth health HTTP ${health.status}`);

// --- 5. Schema and seed ------------------------------------------------------

const probes = [
  ["car_catalog view (migration 0001)", "/rest/v1/car_catalog?select=variant_id&limit=1"],
  [
    "engine_position column (migration 0006)",
    "/rest/v1/car_models?select=engine_position&limit=1",
  ],
  [
    "catalogue price columns (migration 0008)",
    "/rest/v1/car_catalog?select=listed_price,status&limit=1",
  ],
  ["markets tables (migration 0008)", "/rest/v1/market_cities?select=id&limit=1"],
  [
    "search function (migration 0008)",
    "/rest/v1/rpc/search_catalogue",
    { method: "POST", body: JSON.stringify({ q: "a", per_kind: 1 }) },
  ],
];

const MIGRATE =
  "Run `npm run db:push` and then `npm run db:seed` (README section 5), or paste the migration files in order and then supabase/seed.sql into the Supabase SQL Editor.";

let catalogueRows = null;
let cityRows = null;
for (const [label, path, init] of probes) {
  const result = await request(path, init);
  if (result.status === 200) {
    pass(label);
    if (path.startsWith("/rest/v1/car_catalog?select=variant_id"))
      catalogueRows = result.json?.length ?? 0;
    if (path.startsWith("/rest/v1/market_cities")) cityRows = result.json?.length ?? 0;
    continue;
  }
  const message = result.json?.message ?? result.text.slice(0, 120);
  if (result.status === 401) {
    fail(
      "The API key was rejected by the database API",
      message,
      "Copy the publishable key again from Project Settings → API Keys.",
    );
    finish();
  }
  fail(`Missing: ${label}`, `HTTP ${result.status} ${message}`, MIGRATE);
  finish();
}

if (catalogueRows === 0 || cityRows === 0) {
  fail(
    "The database has no catalogue data",
    catalogueRows === 0 ? "car_catalog is empty" : "market_cities is empty",
    "Run `npm run db:seed` (safe to re-run), or paste supabase/seed.sql into the SQL Editor.",
  );
} else {
  pass("Catalogue seeded", "cars and markets present");
}

// --- 6. Tooling connection (optional) ---------------------------------------

if (!dbUrl) {
  note(
    "SUPABASE_DB_URL is not set",
    "only needed for `npm run db:push`, `db:seed` and `db:verify`",
  );
} else if (/YOUR_DB_PASSWORD|your-project-ref/.test(dbUrl)) {
  note(
    "SUPABASE_DB_URL still holds the example value",
    "`npm run db:push` and `db:seed` will fail until it is filled in",
  );
} else {
  pass("SUPABASE_DB_URL set", "for the db:* scripts");
}

finish();
