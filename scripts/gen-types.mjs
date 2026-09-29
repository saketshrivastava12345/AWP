#!/usr/bin/env node
/**
 * Generate `src/types/database.ts` by introspecting the hosted Postgres schema.
 *
 * WHY THIS EXISTS
 * The Supabase CLI offers two ways to generate types, and neither fits this
 * project's constraints:
 *   - `supabase gen types --db-url ...` and `--local` shell out to a Docker
 *     image, and this project deliberately does not use Docker.
 *   - `supabase gen types --project-id ...` works without Docker but requires
 *     `supabase login` and a personal access token.
 * This script needs only SUPABASE_DB_URL, which we already have.
 *
 * The emitted shape matches what `@supabase/supabase-js` expects: a `Database`
 * type with Tables / Views / Functions / Enums, each table carrying Row,
 * Insert, Update and Relationships.
 *
 * Usage: node scripts/gen-types.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

// --- env ------------------------------------------------------------------

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].trim();
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

// --- postgres type -> typescript type -------------------------------------

const SCALARS = new Map([
  ["text", "string"],
  ["varchar", "string"],
  ["bpchar", "string"],
  ["char", "string"],
  ["name", "string"],
  ["uuid", "string"],
  ["citext", "string"],
  ["inet", "string"],
  ["cidr", "string"],
  ["macaddr", "string"],
  ["bytea", "string"],
  ["xml", "string"],
  ["int2", "number"],
  ["int4", "number"],
  ["int8", "number"],
  ["numeric", "number"],
  ["float4", "number"],
  ["float8", "number"],
  ["money", "number"],
  ["oid", "number"],
  ["bool", "boolean"],
  ["json", "Json"],
  ["jsonb", "Json"],
  ["date", "string"],
  ["time", "string"],
  ["timetz", "string"],
  ["timestamp", "string"],
  ["timestamptz", "string"],
  ["interval", "string"],
]);

/** Resolve a column's TypeScript type, following domains and array element types. */
function tsType(col, enums) {
  if (col.is_array) {
    const inner = tsType({ ...col, is_array: false, udt_name: col.element_type }, enums);
    return `${inner}[]`;
  }
  if (enums.has(col.udt_name)) return `Database["public"]["Enums"]["${col.udt_name}"]`;
  return SCALARS.get(col.udt_name) ?? "unknown";
}

const quoteKey = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k));

/**
 * Normalise a Postgres array column into a JS array.
 *
 * `array_agg(attname)` returns `name[]` (OID 1003), for which node-postgres
 * has no built-in parser — so it arrives as the raw literal `{user_id}`
 * instead of `["user_id"]`. Emitting that string into `Relationships.columns`
 * silently breaks supabase-js's type inference: `.insert()` on the affected
 * table resolves to `never`.
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((entry) => entry.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

// --- introspection queries ------------------------------------------------

const ENUM_SQL = `
  select t.typname as name, e.enumlabel as label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder`;

// Domains are resolved to their base type; array columns expose their element
// type, so both collapse to something the scalar map understands.
const COLUMN_SQL = `
  select
    c.relname                                   as table_name,
    c.relkind                                   as kind,
    a.attname                                   as column_name,
    a.attnum                                    as ordinal,
    not a.attnotnull                            as is_nullable,
    pg_get_expr(d.adbin, d.adrelid) is not null as has_default,
    a.attidentity <> ''                         as is_identity,
    a.attgenerated <> ''                        as is_generated,
    base.typname                                as udt_name,
    base.typcategory = 'A'                      as is_array,
    elem.typname                                as element_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  join pg_type t on t.oid = a.atttypid
  -- follow one level of domain indirection (public.slug -> text)
  join lateral (
    select coalesce(bt.typname, t.typname) as typname,
           coalesce(bt.typcategory, t.typcategory) as typcategory,
           coalesce(bt.typelem, t.typelem) as typelem
    from (select 1) _
    left join pg_type bt on bt.oid = nullif(t.typbasetype, 0)
  ) base on true
  left join pg_type elem on elem.oid = nullif(base.typelem, 0)
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind in ('r', 'v')
  order by c.relname, a.attnum`;

const FK_SQL = `
  select
    con.conname as name,
    c.relname   as table_name,
    fc.relname  as foreign_table,
    (select array_agg(att.attname order by k.ord)
       from unnest(con.conkey) with ordinality k(attnum, ord)
       join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum) as columns,
    (select array_agg(att.attname order by k.ord)
       from unnest(con.confkey) with ordinality k(attnum, ord)
       join pg_attribute att on att.attrelid = con.confrelid and att.attnum = k.attnum) as foreign_columns,
    -- A foreign key is one-to-one when its own columns are also unique on the
    -- referencing table. Every spec satellite here (performance_specs,
    -- dimensions, fuel_specs, ev_specs) has variant_id as both PK and FK, so
    -- embedding one from car_variants yields a single row, not an array.
    exists (
      select 1 from pg_constraint u
      where u.conrelid = con.conrelid
        and u.contype in ('p', 'u')
        and u.conkey @> con.conkey and con.conkey @> u.conkey
    ) as is_one_to_one
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_class fc on fc.oid = con.confrelid
  join pg_namespace n on n.oid = c.relnamespace
  where con.contype = 'f' and n.nspname = 'public'
  order by c.relname, con.conname`;

// Only RPC-callable functions. Trigger functions return `trigger` and are of no
// use to the client, so they are excluded.
const FUNCTION_SQL = `
  select p.proname as name,
         pg_get_function_identity_arguments(p.oid) as args,
         rt.typname as return_udt,
         p.proretset as returns_set
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where n.nspname = 'public'
    and p.prokind = 'f'
    and rt.typname not in ('trigger', 'event_trigger')
  order by p.proname`;

// --- generate -------------------------------------------------------------

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const [enumRows, colRows, fkRows, fnRows] = await Promise.all([
  client.query(ENUM_SQL),
  client.query(COLUMN_SQL),
  client.query(FK_SQL),
  client.query(FUNCTION_SQL),
]);
await client.end();

const enums = new Map();
for (const r of enumRows.rows) {
  if (!enums.has(r.name)) enums.set(r.name, []);
  enums.get(r.name).push(r.label);
}

const relations = new Map();
for (const r of fkRows.rows) {
  if (!relations.has(r.table_name)) relations.set(r.table_name, []);
  relations.get(r.table_name).push(r);
}

const tables = new Map();
const views = new Map();
for (const c of colRows.rows) {
  const bucket = c.kind === "r" ? tables : views;
  if (!bucket.has(c.table_name)) bucket.set(c.table_name, []);
  bucket.get(c.table_name).push(c);
}

const out = [];
out.push("// AUTO-GENERATED — DO NOT EDIT BY HAND.");
out.push("// Regenerate with: npm run db:types");
out.push("//");
out.push("// Produced by scripts/gen-types.mjs, which introspects the hosted Postgres");
out.push("// schema directly. The Supabase CLI's own generator needs either Docker or a");
out.push("// personal access token; this project uses neither.");
out.push("");
out.push("export type Json =");
out.push("  | string");
out.push("  | number");
out.push("  | boolean");
out.push("  | null");
out.push("  | { [key: string]: Json | undefined }");
out.push("  | Json[];");
out.push("");
out.push("export type Database = {");
out.push("  public: {");

// ---- Tables
out.push("    Tables: {");
for (const [name, cols] of [...tables].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`      ${quoteKey(name)}: {`);

  out.push("        Row: {");
  for (const c of cols) {
    out.push(
      `          ${quoteKey(c.column_name)}: ${tsType(c, enums)}${c.is_nullable ? " | null" : ""};`,
    );
  }
  out.push("        };");

  out.push("        Insert: {");
  for (const c of cols) {
    if (c.is_generated) continue; // GENERATED ALWAYS columns cannot be written
    const optional = c.is_nullable || c.has_default || c.is_identity;
    out.push(
      `          ${quoteKey(c.column_name)}${optional ? "?" : ""}: ${tsType(c, enums)}${c.is_nullable ? " | null" : ""};`,
    );
  }
  out.push("        };");

  out.push("        Update: {");
  for (const c of cols) {
    if (c.is_generated) continue;
    out.push(
      `          ${quoteKey(c.column_name)}?: ${tsType(c, enums)}${c.is_nullable ? " | null" : ""};`,
    );
  }
  out.push("        };");

  const rels = relations.get(name) ?? [];
  if (rels.length === 0) {
    out.push("        Relationships: [];");
  } else {
    out.push("        Relationships: [");
    for (const r of rels) {
      out.push("          {");
      out.push(`            foreignKeyName: ${JSON.stringify(r.name)};`);
      out.push(`            columns: ${JSON.stringify(toArray(r.columns))};`);
      out.push(`            isOneToOne: ${r.is_one_to_one ? "true" : "false"};`);
      out.push(`            referencedRelation: ${JSON.stringify(r.foreign_table)};`);
      out.push(
        `            referencedColumns: ${JSON.stringify(toArray(r.foreign_columns))};`,
      );
      out.push("          },");
    }
    out.push("        ];");
  }
  out.push("      };");
}
out.push("    };");

// ---- Views
out.push("    Views: {");
for (const [name, cols] of [...views].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`      ${quoteKey(name)}: {`);
  out.push("        Row: {");
  for (const c of cols) {
    // Every column of a view is nullable as far as the type system is
    // concerned: an outer join can produce NULL in a column the base table
    // declares NOT NULL. Being strict here is the point of the project.
    out.push(`          ${quoteKey(c.column_name)}: ${tsType(c, enums)} | null;`);
  }
  out.push("        };");
  out.push("        Relationships: [];");
  out.push("      };");
}
out.push("    };");

// ---- Functions
out.push("    Functions: {");
for (const f of fnRows.rows) {
  const returns =
    SCALARS.get(f.return_udt) ??
    (enums.has(f.return_udt)
      ? `Database["public"]["Enums"]["${f.return_udt}"]`
      : "unknown");
  out.push(`      ${quoteKey(f.name)}: {`);
  out.push(
    f.args
      ? `        Args: { [key: string]: unknown };`
      : "        Args: Record<PropertyKey, never>;",
  );
  out.push(`        Returns: ${returns}${f.returns_set ? "[]" : ""};`);
  out.push("      };");
}
out.push("    };");

// ---- Enums
out.push("    Enums: {");
for (const [name, labels] of [...enums].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(
    `      ${quoteKey(name)}: ${labels.map((l) => JSON.stringify(l)).join(" | ")};`,
  );
}
out.push("    };");

out.push("    CompositeTypes: Record<PropertyKey, never>;");
out.push("  };");
out.push("};");
out.push("");

// ---- Convenience helpers (mirrors what the Supabase CLI emits)
out.push('type PublicSchema = Database["public"];');
out.push("");
out.push(
  'export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =',
);
out.push(
  '  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never;',
);
out.push("");
out.push('export type TablesInsert<T extends keyof PublicSchema["Tables"]> =');
out.push('  PublicSchema["Tables"][T] extends { Insert: infer I } ? I : never;');
out.push("");
out.push('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =');
out.push('  PublicSchema["Tables"][T] extends { Update: infer U } ? U : never;');
out.push("");
out.push(
  'export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];',
);
out.push("");

const target = new URL("../src/types/database.ts", import.meta.url);
writeFileSync(target, out.join("\n"), "utf8");

console.log(
  `Wrote src/types/database.ts — ${tables.size} tables, ${views.size} views, ` +
    `${enums.size} enums, ${fnRows.rows.length} functions.`,
);
