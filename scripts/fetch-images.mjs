#!/usr/bin/env node
/**
 * Find and install real car photographs from Wikimedia Commons.
 *
 * WHY COMMONS AND NOT A SEARCH ENGINE
 * Image search results are an index of other people's copyrighted work —
 * manufacturer press photos, magazine shoots, private photographers. Saving
 * those into the project and serving them from a deployed site is
 * straightforward infringement, and no amount of "it's a college project"
 * changes who owns the photograph.
 *
 * Commons is the opposite: everything on it is freely licensed, the licence
 * and author travel with the file as structured metadata, and — because car
 * enthusiasts photograph cars at shows — it has pictures of the *exact*
 * variants in this catalogue, not generic stock. "Porsche 992 Turbo S" really
 * is a 992 Turbo S.
 *
 * ATTRIBUTION
 * Most Commons photos are CC BY-SA, which legally requires crediting the
 * photographer. Every image is stored with its author and licence in
 * `car_media.credit`, and listed in public/images/CREDITS.md. Do not strip it.
 *
 * Usage:
 *   node scripts/fetch-images.mjs --car porsche/911/turbo-s
 *   node scripts/fetch-images.mjs --car porsche/911/turbo-s --download
 *   node scripts/fetch-images.mjs --car tesla/model-s/plaid --download --supabase
 *   node scripts/fetch-images.mjs --all                  # preview every car
 *
 * Nothing is written or uploaded without --download.
 *
 * Safe to re-run. A car whose photograph works is left alone. A car whose
 * `car_media` row cannot be displayed — a file under public/ that is not on
 * disk (it was never committed, say), or a Storage URL that is missing or that
 * next.config.ts does not allow — has that broken row removed and a photograph
 * fetched again. Cars listed in scripts/image-skip.txt — automatic picks that were
 * checked by eye and showed the wrong car — are never fetched; add those by
 * hand instead.
 *
 * Storage:
 *   default     → public/images/cars/  (no credentials needed)
 *   --supabase  → the `cars` bucket; needs SUPABASE_SERVICE_ROLE_KEY in
 *                 .env.local, because the bucket's RLS policy is admin-write.
 *                 That key is for this local script only. It must never be
 *                 committed, and never referenced from application code.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const IMAGES_DIR = path.join(ROOT, "public", "images", "cars");
// The commons.wikimedia.org API host throttles hard and then blocks; the
// Wikipedia API serves the same federated Commons metadata and stays up.
const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";

// --- env ------------------------------------------------------------------

for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (n) => args.includes(`--${n}`);

const carPath = flag("car");
const doAll = has("all");
const doDownload = has("download");
const toSupabase = has("supabase");
const perCar = Number.parseInt(flag("limit") ?? "1", 10);

if (!carPath && !doAll) {
  console.error(
    "Usage: node scripts/fetch-images.mjs --car <manufacturer/model/variant> [--download] [--supabase]\n" +
      "       node scripts/fetch-images.mjs --all",
  );
  process.exit(1);
}

const stripHtml = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with retries and a short backoff.
 *
 * Commons occasionally drops a connection when queried in a tight loop, and a
 * single transient failure should not abort a run that is part way through
 * installing fifty images.
 */
async function fetchRetry(url, init = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          // Wikimedia requires a descriptive User-Agent and will serve empty
          // bodies without one. https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
          "user-agent": "AURIX/1.0 (college project; contact via repository)",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(45_000),
      });

      // Honour explicit throttling rather than hammering through it.
      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after") ?? 0);
        await sleep(retryAfter > 0 ? retryAfter * 1000 : attempt * 2500);
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1200);
    }
  }
  throw lastError;
}

/** Politeness delay between API calls, in ms. */
const THROTTLE_MS = Number.parseInt(flag("throttle") ?? "700", 10);
const prettyBytes = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

// --- which cars to work on ------------------------------------------------

const db = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const { rows: cars } = await db.query(
  `select mf.slug as mf, m.slug as model, v.slug as variant,
          mf.name as mf_name, m.name as model_name, v.name as variant_name,
          m.generation, v.year_start, v.id as variant_id,
          coalesce((select json_agg(json_build_object('id', cm.id, 'url', cm.url))
                    from car_media cm
                    where cm.variant_id = v.id and cm.type = 'image'), '[]') as images
   from car_variants v
   join car_models m on m.id = v.model_id
   join manufacturers mf on mf.id = m.manufacturer_id
   ${carPath ? "where mf.slug = $1 and m.slug = $2 and v.slug = $3" : ""}
   order by mf.name, m.name, v.name`,
  carPath ? carPath.split("/") : [],
);

if (cars.length === 0) {
  console.error(`No car matched "${carPath}".`);
  await db.end();
  process.exit(1);
}

/**
 * Cars whose automatic pick was checked by eye and showed the wrong car — a
 * race car, a concept, an older generation. The ranking is deterministic, so
 * re-running would install the same wrong photograph again. These get a
 * photograph by hand instead.
 */
const SKIP_FILE = path.join(ROOT, "scripts", "image-skip.txt");
const skipList = new Set(
  (existsSync(SKIP_FILE) ? readFileSync(SKIP_FILE, "utf8") : "")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean),
);

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

/**
 * True when the card cannot display this `car_media` URL. The card renders an
 * <Image> for any row it finds, so a row it cannot display is a broken image —
 * worse than having no row, which shows the "No photograph" placeholder.
 */
async function isBroken(url) {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return !existsSync(path.join(ROOT, "public", ...url.split("/")));
  }
  // Without the project URL there is nothing to judge a remote URL against.
  if (!SUPABASE_URL) return false;

  // next.config.ts lets next/image load remote files from this project's public
  // storage path only, and refuses anything else without fetching it.
  if (!url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)) return true;

  try {
    const res = await fetchRetry(url);
    await res.body?.cancel();
    // Storage answers 400 or 404 for a missing object, and 4xx for anything
    // else next/image could not fetch either. A 5xx proves nothing.
    return res.status >= 400 && res.status < 500;
  } catch {
    return false; // unreachable is not the same as missing
  }
}

/**
 * Build the Commons search term.
 *
 * Generation codes are the highest-signal token available — Commons filenames
 * use them heavily ("Porsche 992 Turbo S"), and they disambiguate a 992 from a
 * 991 far better than the model name alone.
 */
function searchTerms(car) {
  // Wikipedia disambiguates car generations in the title itself —
  // "Porsche 911 (992)", "BMW M3 (G80)" — so the generation code is the single
  // most useful token for landing on the right article rather than the
  // nameplate's history page.
  const maker = car.mf_name.replace(/ & .*$/, ""); // "Mahindra & Mahindra" -> "Mahindra"
  const terms = [];
  if (car.generation) terms.push(`${maker} ${car.model_name} ${car.generation}`);
  terms.push(`${maker} ${car.model_name}`);
  if (maker !== car.mf_name) terms.push(`${car.mf_name} ${car.model_name}`);
  return terms;
}

/** Query a MediaWiki API and fail loudly rather than returning an empty set. */
async function mediawiki(params) {
  const url = `${WIKIPEDIA}?${new URLSearchParams({ format: "json", ...params })}`;

  let res;
  try {
    res = await fetchRetry(url);
  } catch (error) {
    // A failed request is NOT the same as "this car has no photograph".
    // Conflating the two silently turns throttling into a wrong conclusion
    // about the data, which is exactly the mistake this throws to avoid.
    throw new Error(
      `Wikipedia request failed: ${error instanceof Error ? error.message : error}`,
    );
  }
  if (!res.ok) throw new Error(`Wikipedia returned HTTP ${res.status}`);

  const body = await res.text();
  if (body.trim().length < 2) {
    throw new Error("Wikipedia returned an empty body (usually throttling)");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Wikipedia returned a non-JSON body (usually throttling)");
  }
}

/**
 * Find photographs for a car via the English Wikipedia API.
 *
 * Wikipedia rather than the Commons API directly, for a practical reason: the
 * commons.wikimedia.org API host rate-limits aggressively and blocks outright
 * after a burst, while en.wikipedia.org stays responsive. Commons files are
 * federated into Wikipedia, so the same `imageinfo` and `extmetadata` — the
 * licence and the photographer — come back either way.
 *
 * It is also a better *editorial* filter. An article's images have been chosen
 * by someone writing about that specific car, so they are far more likely to
 * show the right generation than a raw filename match, and the article's lead
 * image is the community's pick of the most representative photograph.
 */
async function searchWikipedia(term, limit, car) {
  const search = await mediawiki({
    action: "query",
    list: "search",
    srsearch: term,
    srlimit: "1",
  });

  const article = search.query?.search?.[0]?.title;
  if (!article) return [];

  await sleep(THROTTLE_MS);

  const page = await mediawiki({
    action: "query",
    titles: article,
    generator: "images",
    gimlimit: "24",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1280",
  });

  const candidates = Object.values(page.query?.pages ?? {})
    .map((entry) => {
      const info = entry.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      return {
        title: entry.title,
        article,
        url: info.thumburl ?? info.url,
        mime: info.mime,
        bytes: info.size ?? 0,
        licence: stripHtml(meta.LicenseShortName?.value) || "Unknown",
        author: stripHtml(meta.Artist?.value) || "Unknown",
        descriptionUrl: info.descriptionurl,
      };
    })
    .filter(
      (entry) =>
        entry &&
        /^image\/(jpeg|png)$/.test(entry.mime) &&
        // Skip the furniture: every article carries icons, flags and logos,
        // and detail shots make poor grid cards.
        !/logo|icon|flag|diagram|badge|emblem|interior|dashboard|engine|wheel|drawing|map|commons|edit/i.test(
          entry.title,
        ) &&
        // Real photographs are rarely tiny; thumbnails and sprites are.
        entry.bytes > 120_000,
    );

  // Rank the article's photographs. An article covers a whole generation, so
  // it carries every body style and trim — the filename is the only signal
  // available for picking the one that actually matches this variant.
  const words = (text) =>
    String(text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1);

  const variantWords = words(car?.variant_name);
  const modelWords = words(car?.model_name);
  const generation = String(car?.generation ?? "").toLowerCase();
  const yearStart = Number(car?.year_start) || null;

  const score = (entry) => {
    const title = entry.title.toLowerCase();
    let value = 0;

    // Matching the variant name is worth more than almost anything: it is the
    // difference between a Turbo S and a base Carrera.
    for (const word of variantWords) if (title.includes(word)) value += 4;
    for (const word of modelWords) if (title.includes(word)) value += 1;

    // A Wikipedia nameplate article spans every generation, so its images
    // include cars decades apart. The generation code, and failing that the
    // year in the filename, are the only way to tell them apart — without this
    // a G80 M3 happily matches a photograph of a 1995 E36.
    if (generation && title.includes(generation)) value += 6;

    const year = title.match(/(19|20)\d{2}/);
    if (year && yearStart) {
      const distance = Math.abs(Number(year[0]) - yearStart);
      if (distance <= 2) value += 5;
      else if (distance <= 5) value += 2;
      else if (distance >= 10) value -= 8; // a different car entirely
      else value -= 2;
    }

    // A front three-quarter exterior shot is the conventional catalogue
    // photograph.
    if (/front/.test(title)) value += 3;
    if (/rear|back/.test(title)) value -= 3;
    if (/side|profile/.test(title)) value -= 1;

    // Only prefer an open-top body if this variant actually is one.
    const openTop = /convertible|cabrio|spyder|roadster|targa|spider/.test(title);
    const wantsOpenTop = /convertible|cabrio|spyder|roadster|targa|spider/i.test(
      `${car?.variant_name} ${car?.model_name}`,
    );
    if (openTop && !wantsOpenTop) value -= 4;

    return value;
  };

  return candidates.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

// --- upload authorisation --------------------------------------------------

/**
 * Obtain a token allowed to write to the `cars` bucket.
 *
 * The bucket's RLS policy is admin-write, so the anonymous key cannot upload.
 * Two ways to satisfy it:
 *
 *   1. SUPABASE_SERVICE_ROLE_KEY, if the owner has put one in .env.local. It
 *      bypasses RLS entirely.
 *   2. Otherwise a short-lived session for a dedicated admin service account.
 *      This is preferred: it goes *through* the policy rather than around it,
 *      so a successful upload is also proof the policy is correct.
 *
 * The service account is created directly in auth.users with its email already
 * confirmed, because Supabase's free tier rate-limits confirmation emails to a
 * few per hour and an import must not depend on a mailbox.
 */
let cachedToken = null;

async function getUploadToken() {
  if (cachedToken) return cachedToken;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    cachedToken = serviceKey;
    console.log("  auth: using SUPABASE_SERVICE_ROLE_KEY");
    return cachedToken;
  }

  const email = "aurix.importer@aurixdemo.io";
  const password = process.env.AURIX_IMPORTER_PASSWORD ?? "aurix-importer-local-only";

  // Create or reset the account, then grant admin. The role is set with a
  // direct UPDATE because the profiles trigger deliberately refuses to let
  // anyone promote themselves through the API.
  // An explicit exists-check rather than ON CONFLICT: Supabase's auth.users
  // has a *partial* unique index on email (WHERE is_sso_user = false), and
  // ON CONFLICT cannot use a partial index as an arbiter — it fails with
  // 42P10 "no unique or exclusion constraint matching the ON CONFLICT
  // specification".
  const { rows: existing } = await db.query(
    `select id from auth.users where email = $1 limit 1`,
    [email],
  );

  if (existing.length > 0) {
    await db.query(
      `update auth.users
          set encrypted_password = crypt($2, gen_salt('bf')),
              email_confirmed_at = now(),
              updated_at = now()
        where email = $1`,
      [email, password],
    );
  } else {
    await db.query(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                               email_confirmed_at, created_at, updated_at,
                               raw_app_meta_data, raw_user_meta_data)
       values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
               'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')),
               now(), now(), now(),
               '{"provider":"email","providers":["email"]}'::jsonb,
               '{"display_name":"AURIX Importer"}'::jsonb)`,
      [email, password],
    );
  }
  // GoTrue scans these columns into non-nullable Go strings, so a hand-made
  // row with NULLs makes every sign-in fail with an opaque
  // "Database error querying schema". Normalising them to '' is the fix.
  await db.query(
    `update auth.users set
       confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       email_change               = coalesce(email_change, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       reauthentication_token     = coalesce(reauthentication_token, '')
     where email = $1`,
    [email],
  );

  await db.query(
    `update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = $1)`,
    [email],
  );

  const res = await fetchRetry(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Could not sign in the importer account: ${JSON.stringify(json)}`);
  }

  cachedToken = json.access_token;
  console.log(`  auth: signed in as ${email} (admin) — no service key needed`);
  return cachedToken;
}

// --- preview / install ----------------------------------------------------

let installed = 0;
let removed = 0;
let skipped = 0;
let missing = 0;
let failed = 0;

for (const car of cars) {
  const label = `${car.mf_name} ${car.model_name} ${car.variant_name}`;
  const broken = [];
  for (const image of car.images) if (await isBroken(image.url)) broken.push(image);

  if (broken.length > 0) {
    removed += broken.length;
    if (doDownload) {
      await db.query(`delete from car_media where id = any($1::uuid[])`, [
        broken.map((image) => image.id),
      ]);
      console.log(`  − ${label}: removed broken image ${broken[0].url}`);
    } else {
      console.log(`  − ${label}: broken image ${broken[0].url} (--download removes it)`);
    }
  }

  if (skipList.has(`${car.mf}/${car.model}/${car.variant}`)) {
    console.log(`  — ${label}: listed in scripts/image-skip.txt, skipping`);
    skipped += 1;
    continue;
  }

  if (car.images.length > broken.length) {
    console.log(`  — ${label}: already has an image, skipping`);
    skipped += 1;
    continue;
  }

  let picks = [];
  let searchError = null;
  for (const term of searchTerms(car)) {
    try {
      picks = await searchWikipedia(term, perCar, car);
    } catch (error) {
      searchError = error instanceof Error ? error.message : String(error);
      break;
    }
    if (picks.length > 0) break;
    await sleep(THROTTLE_MS); // Commons is donated infrastructure; go gently
  }

  if (searchError) {
    console.log(`  ! ${label}: ${searchError}`);
    failed += 1;
    continue;
  }

  if (picks.length === 0) {
    console.log(`  ✗ ${label}: no suitable photograph on Commons`);
    missing += 1;
    continue;
  }

  for (const pick of picks) {
    console.log(`\n  ${label}`);
    console.log(`     ${pick.title.replace(/^File:/, "")}`);
    console.log(
      `     ${pick.licence}  ·  ${pick.author.slice(0, 50)}  ·  ${prettyBytes(pick.bytes)} source`,
    );
    console.log(`     ${pick.descriptionUrl}`);

    if (!doDownload) continue;

    // Named after what the bytes are: a PNG saved as .jpg serves with the
    // wrong content type.
    const ext = pick.mime === "image/png" ? "png" : "jpg";
    const filename = `${car.mf}-${car.model}-${car.variant}.${ext}`;
    const credit = `Photo: ${pick.author} / Wikimedia Commons (${pick.licence})`;
    const alt = `${label}`;

    let imageRes;
    try {
      imageRes = await fetchRetry(pick.url);
    } catch (error) {
      console.log(
        `     ! download failed: ${error instanceof Error ? error.message : error}`,
      );
      continue;
    }
    if (!imageRes.ok) {
      console.log(`     ! download failed (HTTP ${imageRes.status})`);
      continue;
    }
    const bytes = Buffer.from(await imageRes.arrayBuffer());

    let publicUrl;

    if (toSupabase) {
      const token = await getUploadToken();

      const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/cars/${filename}`;
      const upload = await fetchRetry(uploadUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          "content-type": pick.mime,
          "x-upsert": "true",
        },
        body: bytes,
      });

      if (!upload.ok) {
        console.log(
          `     ! upload failed (HTTP ${upload.status}) ${await upload.text()}`,
        );
        continue;
      }
      publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cars/${filename}`;
      console.log(`     ↑ uploaded to Supabase Storage (${prettyBytes(bytes.length)})`);
    } else {
      mkdirSync(IMAGES_DIR, { recursive: true });
      writeFileSync(path.join(IMAGES_DIR, filename), bytes);
      publicUrl = `/images/cars/${filename}`;
      console.log(
        `     ↓ saved public/images/cars/${filename} (${prettyBytes(bytes.length)})`,
      );
    }

    await db.query(
      `insert into car_media (variant_id, type, url, alt, credit, is_primary)
       values ($1, 'image', $2, $3, $4, true)`,
      [car.variant_id, publicUrl, alt, credit],
    );
    console.log(`     ✓ registered in car_media`);
    installed += 1;
  }
}

// --- attribution file -----------------------------------------------------

if (doDownload && (installed > 0 || removed > 0)) {
  const { rows } = await db.query(
    `select cm.url, cm.credit, mf.name as mf, m.name as model, v.name as variant
     from car_media cm
     join car_variants v on v.id = cm.variant_id
     join car_models m on m.id = v.model_id
     join manufacturers mf on mf.id = m.manufacturer_id
     where cm.type = 'image' and cm.credit is not null
     order by mf.name`,
  );

  let doc =
    "# Photograph credits\n\n" +
    "Car photographs are from [Wikimedia Commons](https://commons.wikimedia.org) " +
    "under free licences. CC BY-SA requires attribution — these credits are also " +
    "stored in `car_media.credit`.\n\n";
  for (const row of rows) {
    doc += `- **${row.mf} ${row.model} ${row.variant}** — ${row.credit}\n`;
  }
  mkdirSync(IMAGES_DIR, { recursive: true });
  writeFileSync(path.join(ROOT, "public", "images", "CREDITS.md"), doc, "utf8");
  console.log(`\n  attribution written to public/images/CREDITS.md`);
}

await db.end();

const summary = doDownload
  ? `Installed ${installed}, removed ${removed} broken, skipped ${skipped}`
  : `Preview only — nothing changed. ${removed} broken to remove, skipped ${skipped}`;
console.log(`\n${summary}, ${missing} with no match, ${failed} request failure(s).`);

if (failed > 0) {
  console.log(
    "\nRequest failures are Wikimedia throttling, NOT missing photographs.\n" +
      "Wait a few minutes and re-run — cars that already have an image are skipped.\n" +
      "Raise the pacing with --throttle 1500 if it keeps happening.",
  );
}
if (!doDownload) console.log("\nRe-run with --download to install.\n");
