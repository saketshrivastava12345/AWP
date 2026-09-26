#!/usr/bin/env node
/**
 * Find and install free 3D car models from Poly Pizza.
 *
 * WHAT THIS IS AND IS NOT
 * There is no API that serves licensed, manufacturer-accurate, pre-segmented
 * car models — that is exactly why this project builds a procedural car. What
 * Poly Pizza does provide is thousands of low-poly CC-BY / CC0 vehicles, which
 * are a real improvement on a box for the "just looking at it" view.
 *
 * So a fetched model is a LIKENESS, not the specific variant. A "Range Rover"
 * here is a generic SUV, not the exact trim on the page it is attached to.
 * Treat it as illustration and say so in the alt text.
 *
 * LICENCE
 * Everything here is CC-BY 3.0 or CC0. CC-BY requires attribution **by law**,
 * so every model is recorded with its creator in `car_media.credit`, which the
 * viewer renders on screen. Do not strip it.
 *
 * Usage:
 *   node scripts/fetch-models.mjs --search "sports car"        # preview only
 *   node scripts/fetch-models.mjs --search "suv" --download    # actually fetch
 *   node scripts/fetch-models.mjs --search "sedan" --download \
 *        --attach porsche/911/turbo-s                          # + register it
 *
 * Nothing is written to disk or the database without --download.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODELS_DIR = path.join(ROOT, "public", "models");

// Poly Pizza's public search endpoint. The keyed v1 API at api.poly.pizza
// offers the same data with a stable contract; this one needs no signup.
const SEARCH_URL = "https://poly.pizza/api/search/";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const has = (name) => args.includes(`--${name}`);

const term = flag("search");
const attach = flag("attach");
const limit = Number.parseInt(flag("limit") ?? "8", 10);
const doDownload = has("download");

if (!term) {
  console.error(
    "Usage: node scripts/fetch-models.mjs --search <term> [--download] [--attach manufacturer/model/variant]",
  );
  process.exit(1);
}

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

/**
 * Poly Pizza serves the GLB from the same object key as the preview image, so
 * the download URL is the preview URL with its extension swapped. Verified
 * against the model page, which links exactly this file.
 */
const glbUrlFromPreview = (previewUrl) =>
  previewUrl ? previewUrl.replace(/\.(webp|jpg|jpeg|png)$/i, ".glb") : null;

const prettyBytes = (n) =>
  n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

// --- search ---------------------------------------------------------------

const response = await fetch(SEARCH_URL + encodeURIComponent(term), {
  headers: { accept: "application/json" },
});

if (!response.ok) {
  console.error(`Search failed: HTTP ${response.status}`);
  process.exit(1);
}

const payload = await response.json();
const results = (payload.results ?? []).slice(0, limit);

if (results.length === 0) {
  console.error(`No models found for "${term}".`);
  process.exit(1);
}

console.log(`\nFound ${results.length} model(s) for "${term}":\n`);

const candidates = [];
for (const [index, model] of results.entries()) {
  const glb = glbUrlFromPreview(model.previewUrl);
  if (!glb) continue;

  // HEAD first so the size is known before anything is written.
  let size = 0;
  try {
    const head = await fetch(glb, { method: "HEAD" });
    size = Number(head.headers.get("content-length") ?? 0);
    if (!head.ok) continue;
  } catch {
    continue;
  }

  const creator = model.creator?.username ?? "Unknown";
  const licence = model.licence ?? "Unknown";
  const filename = `${slugify(model.title)}-${model.publicID}.glb`;

  candidates.push({ ...model, glb, size, creator, licence, filename });

  console.log(
    `  [${index + 1}] ${model.title}\n` +
      `      ${prettyBytes(size).padStart(8)}  ${licence.padEnd(12)} by ${creator}\n` +
      `      file: public/models/${filename}\n` +
      `      src:  ${glb}\n`,
  );
}

if (!doDownload) {
  console.log("Preview only — nothing downloaded.");
  console.log("Re-run with --download to fetch these files into public/models/.\n");
  process.exit(0);
}

// --- download -------------------------------------------------------------

mkdirSync(MODELS_DIR, { recursive: true });

const installed = [];
for (const model of candidates) {
  const target = path.join(MODELS_DIR, model.filename);
  if (existsSync(target)) {
    console.log(`  skip (exists): ${model.filename}`);
    installed.push(model);
    continue;
  }

  const file = await fetch(model.glb);
  if (!file.ok) {
    console.error(`  failed: ${model.filename} (HTTP ${file.status})`);
    continue;
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  // A GLB always begins with the magic word "glTF". Anything else means the
  // CDN handed back an error page, and writing it would produce a file that
  // fails to load later with a far more confusing message.
  if (bytes.subarray(0, 4).toString("ascii") !== "glTF") {
    console.error(`  rejected: ${model.filename} is not a valid GLB`);
    continue;
  }

  writeFileSync(target, bytes);
  console.log(`  saved: public/models/${model.filename}  (${prettyBytes(bytes.length)})`);
  installed.push(model);
}

// --- attribution ----------------------------------------------------------

const creditsPath = path.join(MODELS_DIR, "CREDITS.md");
const existingCredits = existsSync(creditsPath) ? readFileSync(creditsPath, "utf8") : "";

let credits = existingCredits;
if (!credits) {
  credits =
    "# 3D model credits\n\n" +
    "Models sourced from [Poly Pizza](https://poly.pizza). CC-BY licences " +
    "require attribution — do not remove these entries, and keep the matching " +
    "`credit` values in `car_media`.\n\n";
}

for (const model of installed) {
  const line = `- **${model.title}** — by ${model.creator}, ${model.licence} · https://poly.pizza/m/${model.publicID}\n`;
  if (!credits.includes(model.publicID)) credits += line;
}
writeFileSync(creditsPath, credits, "utf8");
console.log(`\n  attribution written to public/models/CREDITS.md`);

// --- SQL ------------------------------------------------------------------

const first = installed[0];
if (!first) process.exit(0);

console.log("\n--- Register a model in car_media -------------------------------\n");

const target = attach ?? "porsche/911/turbo-s";
const [mfSlug, modelSlug, variantSlug] = target.split("/");

const sql = `insert into public.car_media (variant_id, type, url, alt, credit)
select v.id, 'glb',
       '/models/${first.filename}',
       'Stylised 3D representation of a car, shown for illustration',
       '${first.title} by ${first.creator} (${first.licence}), via Poly Pizza'
from public.car_variants v
join public.car_models m      on m.id  = v.model_id
join public.manufacturers mf  on mf.id = m.manufacturer_id
where mf.slug = '${mfSlug}' and m.slug = '${modelSlug}' and v.slug = '${variantSlug}';`;

console.log(sql);
console.log(
  "\nRun it with:\n" +
    `  node scripts/run-sql.mjs --query "${sql.replace(/\n\s*/g, " ").replace(/"/g, '\\"')}"\n`,
);
console.log(
  "Note: the alt text says 'representation' on purpose. These models are\n" +
    "likenesses, not the specific variant — claiming otherwise would be the\n" +
    "same sort of invention the data-honesty rule forbids.\n",
);
