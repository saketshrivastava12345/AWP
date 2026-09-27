# AURIX — Global Automotive Intelligence

A premium 3D automotive encyclopedia. Browse the world's cars from country down
to individual component, inspect each one in an interactive 3D viewer, check
sourced market prices down to city level, and compare up to four cars side by
side.

Built as a mini project for **B.Tech Computer Science and Engineering, Pimpri
Chinchwad University.**

**Content hierarchy:** Country → Manufacturer → Model → Generation → Variant →
Specifications → Parts

**The one rule the whole project is built around:** nothing is invented. A
specification, price, colour or photograph that has no source is stored as
`NULL` and shown as "Not available". Every price carries its type, market,
source and verification date. The 3D car says whether it is the exact vehicle
or a representation.

---

## Contents

1. [Features](#1-features)
2. [Install and run](#2-install-and-run)
3. [Environment variables](#3-environment-variables)
4. [Creating the Supabase project](#4-creating-the-supabase-project)
5. [Applying migrations and seed](#5-applying-migrations-and-seed)
6. [Making your account an admin](#6-making-your-account-an-admin)
7. [Managing content in the admin panel](#7-managing-content-in-the-admin-panel)
8. [How pricing works](#8-how-pricing-works)
9. [Photographs and 3D models](#9-photographs-and-3d-models)
10. [Adding catalogue data with SQL](#10-adding-catalogue-data-with-sql)
11. [Deploying to Vercel](#11-deploying-to-vercel)
12. [Testing and quality checks](#12-testing-and-quality-checks)
13. [Known limitations](#13-known-limitations)
14. [Screenshot checklist for the report](#14-screenshot-checklist-for-the-report)

---

## 1. Features

| Area                  | What it does                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3D viewer**         | Loads a GLB/glTF model (Draco and KTX2 decoders self-hosted) or falls back to a parametric car built from the variant's published dimensions. Camera presets, lighting presets, exploded view, X-ray/engineering mode, hotspots, dimension overlay, paint configurator from sourced colours only. |
| **Car pages**         | A long-scroll page per variant: key figures and price above the fold, a scroll-driven anatomy tour, specifications grouped by powertrain, Car DNA percentiles, powertrain diagram, gallery, pricing, parts, related cars and a data-provenance section.                                           |
| **Market pricing**    | Country → state → city selection with a full on-road breakdown (ex-showroom, RTO, registration, insurance, handling, FASTag). Every price shows its type, source, source link and verification date. Nothing is converted between currencies.                                                     |
| **Catalogue**         | Filters and sorts that live in the URL (shareable, back/forward works, usable without JavaScript), plain-English search ("german supercars under 700 hp"), cards with quick stats. No WebGL on listing pages.                                                                                     |
| **Compare**           | Two to four cars, grouped rows, visual bars, best-in-row only when at least two cars publish the figure, "differences only", shareable URL.                                                                                                                                                       |
| **Search**            | ⌘K / Ctrl K command palette with fuzzy matching across cars, manufacturers, countries and parts.                                                                                                                                                                                                  |
| **Accounts**          | Email + password sign-in, favourites (kept locally for guests and merged on sign-in), recently viewed.                                                                                                                                                                                            |
| **Admin**             | A real CMS: vehicles and specifications with provenance, publish/unpublish, prices (with CSV import), market geography, photographs and 3D models (validated uploads), colours, availability, and a data-quality dashboard.                                                                       |
| **Brands and places** | Manufacturer, country (world map) and parts-encyclopedia pages.                                                                                                                                                                                                                                   |

---

## 2. Install and run

**Requirements:** Node.js **22.12 or newer** (`.nvmrc` pins 22) and npm. No
Docker, and no local database — the app talks to a hosted Supabase project.

```bash
git clone <your-repo-url> aurix
cd aurix
npm install

cp .env.example .env.local      # then fill it in — see sections 3 and 4
npm run dev                     # http://localhost:3000
```

The app also starts **without** a Supabase project: every page renders its
empty state instead of crashing. That is useful for checking the UI, but you
need the database for any real content.

### All commands

| Command                           | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                     | Development server (Turbopack)                                          |
| `npm run build`                   | Production build                                                        |
| `npm run start`                   | Serve the production build                                              |
| `npm run lint` / `lint:fix`       | ESLint                                                                  |
| `npm run typecheck`               | Generates Next's route types (`next typegen`), then `tsc --noEmit`      |
| `npm run test` / `test:watch`     | Vitest unit tests                                                       |
| `npm run format` / `format:check` | Prettier                                                                |
| `npm run verify`                  | lint → typecheck → test → build (what CI runs, plus `format:check`)     |
| `npm run db:push`                 | Apply `supabase/migrations/` to the hosted database                     |
| `npm run db:seed`                 | Apply `supabase/seed.sql` (idempotent — safe to re-run)                 |
| `npm run db:verify`               | Row counts for every table plus checks of the views and search function |
| `npm run db:types`                | Regenerate `src/types/database.ts` from the hosted schema               |

> **Windows note.** `.gitattributes` forces LF line endings, so `format:check`
> passes regardless of `core.autocrlf`. The first `npm run build` needs
> internet access because `next/font` downloads the three typefaces.

---

## 3. Environment variables

| Name                            | Where it is used                 | Required | Notes                                                                                 |
| ------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser and server               | Yes      | Project URL                                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server               | Yes      | Publishable (anon) key. Safe to expose: every table has Row Level Security            |
| `NEXT_PUBLIC_SITE_URL`          | Server (metadata, sitemap, OG)   | Yes      | `http://localhost:3000` locally, your domain in production                            |
| `SUPABASE_DB_URL`               | Local `db:*` and `scripts/` only | Tooling  | Direct Postgres connection string. **Never** add it to Vercel or any client-side code |

**There is no service-role key anywhere in this project, and one must never be
added.** Admin writes go through server actions that use the signed-in user's
own session; the database's RLS policies and `is_admin()` decide what that user
may do, and the server re-checks the admin role before every write as well.

`.env.local` is git-ignored. `.env.example` is committed.

---

## 4. Creating the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (the free tier is
   enough).
2. **Project Settings → Data API** → copy the **Project URL**.
3. **Project Settings → API Keys** → copy the **Publishable key** (it begins
   `sb_publishable_…`).
4. **Project Settings → Database** → copy the **Connection string** (URI) and
   substitute your database password.

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-side only — used by the db:* scripts, never sent to the browser
SUPABASE_DB_URL=postgresql://postgres.your-ref:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
```

> ⚠️ **Copy the publishable key in one piece.** If it wraps across lines when
> pasted, the last few characters are easily lost and the API returns
> `401 Invalid API key` with no other clue.

**Authentication settings** (Supabase dashboard → Authentication):

- **URL Configuration → Site URL**: the same value as `NEXT_PUBLIC_SITE_URL`.
- **URL Configuration → Redirect URLs**: add `<your site>/auth/confirm`.
- **Email Templates** (recommended): point the _Confirm signup_ and _Reset
  password_ links at
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/`
  and
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/password`.
  The default links also work, but only when opened in the same browser that
  requested them.

---

## 5. Applying migrations and seed

Apply the migrations **in order**, then the seed:

| File                               | Contents                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_schema.sql`                  | Core catalogue: 20 tables, enums, the `car_catalog` view, triggers, full-text search                                                                                        |
| `0002_rls.sql`                     | Row Level Security policies and grants                                                                                                                                      |
| `0003_storage.sql`                 | Five storage buckets and their policies                                                                                                                                     |
| `0004_fix_role_administration.sql` | Lets a database administrator set `profiles.role`                                                                                                                           |
| `0005_role_guard_use_jwt.sql`      | Detects API callers by JWT so a user can never promote themselves                                                                                                           |
| `0006_engine_position.sql`         | Where the engine sits (front / mid / rear), used by the 3D layout                                                                                                           |
| `0007_viewer_group_exhaust.sql`    | Adds the exhaust as a 3D subsystem (must be committed before 0008 and the seed use it)                                                                                      |
| `0008_markets_pricing_media.sql`   | Markets (states, cities), sourced prices with history, availability, generations, vehicle status, colours, media and 3D-model provenance, recently viewed, catalogue search |
| `supabase/seed.sql`                | 10 countries, 22 manufacturers, 46 models, 54 variants, 71 parts, Indian states and cities, the 8 committed photographs                                                     |

All migrations live in `supabase/migrations/`.

### Method A — Supabase CLI over a direct connection (no Docker)

```bash
npm run db:push        # applies every pending migration
npm run db:seed        # applies seed.sql
npm run db:verify      # prints row counts
```

`npm run db:push -- --dry-run` previews without applying. **Upgrading an
existing AURIX database** is the same two commands: `db:push` applies only the
migrations it has not seen, and the seed only inserts what is missing.

### Method B — SQL Editor (no tooling)

Open **SQL Editor → New query**, paste each migration file in the order above
and run it, one file per run. Then run `supabase/seed.sql`, then
`supabase/verify.sql`.

> **Why not `supabase start`?** The CLI's local stack runs Postgres in Docker,
> which this project deliberately avoids. `db dump`, `db reset` and
> `gen types --db-url` also shell out to Docker; only `db push` talks to
> Postgres directly. Type generation therefore uses `scripts/gen-types.mjs`,
> which introspects `pg_catalog` over a normal connection.

### Expected counts on a fresh database

| Table             | Rows |     | Table                  | Rows   |
| ----------------- | ---- | --- | ---------------------- | ------ |
| countries         | 10   |     | parts                  | 71     |
| manufacturers     | 22   |     | part_categories        | 9      |
| categories        | 13   |     | part_relations         | 64     |
| car_models        | 46   |     | variant_parts          | 20     |
| car_generations   | 34   |     | features               | 18     |
| car_variants      | 54   |     | variant_features       | 88     |
| engines           | 30   |     | car_media              | 8      |
| transmissions     | 29   |     | market_regions         | 14     |
| performance_specs | 54   |     | market_cities          | 22     |
| dimensions        | 54   |     | market_prices          | **0**  |
| fuel_specs        | 37   |     | variant_markets        | **0**  |
| ev_specs          | 22   |     | car_colors             | **0**  |
|                   |      |     | **car_catalog (view)** | **54** |

The three zeros are deliberate: no price, availability or paint colour is
seeded, because none has been sourced yet. Add them through the admin panel
with their sources (section 7).

---

## 6. Making your account an admin

Sign up through the app at `/login` first, then run this in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Reload the site: **Admin dashboard** appears in the account menu, linking to
`/admin`.

> You cannot do this from inside the application. A trigger on `profiles`
> keeps the previous role for any change that arrives through the API unless
> the caller is already an admin, so a user cannot promote themselves (see
> migrations 0004 and 0005 for why this took two attempts to get right).

---

## 7. Managing content in the admin panel

Everything below is done at **`/admin`** while signed in as an admin. Every
write is validated on the server, checked against your role, and then
enforced a second time by the database's RLS policies. A change is visible on
the public site on the next request. Visitors who are not admins — signed in
or not — get exactly the same "not found" response, so the panel cannot be
used to discover who is an admin.

| Section      | Path              | What it does                                                                                                                       |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard    | `/admin`          | Counts and data-quality panels (unsourced figures, stale prices, cars without photos …)                                            |
| Vehicles     | `/admin/vehicles` | Search, filter, publish/unpublish, create; each vehicle has core, spec, feature, part, price, media, availability and source pages |
| Models       | `/admin/models`   | Model details, model-level photos and the sourced paint colours                                                                    |
| Prices       | `/admin/prices`   | Current prices and history across vehicles; **Import** for CSV                                                                     |
| Markets      | `/admin/markets`  | Countries' states and cities used by prices                                                                                        |
| Media        | `/admin/media`    | Every photograph and 3D model, with the ones that need provenance flagged                                                          |
| Data sources | `/admin/sources`  | Every recorded figure with its source and verification status                                                                      |

### Adding a vehicle

**Vehicles → New vehicle** (`/admin/vehicles/new`). Pick the manufacturer, then the model (or create
one), then fill in the variant: name, years, fuel type, drive, status, engine
and transmission. Each specification section — performance, dimensions,
engine, transmission, fuel, EV and charging — is edited separately and has
its own **source**, **source URL** and **last verified** fields, with a
**Mark verified today** action. Fields you do not have a published figure for
stay **empty**; they are stored as `NULL` and shown as "Not available". The
database rejects a fuel section on an electric car, an EV section on a
petrol car, and a range figure without its test standard.

New vehicles start as drafts. **Publish** makes them public; unpublished
vehicles are invisible to everyone but admins.

### Adding or updating a price

**Vehicles → (vehicle) → Prices → Add price.** Choose the market — a country, and
optionally a state and a city — then the price type and the amounts. Source,
source URL and verification date are **required**; the form will not save a
price without them. A live preview shows exactly how the public page will
label the price.

To record a price change, use **Add newer price** on the existing row: it
pre-fills a copy with a new effective date, and the old row stays in the
history (which feeds the price-history chart once there are enough points).
**Close** ends a price's validity without replacing it.

**CSV import:** download the template (a header row only), fill one row per
price, upload it. Every row is validated on the server and shown in a preview
with its errors; only valid rows are committed.

### Adding photographs

**Vehicles → (vehicle) → Media → Upload.** JPEG, PNG, WebP or AVIF up to 10 MB. The
server checks the file's real type from its first bytes (not its name or the
browser's claim), reads its pixel size, and stores it in the `cars` bucket.
Source, source URL, licence and author are required, together with alt text
and the shot type (hero, side, interior …). Only use photographs you have the
right to publish — see section 9.

### Adding a 3D model

**Vehicles → (vehicle) → Media → 3D model.** GLB only, up to 50 MB. The server checks
the glTF binary header, detects Draco / KTX2 / meshopt compression from the
file itself, and records size and format. You must answer one question
honestly: **is this the exact vehicle, or a representation?** The viewer
labels the model accordingly. One model per variant; uploading another offers
to replace it.

### Colours, availability and data sources

- **Colours** (per model) feed the paint configurator. Each needs a source;
  the hex value is a rendering approximation and the UI says so. A model with
  no sourced colours shows "Configuration unavailable for this model."
- **Availability** records in which countries a variant is sold, upcoming or
  discontinued, with a source.
- **Data sources** lists every populated figure of a vehicle with its source
  and verification status, and ranks the least-verified vehicles.

The dashboard's data-quality panels (unsourced specifications, stale prices,
vehicles without photographs …) link straight to the rows that need work.

---

## 8. How pricing works

- **Types are never mixed up.** A price is one of: manufacturer list price,
  dealer list price, ex-showroom, on-road, or estimated on-road. When AURIX
  adds up components itself (ex-showroom + road tax + insurance + …), the
  total is labelled **Calculated on-road** — never passed off as a published
  figure — and it is only shown when the components it needs are all present.
- **Scope.** A price applies to a whole country, a state, or a single city.
  Choosing _Mumbai_ shows a Mumbai price if one exists, otherwise a
  Maharashtra price, otherwise a national one — and says which it is showing.
- **Provenance.** Every price shows its source (linked), market and "last
  verified" date. Prices not verified for 180 days are flagged as possibly out
  of date.
- **No conversion.** A car priced in euros is shown in euros. Compare never
  crowns a "cheapest" car across currencies.
- **History.** Superseded prices are kept. The history chart appears only when
  a market has enough data points to draw a line honestly.
- **When there is no price**, the page says "Price data unavailable" and
  nothing else.

Every price block carries the disclaimer: _Prices vary by dealer, insurance
provider, variant, tax rules and registration date._

### Adding a price with SQL

The admin panel is the intended route, but a price can also be inserted
directly. Source, source URL and verification date are enforced by the
database:

```sql
insert into public.market_prices
  (variant_id, country_id, region_id, city_id, price_type,
   ex_showroom_price, rto_tax, registration_fee, insurance_estimate,
   on_road_price, source, source_url, last_verified_at, effective_from)
select v.id, c.id, r.id, ci.id, 'on_road',
       /* amounts exactly as published — leave NULL what is not published */
       null, null, null, null, null,
       'Name of the publisher', 'https://…the page you read it on…',
       date '2026-09-01', date '2026-09-01'
from public.car_variants v
join public.car_models m      on m.id = v.model_id
join public.manufacturers mf  on mf.id = m.manufacturer_id
join public.countries c       on c.slug = 'india'
join public.market_regions r  on r.country_id = c.id and r.slug = 'maharashtra'
join public.market_cities ci  on ci.region_id = r.id and ci.slug = 'mumbai'
where mf.slug = 'tata' and m.slug = 'altroz' and v.slug = '1-2-petrol';
```

The currency defaults to the country's currency, and a trigger rejects a
state that is not in the country or a city that is not in the state.

---

## 9. Photographs and 3D models

### Photographs

Only publish images you have the right to publish. The project takes car
photographs from **Wikimedia Commons**, where every file is freely licensed
and carries its author and licence:

```bash
node scripts/fetch-images.mjs --all                 # preview every pick
node scripts/fetch-images.mjs --all --download      # download into public/images/cars/
```

**Check every automatic pick by eye.** Of the first 18, 10 showed the wrong
car (a NASCAR Supra, a dashboard, a concept, an older generation). Those are
listed in `scripts/image-skip.txt` so a re-run cannot reinstall them; add a
correct photograph for them by hand through the admin panel. Credits are
written to `public/images/CREDITS.md` and stored with each image, and the
gallery shows them next to the photograph.

A car without a photograph shows a body-style silhouette labelled as a
placeholder — never a broken image and never a stand-in photo of another car.

### 3D models

A car with no model uses the **parametric car**: a lofted body built from the
variant's published length, width, height and wheelbase, with an engine,
motors, battery, exhaust and drivetrain laid out from its specification rows.
It is always labelled **3D representation**.

To use a real model:

- GLB (binary glTF 2.0). Any scale and origin — the viewer normalises both
  from the bounding box. Keep it under ~15 MB for mobile; Draco-compressed
  geometry and KTX2 textures are supported, with the decoders served from
  `/draco` and `/basis` in this app (no third-party CDN at runtime).
- A licence that allows publication (CC0 or CC BY, with the credit recorded).
  **Do not use ripped game assets or models from sites whose licence you have
  not read.**
- Declare whether it is the **exact vehicle** or a **representation**.

`scripts/fetch-models.mjs` can find CC-licensed models on Poly Pizza and write
the SQL that registers one as a representation of a chosen variant. Most
free models are generic cars, not specific variants, so they are always
registered as representations.

If a model fails to load, the viewer falls back to the parametric car with a
"3D model unavailable" notice; the page itself never breaks.

---

## 10. Adding catalogue data with SQL

The admin panel covers everything below; SQL remains useful for bulk work.
Everything is addressed by slug, so no UUIDs are typed by hand.

### A country, manufacturer and model

```sql
insert into public.countries (name, slug, iso_code, flag_emoji, currency_code, description, automotive_history)
values ('Spain', 'spain', 'ES', '🇪🇸', 'EUR',
        'Short description shown on the country card.',
        'Longer history shown on the country page.');

insert into public.manufacturers (country_id, name, slug, founded_year, headquarters, segment, website, description)
select c.id, 'SEAT', 'seat', 1950, 'Martorell, Catalonia', 'mass',
       'https://www.seat.com', 'Description of the marque.'
from public.countries c where c.slug = 'spain';

insert into public.car_models (manufacturer_id, category_id, name, slug, generation, body_type,
                               production_start, engine_position, description)
select mf.id, cat.id, 'Leon', 'leon', 'Mk4', 'hatchback', 2020, 'front', 'Description of the model.'
from public.manufacturers mf cross join public.categories cat
where mf.slug = 'seat' and cat.slug = 'hatchback';
```

`segment` is one of `luxury`, `performance`, `mass`, `ev`, `commercial`.
`body_type` is one of `hatchback`, `sedan`, `coupe`, `convertible`, `roadster`,
`suv`, `wagon`, `mpv`, `pickup`, `off_road`. `engine_position` is `front`,
`mid` or `rear`, and `NULL` for battery-electric models.

### A variant and its specifications

```sql
insert into public.car_variants
  (model_id, name, slug, year_start, fuel_type, drive_type, transmission_id,
   status, description, source, source_url, last_verified_at)
select m.id, '1.5 TSI', '1-5-tsi', 2020, 'petrol', 'fwd', t.id,
       'available', 'Description of this specific variant.',
       'Manufacturer published specifications', 'https://…', current_date
from public.car_models m
join public.manufacturers mf on mf.id = m.manufacturer_id
left join public.transmissions t on t.name = '6-speed manual'
where mf.slug = 'seat' and m.slug = 'leon';

-- Leave a column NULL if the figure is not published — never estimate it.
insert into public.performance_specs (variant_id, power_hp, torque_nm, top_speed_kmh, zero_to_100_s,
                                      source, source_url, last_verified_at)
select v.id, 150, 250, 216, 8.4, 'Manufacturer published specifications', 'https://…', current_date
from public.car_variants v
join public.car_models m     on m.id  = v.model_id
join public.manufacturers mf on mf.id = m.manufacturer_id
where mf.slug = 'seat' and m.slug = 'leon' and v.slug = '1-5-tsi';

-- dimensions, and fuel_specs (combustion/hybrid) or ev_specs (EV/PHEV)
-- follow exactly the same pattern.
```

> **Powertrain rules are enforced by the database.** `fuel_specs` cannot be
> attached to a battery-electric variant and `ev_specs` cannot be attached to
> a pure combustion one. An EV must have `engine_id IS NULL`. A `range_km`
> requires its `range_standard` (WLTP, EPA …), because a range without its
> test cycle is not comparable to anything.

### A part

```sql
insert into public.parts
  (category_id, name, slug, viewer_group, description, "function", typical_materials,
   location, common_failure_points, performance_impact)
select pc.id, 'Intercooler', 'intercooler-example', 'engine',
       'What it is.', 'What it does.', 'What it is made of.',
       'Where it sits.', 'How it fails.', 'What it contributes.'
from public.part_categories pc where pc.slug = 'engine';
```

`viewer_group` links a part to a subsystem of the 3D car: `body`, `engine`,
`transmission`, `suspension`, `brakes`, `wheels`, `interior`, `electronics`,
`battery` or `exhaust`. Related parts are stored once per pair:
`insert into part_relations (part_id, related_part_id) select least(a.id, b.id), greatest(a.id, b.id) …`.

After a schema change run `npm run db:types`; after any data change,
`npm run db:verify`.

---

## 11. Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import it. The framework is detected
   automatically; build settings need no changes. Set **Node.js Version** to
   **22.x** in Project Settings.
3. Add these **Environment Variables** (Production, Preview and Development):

   | Name                            | Value                         |
   | ------------------------------- | ----------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Your project URL              |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your publishable key          |
   | `NEXT_PUBLIC_SITE_URL`          | `https://your-app.vercel.app` |

   `SUPABASE_DB_URL` is **not** needed in Vercel and should not be added.

4. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy so
   canonical URLs, OpenGraph tags and the sitemap point at the right host.
5. In Supabase, set **Authentication → URL Configuration → Site URL** to the
   same domain.

Catalogue pages are statically prerendered and revalidate hourly (prices every
ten minutes). Admin edits refresh the affected pages immediately.

---

## 12. Testing and quality checks

<!-- LEAD: fill in final test counts -->

```bash
npm run verify        # lint → typecheck → unit tests → production build
npm run format:check
```

- **Unit tests (Vitest)** cover the pure logic: the search-query parser, the
  pricing engine (scope fallback, on-road breakdown, calculated totals,
  history), market selection, the anatomy tour, compare rows, filters and
  URL parsing, the command palette, the 3D viewer's quality and preset logic,
  and the admin validators (CSV rows, prices, file signatures).
- **CI** (`.github/workflows/ci.yml`) runs lint, format check, typecheck, the
  tests and a production build on every pull request and every push to
  `main`. The build runs **without** Supabase credentials on purpose, which
  proves a fresh clone builds and every page degrades to its empty state.
- **Database invariants** (RLS, the role guard, price scope and provenance
  constraints) were verified with direct probes against a Postgres + PostgREST
  instance; see the decisions log in `CLAUDE.md`.

---

## 13. Known limitations

Stated plainly, because an honest limitations section is more useful than a
polished one.

### Data

- **No prices, availability or paint colours are seeded.** The whole pricing
  system — markets, breakdowns, history, provenance — is built and tested,
  but a price is only shown once someone records one with its source. Until
  then every car says "Price data unavailable", which is the truth.
- **Fuel economy is empty for every car.** `mileage_kmpl` is NULL throughout:
  European and American makers publish l/100 km and mpg, and Indian ARAI
  figures vary by variant and year. Converting or approximating would breach
  the data-honesty rule.
- **Kerb weight is missing for Ferrari, Lamborghini and Koenigsegg**, which
  publish _dry_ weight (recorded in `dimensions.notes`). Those cars show no
  power-to-weight and no Car DNA performance bar.
- **Tesla power and battery capacity are NULL** (Tesla does not publish
  them); the Nissan GT-R has no 0–100 and the Koenigsegg Jesko no top speed.
- **Power mixes two conventions**: metric PS for European makers, SAE hp for
  US and Japanese makers (about 1.4% apart). Each row records which.
- **Only 8 of 54 variants have a photograph** in the repository. The rest show
  a labelled silhouette until a correctly licensed photograph is added
  (section 9).

### 3D

- **No licensed GLB models are bundled.** Every car uses the parametric
  representation, clearly labelled as such. The GLB pipeline (Draco, KTX2,
  normalisation, fallback, exact-vs-representation labelling) is complete and
  ready for real models.
- The exploded view separates subsystems (engine, exhaust, brakes …), not
  every individual part; part-level explosion needs modelled geometry.
- Paint changes apply to the body material of the model in view. The
  configurator only offers colours that have been recorded with a source.

### Application

- The search parser understands a fixed vocabulary (nationalities,
  categories, powertrains, engine layouts, numeric comparisons). Unrecognised
  words fall through to full-text search rather than being ignored.
- Email confirmation follows the Supabase project's settings; on the free
  tier sign-up emails are rate-limited to a few per hour.
- There are no browser end-to-end tests in CI. Pages were checked in a real
  browser at 375–1920 px during development.
- **Admin uploads on serverless hosts.** Photos and GLB files are posted to a
  route handler, which validates them before storing them. Vercel limits a
  request body to 4.5 MB, so on Vercel larger files need a switch to signed
  direct-to-Storage upload URLs (validation would then run after the upload).
  Self-hosted (`npm run start`) there is no such limit.
- **Without JavaScript**, static pages (car pages, brands, countries, parts)
  read fully. Pages that depend on the request — the filtered catalogue,
  favourites and the account — stream their content, and a browser with
  JavaScript turned off only sees their loading skeleton. Search engines are
  served the complete page.
- An unknown car or brand URL shows the "not found" page but, because the page
  shell has already started streaming, answers with HTTP 200 and a `noindex`
  tag rather than a 404 status.
- The admin panel cannot yet delete an engine or transmission that no vehicle
  uses any more; that needs SQL.

---

## 14. Screenshot checklist for the report

<!-- LEAD: refresh after final QA -->

Use a **1440×900** window unless noted.

| #   | Screen                    | Where                                                      | What to show                                                         |
| --- | ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Loading screen            | any page, first visit in a session                         | Wordmark and progress                                                |
| 2   | Home hero                 | `/`                                                        | The 3D hero and "The world of automotive engineering."               |
| 3   | Command palette           | any page → ⌘K / Ctrl K, type "911 gt"                      | Fuzzy results grouped by kind                                        |
| 4   | Catalogue                 | `/cars`                                                    | Filters, sort, cards with quick stats                                |
| 5   | Search understanding      | `/cars?q=german+supercars`                                 | The "Understood as" chips                                            |
| 6   | Car page — above the fold | `/cars/porsche/911/gt3`                                    | 3D viewer, key figures, price block, actions                         |
| 7   | Exploded view             | same page → **Explode**                                    | Subsystems separated, hover tooltip                                  |
| 8   | X-ray / engineering mode  | same page → **X-ray**                                      | Ghosted body with the engine and dimensions visible                  |
| 9   | Anatomy tour              | same page, scrolled                                        | A tour stop with its figures                                         |
| 10  | Pricing                   | same page → market selector                                | Country → state → city and the breakdown (or the honest empty state) |
| 11  | EV contrast               | `/cars/tesla/model-s/plaid`                                | Motors and battery, no engine anywhere on the page                   |
| 12  | Compare                   | `/compare?car=porsche/911/turbo-s&car=tesla/model-s/plaid` | Grouped rows, bars, "—" for unpublished figures                      |
| 13  | Country page and map      | `/countries`, `/countries/japan`                           | Map hover, manufacturers by segment                                  |
| 14  | Parts encyclopedia        | `/parts/turbocharger`                                      | Function, materials, failure points, related parts                   |
| 15  | Admin dashboard           | `/admin`                                                   | Counts and data-quality panels                                       |
| 16  | Admin price editor        | `/admin` → Prices → Add price                              | Required provenance and the live label preview                       |
| 17  | Mobile                    | home, a car page and the menu at 390 px                    | Mobile navigation and stacked layout                                 |

---

## Technology

Next.js 16 (App Router, Partial Prerendering) · React 19 · TypeScript 5.9
strict · Tailwind CSS v4 · React Three Fiber 9 · Three.js · GSAP +
ScrollTrigger · Supabase (Postgres, Auth, Storage, RLS) · Vitest

Architecture notes, version-pinning rationale and the full decisions log are in
[`CLAUDE.md`](./CLAUDE.md).

---

## Disclaimer

Technical information may vary by market, model year, trim and manufacturer
specification. Prices vary by dealer, insurance provider, variant, tax rules
and registration date. All marque names, model names and specifications are
the property of their respective manufacturers. This is a non-commercial
educational project.
