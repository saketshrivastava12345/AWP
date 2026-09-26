# AURIX — Global Automotive Intelligence

A premium 3D automotive encyclopedia. Browse the world's cars from country down
to individual component, explore them in an interactive 3D viewer, and compare
full specifications side by side.

Built as a mini project for **B.Tech Computer Science and Engineering, Pimpri
Chinchwad University.**

**Content hierarchy:** Country → Manufacturer → Model → Variant → Specifications → Parts

---

## Contents

1. [Install and run](#1-install-and-run)
2. [Creating the Supabase project](#2-creating-the-supabase-project)
3. [Applying migrations and seed](#3-applying-migrations-and-seed)
4. [Making your account an admin](#4-making-your-account-an-admin)
5. [Adding images and 3D models](#5-adding-images-and-3d-models)
6. [Adding catalogue data](#6-adding-catalogue-data)
7. [Deploying to Vercel](#7-deploying-to-vercel)
8. [Known limitations and next steps](#8-known-limitations-and-next-steps)
9. [Screenshot checklist for the report](#9-screenshot-checklist-for-the-report)

---

## 1. Install and run

**Requirements:** Node.js 20.9 or newer. No Docker, and no local database.

```bash
git clone <your-repo-url> aurix
cd aurix
npm install

cp .env.example .env.local      # then fill it in — see section 2
npm run dev                     # http://localhost:3000
```

### All commands

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Development server (Turbopack)                     |
| `npm run build`     | Production build                                   |
| `npm run start`     | Serve the production build                         |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run test`      | Vitest — 47 tests for the search parser            |
| `npm run format`    | Prettier                                           |
| `npm run verify`    | lint → build → typecheck                           |
| `npm run db:push`   | Apply migrations to the hosted database            |
| `npm run db:seed`   | Apply the seed data (safe to re-run)               |
| `npm run db:verify` | Print row counts for every table                   |
| `npm run db:types`  | Regenerate `src/types/database.ts` from the schema |

> **Note:** `npm run verify` runs **build before typecheck** deliberately.
> Next 16 generates the global `PageProps` / `LayoutProps` route types into
> `.next/types` during a build, so a standalone `tsc --noEmit` fails on a fresh
> clone until one build has run.

---

## 2. Creating the Supabase project

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

Only the two `NEXT_PUBLIC_` values ever reach the browser. They are safe to
expose — every table has Row Level Security, so the key grants exactly the
read access the policies allow. **The service-role key is not used anywhere in
this project and should never be added to it.**

`.env.local` is git-ignored. `.env.example` is committed.

---

## 3. Applying migrations and seed

There are four SQL files, and they must be applied in order:

| File                                   | Contents                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/migrations/0001_schema.sql`  | 20 tables, 11 enums, 1 domain, the `car_catalog` view, triggers, indexes |
| `supabase/migrations/0002_rls.sql`     | Row Level Security policies and grants                                   |
| `supabase/migrations/0003_storage.sql` | Five storage buckets and their policies                                  |
| `supabase/seed.sql`                    | 10 countries, 22 manufacturers, 46 models, 54 variants, 70 parts         |

### Method A — SQL Editor (no tooling required)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `0001_schema.sql`, run it.
3. Repeat for `0002_rls.sql`, then `0003_storage.sql`, then `seed.sql`.
4. Paste `supabase/verify.sql` and run it to confirm the row counts.

### Method B — Supabase CLI (no Docker)

```bash
npm run db:push        # applies pending migrations over a direct connection
npm run db:seed        # applies seed.sql
npm run db:verify      # prints row counts
npm run db:types       # regenerates the TypeScript types
```

`npm run db:push -- --dry-run` previews without applying.

> **Why not `supabase start`?** The CLI's local development stack runs Postgres
> in Docker, and this project deliberately avoids Docker. Note that `db dump`,
> `db reset` and `gen types --db-url` **also** shell out to Docker — only
> `db push` talks to Postgres directly. That is why type generation here uses
> `scripts/gen-types.mjs`, which introspects `pg_catalog` over a normal
> connection and needs neither Docker nor a Supabase access token.

### Verifying

`npm run db:verify` should print:

| Table                  | Rows   |     | Table            | Rows |
| ---------------------- | ------ | --- | ---------------- | ---- |
| countries              | 10     |     | parts            | 70   |
| manufacturers          | 22     |     | part_categories  | 9    |
| categories             | 13     |     | part_relations   | 63   |
| car_models             | 46     |     | variant_parts    | 20   |
| car_variants           | 54     |     | features         | 18   |
| engines                | 30     |     | variant_features | 88   |
| transmissions          | 29     |     | car_media        | 0    |
| performance_specs      | 54     |     | dimensions       | 54   |
| fuel_specs             | 37     |     | ev_specs         | 22   |
| **car_catalog (view)** | **54** |     |                  |      |

The seed is idempotent — every insert uses `ON CONFLICT DO NOTHING` against a
natural key, so re-running it changes nothing.

---

## 4. Making your account an admin

Sign up through the app at `/login` first, then run this in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Confirm it took effect:

```sql
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id;
```

Then reload the site — a shield icon appears in the navbar linking to `/admin`.

> You cannot do this from inside the application. A `BEFORE UPDATE` trigger on
> `profiles` restores the previous role unless the caller is already an admin,
> so a user cannot promote themselves. This is verified by an automated check.

---

## 5. Adding images and 3D models

Five public-read, admin-write storage buckets are created by `0003_storage.sql`:

| Bucket          | For                | Limit                      |
| --------------- | ------------------ | -------------------------- |
| `cars`          | Car photographs    | 10 MB, JPEG/PNG/WebP/AVIF  |
| `manufacturers` | Brand logos        | 2 MB, + SVG                |
| `countries`     | Country imagery    | 2 MB, + SVG                |
| `parts`         | Component diagrams | 10 MB                      |
| `models-3d`     | GLB models         | 50 MB, `model/gltf-binary` |

### Registering a car photograph

Upload through **Storage** in the dashboard, then register it:

```sql
insert into public.car_media (variant_id, type, url, alt, is_primary)
select v.id, 'image',
       'https://<your-ref>.supabase.co/storage/v1/object/public/cars/911-turbo-s.jpg',
       'Porsche 911 Turbo S, front three-quarter view',
       true
from public.car_variants v
join public.car_models m      on m.id  = v.model_id
join public.manufacturers mf  on mf.id = m.manufacturer_id
where mf.slug = 'porsche' and m.slug = '911' and v.slug = 'turbo-s';
```

### Registering a GLB model

Identical, with `type = 'glb'` and the `models-3d` bucket. The viewer picks it
up automatically and the "concept representation" badge disappears.

```sql
insert into public.car_media (variant_id, type, url, alt)
select v.id, 'glb',
       'https://<your-ref>.supabase.co/storage/v1/object/public/models-3d/911-turbo-s.glb',
       'Porsche 911 Turbo S 3D model'
from public.car_variants v
join public.car_models m     on m.id  = v.model_id
join public.manufacturers mf on mf.id = m.manufacturer_id
where mf.slug = 'porsche' and m.slug = '911' and v.slug = 'turbo-s';
```

**Model requirements.** Any scale and origin work — `GLBCar` measures the
bounding box and normalises both. A model that fails to load falls back to the
procedural car via an error boundary; it never breaks the page. At most one GLB
per variant, enforced by a partial unique index.

Local files in `public/models/` also work; use a path like `/models/car.glb`
as the URL.

---

## 6. Adding catalogue data

Everything is addressed by slug, so no UUIDs are ever typed by hand.

### A country

```sql
insert into public.countries (name, slug, iso_code, flag_emoji, description, automotive_history)
values ('Spain', 'spain', 'ES', '🇪🇸',
        'Short description shown on the country card.',
        'Longer history shown on the country page.');
```

### A manufacturer

```sql
insert into public.manufacturers (country_id, name, slug, founded_year, headquarters, segment, website, description)
select c.id, 'SEAT', 'seat', 1950, 'Martorell, Catalonia', 'mass',
       'https://www.seat.com', 'Description of the marque.'
from public.countries c
where c.slug = 'spain';
```

`segment` is one of `luxury`, `performance`, `mass`, `ev`, `commercial`.

### A model

```sql
insert into public.car_models (manufacturer_id, category_id, name, slug, generation, body_type, production_start, description)
select mf.id, cat.id, 'Leon', 'leon', 'Mk4', 'hatchback', 2020,
       'Description of the model.'
from public.manufacturers mf
cross join public.categories cat
where mf.slug = 'seat' and cat.slug = 'hatchback';
```

`body_type` is one of `hatchback`, `sedan`, `coupe`, `convertible`, `roadster`,
`suv`, `wagon`, `mpv`, `pickup`, `off_road`.

### A variant and its specifications

```sql
-- 1. The variant
insert into public.car_variants
  (model_id, name, slug, year_start, fuel_type, drive_type, transmission_id, description, source)
select m.id, '1.5 TSI', '1-5-tsi', 2020, 'petrol', 'fwd', t.id,
       'Description of this specific variant.',
       'Manufacturer published specifications'
from public.car_models m
join public.manufacturers mf on mf.id = m.manufacturer_id
left join public.transmissions t on t.name = '6-speed manual'
where mf.slug = 'seat' and m.slug = 'leon';

-- 2. Performance. Leave a column NULL if the figure is not published —
--    never estimate it.
insert into public.performance_specs (variant_id, power_hp, torque_nm, top_speed_kmh, zero_to_100_s, source)
select v.id, 150, 250, 216, 8.4, 'Manufacturer published specifications'
from public.car_variants v
join public.car_models m     on m.id  = v.model_id
join public.manufacturers mf on mf.id = m.manufacturer_id
where mf.slug = 'seat' and m.slug = 'leon' and v.slug = '1-5-tsi';

-- 3. Dimensions, and fuel_specs (ICE/hybrid) or ev_specs (EV/PHEV)
--    follow exactly the same pattern.
```

> **Powertrain rules are enforced by the database.** `fuel_specs` cannot be
> attached to a battery-electric variant and `ev_specs` cannot be attached to a
> pure combustion one — triggers reject both. An EV must also have
> `engine_id IS NULL`. If you record `range_km` you must also record
> `range_standard`, because a range figure without its test standard is not
> comparable to anything.

### A part

```sql
insert into public.parts
  (category_id, name, slug, viewer_group, description, function, typical_materials,
   location, common_failure_points, performance_impact)
select pc.id, 'Intercooler', 'intercooler-example', 'engine',
       'What it is.', 'What it does.', 'What it is made of.',
       'Where it sits.', 'How it fails.', 'What it contributes.'
from public.part_categories pc
where pc.slug = 'engine';
```

`viewer_group` links a part to a subsystem of the 3D car and is one of `body`,
`engine`, `transmission`, `suspension`, `brakes`, `wheels`, `interior`,
`electronics`, `battery`.

### Relating two parts

```sql
insert into public.part_relations (part_id, related_part_id)
select least(a.id, b.id), greatest(a.id, b.id)
from public.parts a, public.parts b
where a.slug = 'turbocharger' and b.slug = 'intercooler-example';
```

`least`/`greatest` satisfy the canonical-ordering constraint — one row per
unordered pair, read in both directions by the query.

### After any change

```bash
npm run db:types      # if you altered the schema
npm run db:verify     # confirm the row counts
```

---

## 7. Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import it. The framework is detected
   automatically; build settings need no changes.
3. Add these **Environment Variables** (Production, Preview and Development):

   | Name                            | Value                         |
   | ------------------------------- | ----------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Your project URL              |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your publishable key          |
   | `NEXT_PUBLIC_SITE_URL`          | `https://your-app.vercel.app` |

   `SUPABASE_DB_URL` is **not** needed in Vercel — it is only used by the local
   `db:*` scripts.

4. Deploy.
5. Update `NEXT_PUBLIC_SITE_URL` to the real domain once assigned, and redeploy,
   so canonical URLs, OpenGraph tags and the sitemap point at the right host.

Build settings, for reference:

| Setting          | Value                   |
| ---------------- | ----------------------- |
| Framework        | Next.js                 |
| Build command    | `next build` (default)  |
| Output directory | `.next` (default)       |
| Install command  | `npm install` (default) |
| Node version     | 20.x or 22.x            |

Catalogue pages revalidate hourly. To publish a data change immediately,
redeploy or wait out the hour.

---

## 8. Known limitations and next steps

Stated plainly, because an honest limitations section is more useful than a
polished one.

### Data

- **Fuel economy is empty for every car.** `mileage_kmpl` is NULL throughout.
  European and American makers publish l/100 km and mpg, and Indian ARAI figures
  vary by variant and model year. Converting or approximating would breach the
  project's data-honesty rule, so the column waits for an authoritative source.
  This is the single largest gap.
- **Kerb weight is missing for Ferrari, Lamborghini and Koenigsegg**, which
  publish _dry_ weight instead. The dry figure is recorded in
  `dimensions.notes`. Consequently those cars show no power-to-weight and no
  Car DNA performance bar — correct behaviour, but worth knowing.
- **Tesla power output and battery capacity are NULL** because Tesla does not
  publish them. The Nissan GT-R has no 0–100 figure (not consistently published
  across markets) and the Koenigsegg Jesko no top speed (never verified — the
  500 km/h figures are simulations).
- **Power mixes two conventions.** European makers publish metric PS/cv, US and
  Japanese makers SAE net hp; they differ by about 1.4%. Each row records which
  in `performance_specs.source`, but the compare table does not convert.
- **`car_media` is empty**, so every car currently shows the procedural 3D
  representation. See section 5 to add real assets.

### 3D

- **The procedural car is the weakest part of the project.** It is
  architecturally correct — named subsystems, real dimensions, working exploded
  view and camera presets — but it reads as a stylised block model rather than a
  sleek car. Improving the body profile would give the largest visual return of
  any remaining work.
- The exploded view separates nine subsystems, not individual parts. Genuine
  part-level explosion needs modelled geometry per component.

### Application

- `/admin` is **read-only**: row counts and a recent-activity list. Writes are
  already admin-gated by RLS, so CRUD forms can be added without any further
  policy work.
- The search parser understands a fixed vocabulary (nationalities, categories,
  powertrains, engine layouts, numeric comparisons). Unrecognised words fall
  through to full-text search rather than being ignored, but it does not parse
  free-form natural language.
- Email confirmation follows whatever the Supabase project is configured for.
  On the free tier, sign-up emails are rate-limited to a few per hour.
- There are no end-to-end tests. The 47 unit tests cover the query parser; the
  database invariants were verified with direct SQL probes rather than an
  automated suite.

### Next steps, in order of value

1. Source fuel-economy figures and fill `mileage_kmpl`.
2. Add real photographs to the `cars` bucket — the grid is image-shaped and
   currently shows placeholders.
3. Improve the procedural car's body profile, or commission a handful of GLBs.
4. Add CRUD forms to `/admin`.
5. Add Playwright end-to-end tests for the auth and favourites flows.

---

## 9. Screenshot checklist for the report

Suggested captures, in the order they tell the best story. Use a **1440×900**
window unless noted.

| #   | Screen                       | Where                                                                                  | What to show                                                                                                         |
| --- | ---------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Loading screen**           | any page, first visit in a session                                                     | Wordmark, gold progress bar, "LOADING VEHICLE SYSTEMS 087%" — refresh with a new session to catch it                 |
| 2   | **Home hero**                | `/`                                                                                    | "ENGINEERED WITHOUT LIMITS" with the gold gradient, CTAs, live catalogue counts                                      |
| 3   | **Scroll storytelling**      | `/`, scroll into the pinned section                                                    | Mid-beat, e.g. "Stopping is the harder problem", with the car framed on the brakes and the progress rail part-filled |
| 4   | **Car collection grid**      | `/cars`                                                                                | Filter rail open on the left, cards with power/top-speed/0–100 stats                                                 |
| 5   | **Search understanding**     | `/cars?q=german+supercars`                                                             | The "Understood as" chips — this is the query parser's headline feature                                              |
| 6   | **Car detail, 3D viewer**    | `/cars/porsche/911/turbo-s`                                                            | Viewer with camera preset buttons and the "concept representation" badge                                             |
| 7   | **Exploded view**            | same page → **Explode**                                                                | Subsystems separated, "Exploded view" badge visible                                                                  |
| 8   | **Subsystem info panel**     | same page → click a group or use "Inspect a subsystem"                                 | Side sheet with the real catalogued parts                                                                            |
| 9   | **Engineering Mode**         | same page → **Engineering**                                                            | Wireframe car with dimension lines labelled from real data                                                           |
| 10  | **Specifications + Car DNA** | same page, scrolled down                                                               | Sticky section nav, spec rows, and the DNA percentile bars                                                           |
| 11  | **Powertrain flow — ICE**    | same page                                                                              | Fuel → Engine → Transmission → Differential → Wheels, with driven wheels in gold                                     |
| 12  | **Powertrain flow — EV**     | `/cars/tesla/model-s/plaid`                                                            | Battery → Inverter → Motor → Wheels, **and no Engine section anywhere on the page** — a good contrast pair with #11  |
| 13  | **Compare table**            | `/compare?car=porsche/911/turbo-s&car=tesla/model-s/plaid&car=ferrari/296-gtb/296-gtb` | Best-in-row highlighting and em dashes for unpublished figures                                                       |
| 14  | **Country page**             | `/countries/japan`                                                                     | History, manufacturers grouped by segment, cars                                                                      |
| 15  | **World map**                | `/countries`                                                                           | Markers sized by catalogue contribution, one hovered                                                                 |
| 16  | **Parts encyclopedia**       | `/parts`                                                                               | Category navigation and the component grid                                                                           |
| 17  | **Part detail**              | `/parts/turbocharger`                                                                  | Function, materials, failure points, related components                                                              |
| 18  | **Manufacturer page**        | `/manufacturers/porsche`                                                               | Brand history and models grouped by category                                                                         |
| 19  | **Admin dashboard**          | `/admin` (as an admin)                                                                 | Row counts across all 20 tables                                                                                      |
| 20  | **404 page**                 | `/no-such-page`                                                                        | "NO SUCH VEHICLE"                                                                                                    |
| 21  | **Mobile — home**            | `/` at 375 px                                                                          | Hero and mobile navigation                                                                                           |
| 22  | **Mobile — detail**          | a car page at 375 px                                                                   | Viewer and stacked specs                                                                                             |
| 23  | **Mobile — filters**         | `/cars` at 375 px → **Filters**                                                        | The filter drawer open                                                                                               |

**Two extras worth including for a technical report:**

- The Supabase **table editor** showing the 20-table schema, or the ER diagram.
- `npm run test` output showing **47 passing parser tests**.

---

## Technology

Next.js 16 (App Router) · React 19 · TypeScript 5.9 strict · Tailwind CSS v4 ·
React Three Fiber 9 · Three.js · GSAP + ScrollTrigger · Supabase (Postgres,
Auth, Storage) · Vitest

Architecture notes, version-pinning rationale and a full decisions log are in
[`CLAUDE.md`](./CLAUDE.md).

---

## Disclaimer

Technical information may vary by market, model year, trim and manufacturer
specification. All marque names, model names and specifications are the property
of their respective manufacturers. This is a non-commercial educational project.
