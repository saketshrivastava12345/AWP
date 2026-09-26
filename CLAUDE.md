# AURIX — Global Automotive Intelligence

A premium 3D automotive encyclopedia. College mini project (B.Tech CSE, Pimpri
Chinchwad University), built to portfolio quality.

Content hierarchy: **Country → Manufacturer → Model → Variant → Specifications → Parts**

---

## Commands

| Command                           | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | Dev server (Turbopack) on http://localhost:3000              |
| `npm run build`                   | Production build                                             |
| `npm run lint` / `lint:fix`       | ESLint                                                       |
| `npm run typecheck`               | `tsc --noEmit`                                               |
| `npm run test` / `test:watch`     | Vitest unit tests                                            |
| `npm run format` / `format:check` | Prettier                                                     |
| `npm run verify`                  | lint → build → typecheck (run before finishing a phase)      |
| `npm run db:push`                 | Apply `supabase/migrations/` (add `-- --dry-run` to preview) |
| `npm run db:seed`                 | Apply `supabase/seed.sql` (idempotent — safe to re-run)      |
| `npm run db:verify`               | Row counts for every table plus the catalog view             |
| `npm run db:types`                | Regenerate `src/types/database.ts` from the hosted schema    |

`verify` runs **build before typecheck** on purpose: Next 16 generates the global
`LayoutProps` / `PageProps` route types into `.next/types` during a build, so a
standalone `tsc --noEmit` fails on a clean checkout until one build has run.

---

## Stack and pinned versions

All versions are pinned exactly (no `^`) so the build is reproducible for marking.

| Package               | Version    | Note                                           |
| --------------------- | ---------- | ---------------------------------------------- |
| next                  | 16.3.5     | App Router, Turbopack                          |
| react / react-dom     | **19.2.8** | see compatibility note below                   |
| typescript            | **5.9.3**  | see compatibility note below                   |
| three                 | 0.186.0    | `@types/three` matched at 0.186.0              |
| @react-three/fiber    | 9.7.0      |                                                |
| @react-three/drei     | 10.7.8     | peers `@react-three/fiber@^9`                  |
| gsap                  | 3.15.0     | incl. ScrollTrigger                            |
| @supabase/supabase-js | 2.116.0    |                                                |
| @supabase/ssr         | 0.12.7     | cookie-based auth for App Router               |
| tailwindcss           | 4.3.3      | v4, CSS-first config (no `tailwind.config.js`) |
| lucide-react          | 1.47.0     |                                                |
| eslint                | 9.39.5     |                                                |
| vitest                | 5.0.1      | for the search query parser tests              |

### Two version decisions worth knowing

1. **React is held at 19.2.8, not the newer 19.3.0.**
   `@react-three/fiber@9.7.0` declares `peerDependencies.react: ">=19 <19.3"`.
   React 19.3 is outside that range and there is no R3F 9.x release that widens
   it (10.x is alpha only). Upgrading React without first upgrading R3F will
   break the 3D system. Re-check this before bumping React.

2. **TypeScript is held at 5.9.3, not 7.0.2.**
   `typescript-eslint@8.70.0` (current latest) peers `typescript >=4.8.4 <6.1.0`.
   TS 7 — the native/Go compiler — has no typescript-eslint release yet, so
   linting would break. 5.9.3 is the version the rest of the toolchain is
   tested against.

---

## Conventions

### Folders

```
src/
  app/                 routes, layout.tsx, not-found.tsx, error.tsx
  components/
    3d/                CarViewer, ProceduralCar, GLBCar, CameraRig, Lighting,
                       ExplodedView, EngineeringOverlay, ViewerErrorBoundary
    cars/              CarCard, CarGrid, SpecSection, CarDNA,
                       PowertrainVisualizer, CompareTable
    countries/         WorldMap, CountryCard
    manufacturers/     ManufacturerCard, ModelGroup
    parts/             PartCard, PartDetail
    layout/            Navbar, Footer, LoadingScreen, PageTransition, SearchOverlay
    ui/                Button, GlassCard, StatCard, Tabs, Sheet, Skeleton, Badge
  lib/
    supabase/          client.ts (browser), server.ts (RSC/route handlers)
    queries/           cars.ts, manufacturers.ts, countries.ts, parts.ts, compare.ts
    search/            parseQuery.ts + parseQuery.test.ts
    dna.ts, format.ts, utils.ts, env.ts, fonts.ts, site-config.ts
  hooks/               useReducedMotion, useIsMobile, ...
  types/               database.ts (generated — do not edit), domain.ts
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_storage.sql
  seed.sql
public/
  models/ textures/ images/ map/
```

### Rules

- **Server components by default.** Add `"use client"` only for interactivity
  (3D canvas, GSAP, filters, search overlay, auth forms).
- **No car data in components.** Everything comes from Supabase through typed
  functions in `src/lib/queries/`. No hardcoded spec objects.
- **Data honesty.** If a published figure is not known with confidence, the
  column stays `NULL` and the UI renders "Not available" (or `—` in compare
  tables). Never invent a number to fill a cell. Spec tables carry a `source`
  / `notes` column where provenance helps.
- **No `any`.** `@typescript-eslint/no-explicit-any` is an error. If one is
  genuinely unavoidable, add an inline disable plus a comment saying why.
- **Secrets.** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  reach the browser. The service-role key is never used in this codebase.
  `.env.local` is git-ignored; `.env.example` is committed.
- **Null-safety.** `noUncheckedIndexedAccess` is on, so array/record access is
  `T | undefined`. This is deliberate — the whole app is built around optional
  spec values.

### Design language

Dark luxury automotive technology. Near-black grounds, **one** metallic gold
accent, white typography, hairline borders, restrained glassmorphism, faint
grain. It should read as a premium configurator, not a gaming dashboard —
so no neon, no heavy glow, no saturated secondary hues.

Tokens live in `src/app/globals.css` (Tailwind v4 `@theme`):

- grounds `--color-void`, `--color-surface-1..4`
- accent `--color-gold-200..800` (`gold-500` is the primary)
- text `--color-ink-50..600`
- hairlines `--color-line-subtle` / `line` / `line-strong`
- muted signals `--color-signal-positive|negative|electric|hybrid`
- utilities `grain`, `glass`, `edge-light`, `gold-gradient-text`, `text-label`

Fonts (`src/lib/fonts.ts`, via `next/font/google`):

- **Michroma** → `font-display` — headlines, wordmark, big stat numbers
- **Inter** → `font-sans` — body
- **JetBrains Mono** → `font-mono` — spec tables, compare columns

---

## Decisions log

**Phase 1**

- Scaffolded with `create-next-app@16.3.5` (TS, Tailwind, ESLint, App Router,
  `src/`, `@/*` alias). Dir had to be scaffolded as `aurix/` and moved up
  because npm rejects the capitalised folder name `Aurix`.
- **Created a project-scoped git repo.** The enclosing folder was inside a git
  repo rooted at `C:\Users\Saket` (the whole home directory). Committing from
  there would have tracked unrelated personal files, so `git init` was run in
  the project folder; the outer repo is untouched.
- Pinned `turbopack.root` in `next.config.ts` — Turbopack was otherwise walking
  up and picking an unrelated `package-lock.json` from the home directory.
- Tailwind v4 is CSS-first: there is **no** `tailwind.config.js`. Theme changes
  go in the `@theme` blocks in `globals.css`.
- `src/lib/env.ts` exposes `getPublicEnv()` (non-throwing, returns `null`) so a
  missing/unreachable Supabase config renders an on-brand empty state instead of
  crashing, per the quality requirements. `requirePublicEnv()` throws for server
  contexts where misconfiguration is a real bug.
- ESLint flat config extends `next/core-web-vitals` + `next/typescript`, with
  `eslint-config-prettier` applied last so formatting rules don't conflict.

**Phase 2**

- Schema applied to the hosted project: **20 tables, 11 enums, 1 view, 1 domain,
  9 trigger functions, 5 storage buckets**. Seeded with 10 countries,
  22 manufacturers, 46 models, 54 variants and 70 parts.
- **The Supabase CLI needs Docker for more than `supabase start`.** `db dump`,
  `db reset` and `gen types --db-url` all shell out to a Docker image and fail
  on this machine. `db push` does **not** — it talks to Postgres directly. So:
  - migrations go through `supabase db push --db-url`, wrapped by
    `scripts/db-push.mjs` which reads the URL from `.env.local`;
  - types come from `scripts/gen-types.mjs`, which introspects `pg_catalog`
    over a normal Postgres connection. The official Docker-free alternative,
    `supabase gen types --project-id`, needs `supabase login` and a personal
    access token; this needs neither.
  - `psql` is not installed, so `scripts/run-sql.mjs` runs the seed and ad-hoc
    queries through the `pg` driver.
- `scripts/db-push.mjs` runs `node node_modules/supabase/dist/supabase.js`
  rather than the `supabase` shim: Node 22 refuses to spawn `.cmd` shims without
  `shell: true`, and routing the connection string through a shell would risk
  mangling the password.
- The seed is **idempotent** — every insert uses `ON CONFLICT DO NOTHING`
  against a natural key. Verified by re-running it to 0 rows.

**Schema decisions made in Phase 2**

- `engine_layout` excludes electric. Electric drive is modelled by `fuel_type`
  plus `ev_specs`, so "V8"-style filtering never has to reason about motors.
  `engines.configuration` is a GENERATED column producing "V8" / "Inline-4" /
  "Flat-6" for display.
- `car_catalog` is declared `WITH (security_invoker = true)`. Without it a view
  executes as its _owner_ and silently bypasses the RLS on every base table it
  reads. This is the single most important line in the schema.
- Search lives in `car_variants.search_document` (tsvector), maintained by a
  BEFORE trigger that pulls in manufacturer and model names. A GENERATED column
  cannot reference other tables and a view cannot be indexed, so the index has
  to sit on a real column. Renaming a model or manufacturer re-touches the
  affected variants to refresh it.
- `is_admin()` is SECURITY DEFINER to break RLS recursion: the policies on
  `profiles` call it, and it reads `profiles`.
- `profiles.role` is protected by a BEFORE UPDATE trigger that restores the old
  value. An RLS `WITH CHECK` cannot express "every column except this one".
- `fuel_specs` / `ev_specs` powertrain rules are triggers, not CHECKs — a CHECK
  cannot read `car_variants` to find the fuel type.
- `part_relations` stores one canonical row per unordered pair
  (`CHECK (part_id < related_part_id)`); the seed uses `least()`/`greatest()` to
  satisfy it. Queries read it bidirectionally with a UNION.

**Data honesty in the seed**

- `mileage_kmpl` is **NULL for every row**. European and US makers publish
  l/100 km or mpg, and Indian ARAI figures differ by variant and model year.
  Converting or approximating either would be inventing data. Each row's `notes`
  says so. This is the most visible gap and is ready for a real source.
- Kerb weight is NULL for Ferrari, Lamborghini and Koenigsegg, which publish
  _dry_ weight; the dry figure is recorded in `dimensions.notes`. As a result
  `power_to_weight_hp_per_tonne` is NULL for those cars and the Car DNA
  performance bar will correctly hide itself.
- Tesla power output and battery capacity are NULL — Tesla does not publish
  them. Nissan GT-R 0–100 km/h is NULL (not consistently published across
  markets). Koenigsegg Jesko top speed is NULL (never verified; published
  figures above 500 km/h are simulations).
- Power is stored **as published**: metric PS/cv for European makers, SAE net hp
  for US and Japanese makers. The two differ by about 1.4%, and every row
  records which convention it uses in `performance_specs.source`.
- `car_media` is **empty**. No real image or GLB URLs exist yet, and inventing
  them would breach the same rule. The 3D viewer's procedural fallback (Phase 5)
  is designed for exactly this state.

**Phase 3**

- Design system in `src/components/ui/`: Button/ButtonLink, Badge, GlassCard,
  StatCard + StatRow, Tabs, Sheet, Skeleton, Container, SectionHeading,
  EmptyState, PhasePlaceholder.
- Chrome in `src/components/layout/`: Navbar (with scroll progress and mobile
  menu), Footer, SearchOverlay + SearchProvider, LoadingScreen, PageTransition.
- **Next 16 enforces `react-hooks/set-state-in-effect` as an error.** Six
  violations were fixed properly rather than suppressed, and the patterns are
  worth reusing:
  - Media queries (`useReducedMotion`, `useIsMobile`) go through a shared
    `useMediaQuery` built on `useSyncExternalStore`. A media query is an
    external mutable source; copying it into state in an effect costs an extra
    render on every mount.
  - `Navbar` closes its mobile menu by **adjusting state during render**
    (compare `pathname` with the previous value), React's documented pattern
    for "reset when a prop changes".
  - `SearchOverlay` splits into an outer component that returns `null` when
    closed and an inner `SearchPanel` holding the query state, so the field
    resets by unmounting rather than by clearing it in an effect.
  - `LoadingScreen` reads the `data-booted` attribute through
    `useSyncExternalStore`, and derives `leaving` from `progress` instead of
    storing it.
- **The loading screen is server-rendered**, so it covers the page from the
  first byte. An inline script in `<head>` (`src/lib/boot-script.ts`) sets
  `data-booted` synchronously from `sessionStorage`, and a CSS rule hides the
  screen before paint on repeat visits — no flash in either direction. Progress
  is driven by real signals (`document.fonts.ready`, then the window `load`
  event), not a timer; Phase 5 adds the R3F asset loader to the same counter.
- `PageTransition` keys on `pathname` and uses a CSS animation rather than
  GSAP. It is enter-only: animating the outgoing page would mean holding the
  old route mounted while the new one streams, which fights React streaming.
  Reduced motion is handled entirely by the CSS backstop, so the component
  renders identically on server and client.
- `GlassCard` is polymorphic (`as` + `ComponentPropsWithoutRef<T>`) so it can
  render as a `Link` and still type-check `href`.
- **Stub routes** exist for `/cars`, `/manufacturers`, `/countries`, `/parts`
  and `/compare` so navigation is never broken. They use `PhasePlaceholder`,
  which states plainly what is not built yet instead of showing invented
  content. `/about` is real and final.
- `src/lib/format.ts` centralises the "value may be absent" rendering:
  `NOT_AVAILABLE` for spec lists, `EM_DASH` for compare tables. Every formatter
  accepts `null | undefined`. `formatPrice` never converts currencies.

**Phase 4**

- Two server clients, deliberately: `createStaticClient()` (cookie-free, anon,
  with `next: { revalidate: 3600, tags: ["catalogue"] }`) for every public
  catalogue read, and `createServerSupabaseClient()` (cookie-aware) only where
  the answer depends on who is asking. Reading cookies would opt a route out of
  static rendering entirely, and the catalogue is identical for every visitor.
- **Every query function returns an empty value instead of throwing.** A page
  whose job is to degrade gracefully must not be taken down by a failed fetch,
  so failures are logged and the route renders its empty state.
- Improved `scripts/gen-types.mjs` to detect **one-to-one** foreign keys (the FK
  columns are also unique on the referencing table). All four spec satellites
  are now typed as a single object rather than an array when embedded.
- `getVariantDetail` is wrapped in React `cache()` so `generateMetadata` and the
  page share one fetch — at build time that is 54 round trips instead of 108.
- Deep PostgREST embeds use `.returns<T>()` with an explicitly declared row
  type. The detail embed nests four levels through two join tables; letting the
  client infer it produces unreadable errors, and the mapping function is what
  guarantees the shape at runtime anyway.
- `listCars` adds a **stable tiebreaker** (`.order("variant_id")`) after the
  sort column. Without it, rows with equal power reorder between pages and a car
  can appear twice or not at all.
- Filter facets in `getFilterOptions` are derived from the data, so a filter is
  never offered for a value no car has, and range sliders bound themselves to
  figures that exist.
- Search params are parsed permissively: unknown enum values are dropped rather
  than rejected, so a shared link with a stale filter still shows results.
- Prerendered at build: 54 variants, 22 manufacturers, 10 countries, 70 parts.
  `/cars` stays dynamic because it reads search params.

**Powertrain sections (the EV rule)**

`buildSpecSections` in `src/lib/spec-sections.ts` chooses sections from
`fuel_type`, **not** from which spec rows happen to exist:

| fuel_type       | Sections                                                      |
| --------------- | ------------------------------------------------------------- |
| petrol / diesel | Engine, Fuel & Efficiency                                     |
| electric        | Electric Drivetrain, Range & Charging — **no Engine section** |
| hybrid / phev   | Engine, Electric Assist, Fuel, Electric Range & Charging      |

Verified in the served HTML: the Tesla Model S Plaid renders zero Engine
headings, the 911 Turbo S renders one and no electric section, and the Ferrari
296 GTB renders both with the electric block labelled "Assist" rather than
"Drivetrain".

Within a section, an individual null still renders "Not available" — the
absence of a figure is information. A section where _every_ row is null renders
nothing at all.

**Phase 5 — 3D system**

- `src/components/3d/`: `viewer-config.ts` (groups, presets, explode vectors,
  proportions), `ProceduralCar`, `GLBCar`, `CarScene`, `CarViewer`,
  `CameraRig`, `Lighting`, `ViewerErrorBoundary`.
- The Canvas is behind `dynamic(..., { ssr: false })`. three.js touches
  `window` at module scope, and keeping ~400 kB of 3D out of the initial bundle
  means the detail page's text is interactive long before the viewer parses.
  Confirmed: three.js does not appear in the server-rendered HTML.
- **The canvas mounts only when an IntersectionObserver says it is near the
  viewport**, and `frameloop` drops to `"never"` when it scrolls away, so
  scrolling past a detail page does not leave a WebGL loop running.
- Proportions come from the variant's **published dimensions** where they
  exist, falling back to a body-type profile. A car with known dimensions is
  modelled at its real size; one without still looks like the right kind of car.
- `BODY_WIDTH_RATIO = 0.84` is load-bearing. The body must be narrower than the
  track so the wheels break the silhouette at all four corners — with a
  full-width body the wheels are swallowed entirely and the shape reads as a
  bus. Found by actually looking at the render.
- Likewise the shoulder strip must sit **at or below** the beltline. Boxes
  stacked above it add height and the car immediately reads as a truck cab.
- Groups are chosen by powertrain: EVs get `battery` and no `engine`, hybrids
  get both — the same rule as the spec sections.
- Clicking a group in the canvas is pointer-only, so every subsystem is also
  exposed as a real button under "Inspect a subsystem". The info panel is a
  `Sheet`, which already handles Escape, focus trap and focus restore.
- `GLBCar` normalises scale and origin from the model's bounding box, because
  real GLBs arrive at arbitrary scale. It deliberately does **not** catch its
  own errors: `useGLTF` throwing is what triggers `ViewerErrorBoundary` and the
  procedural fallback.

**Two real bugs found by running it in a browser**

1. **The loading screen could hang forever.** `requestAnimationFrame` is
   _paused_, not throttled, while a tab is hidden — so a visitor who switched
   tabs mid-load came back to a counter frozen at 99% behind an opaque overlay,
   with no way out but a reload. Completion is now also driven by timers, which
   keep firing when hidden: finish immediately if `document.hidden`, and a hard
   `MAX_VISIBLE_MS` ceiling regardless.
2. **The counter was frame-rate dependent.** Easing by a fixed fraction _per
   frame_ converges in a fixed number of FRAMES, so it took four times as long
   at 15fps as at 60. Observed crawling 78%→89% in four seconds. Now eased by
   elapsed milliseconds, so it converges in the same ~0.6s everywhere.

Also fixed: `text-label` had `line-height: 1`, which made the wrapped
loading-screen tagline overlap itself.

**Known weakness**

The procedural car is architecturally right (named groups, real dimensions,
explode, presets) but its _visual_ fidelity is the weakest part of the project —
it reads as a stylised block model, not a sleek car. Two geometry passes
improved it materially; a further pass on the body profile would help most.
_(Addressed in Phase 10: the body is now a lofted parametric surface.)_

**Phase 6 — search, filters, compare**

- `src/lib/search/parseQuery.ts` is a rule-based parser, not an AI call: the
  vocabulary of car search is small and closed, so ordered rules are faster,
  free, offline and — the real point — testable. **47 unit tests, all passing.**
- Strategy is consume-and-blank: each rule claims its match and blanks it, so a
  later rule cannot re-read the same words, and longest phrases are tried first
  ("sports car" beats "car", "twin turbo" beats "turbo", "four wheel drive"
  beats "fwd"). Whatever survives becomes a full-text term rather than being
  discarded, so "porsche german supercars" still searches for "porsche".
- **Verified end to end against the database: 8/8 queries returned exactly the
  count a direct SQL query returns** — german supercars 1, under 500 hp 26,
  above 300 km/h 18, japanese sports cars 3, v8 9, electric suv 6, india 6,
  twin-turbo v8 7.
- Explicit URL filters win over anything the parser inferred, so clicking a
  facet is never silently overridden by the text in the search box.
- `FilterRail`: every control is a plain `<Link>` that rewrites the URL, so
  filters are shareable, back/forward works and the page functions without
  JavaScript. Range inputs are a GET `<form>` with the other params carried as
  hidden fields. The only client state is which accordion is open.
- Compare state lives entirely in the URL (`?car=manufacturer/model/variant`),
  so a comparison is shareable and survives a reload. `getComparisonSet` reuses
  the `cache()`-wrapped detail query, and drops unresolvable slugs rather than
  failing the page.
- **"Best in row" is only highlighted when at least two cars publish a figure.**
  Crowning the only car with data would imply it won a contest the others did
  not enter. Price has no winner at all — the cars are in different currencies
  and this project never converts.
- `WorldMap` bundles its marker coordinates locally (`map-data.ts`); no runtime
  fetch to a third-party URL. Equirectangular projection, so lon/lat map
  linearly onto the viewBox. Hidden below `md`, where the card grid is better.

**A client/server boundary bug worth remembering**

The build failed with "You're importing a module that depends on server-only".
The chain was `FilterRail` (client) → `search-params.ts` → a **value** import of
`isSortKey` from `lib/queries/cars.ts`, which imports `server-only`. A type-only
import would have been erased; a value import drags the whole Supabase server
client toward the browser bundle.

Fix: pure types and predicates now live in `src/lib/car-query.ts` and
`src/lib/facets.ts`, which import nothing server-side. Anything that touches
the database stays behind the `server-only` boundary. **Rule: a client
component may only ever `import type` from a `lib/queries/*` module.**

**Phase 7 — auth, favorites, admin**

- Email + password auth via Server Actions, so credentials post straight to the
  server and the form still works without JavaScript. Sign-in failures return a
  single generic message: distinguishing "no such user" from "wrong password"
  would let anyone enumerate which emails have accounts.
- `middleware.ts` refreshes the Supabase session on every non-asset request.
  Without it tokens expire mid-visit and server components start seeing a
  signed-in user as anonymous.
- **`getUser()` everywhere, never `getSession()`.** getSession only decodes the
  cookie, which the client controls; anything gating access must revalidate the
  token with Supabase.
- Favorites queries pass no user id, because none is needed — the RLS policy
  restricts the table to `auth.uid() = user_id`, so the query can only return
  the caller's rows. The database is the access control, not the function.
- `/admin` returns the identical response for "not signed in" and "signed in
  without the admin role", so it cannot be used to probe who is an admin.

**Partial Prerendering — a performance trap worth knowing**

Putting the session-aware account menu in the root layout made **every one of
the 169 routes render dynamically**, because `cookies()` anywhere in a layout
opts the whole route out of static generation. One small widget cost the entire
catalogue its static HTML.

Fixed with `experimental.cacheComponents` (Next 16's replacement for
`experimental.ppr`) plus a `<Suspense>` boundary around `<AccountMenu />`. Every
route is now `◐ Partial Prerender`: a fully static shell with the account menu
streamed in as a dynamic hole.

One subtlety: during PPR, `cookies()` _rejects_ once the static shell is
complete — that is the framework marking a dynamic hole, not a fault. A
`try/catch` around it swallows the signal, so `getSessionUser` calls
`unstable_rethrow(error)` first and then ignores the expected prerender
rejection instead of logging 478 phantom errors per build.

**Auth security verified directly against the database**

| Property                                   | Result                             |
| ------------------------------------------ | ---------------------------------- |
| Signup trigger creates a profile           | ✅ 1 row                           |
| display_name derived from email local part | ✅                                 |
| Default role is `user`                     | ✅                                 |
| **Non-admin promoting itself to admin**    | ✅ **blocked — role stays `user`** |
| User sees their own favorite               | ✅                                 |
| **Another user sees that favorite**        | ✅ **0 rows**                      |
| Profile cascade-deletes with the auth user | ✅                                 |

**Phase 8 — signature features**

- **Car DNA** (`src/lib/dna.ts`) is a percentile rank within the catalogue, not
  an invented score. "Performance 92" means better power-to-weight than 92% of
  catalogued cars that publish both figures — true by construction, and it
  recomputes as the catalogue grows. Each bar carries its formula as a tooltip.
  **Verified: the 911 Turbo S renders Performance 92, and the same percentile
  computed directly in SQL is also 92.** Its Efficiency bar is correctly absent,
  because no car has `mileage_kmpl` — a null input hides the bar rather than
  drawing a zero.
- Efficiency deliberately ranks km/l and electric range in one population and
  says so in the tooltip. They are not the same quantity and cannot honestly be
  unified; the bar compares standing, not absolute efficiency.
- **Powertrain visualizer** picks its chain from `fuel_type` — verified that the
  Model S Plaid shows Inverter and no Differential or Fuel stage. Driven wheels
  come from `drive_type`. Pure SVG + CSS, so no client component and the flow
  animation stops under reduced motion.
- **Engineering Mode** swaps every material to wireframe and overlays the car's
  real published dimensions as labelled lines. The labels are DOM over the
  canvas rather than in-scene text, which keeps them crisp and readable by a
  screen reader.
- **Scroll storytelling** pins the hero and drives the camera through six beats
  with GSAP ScrollTrigger. The camera is tweened through a **ref**, not state —
  sixty React re-renders a second to move a camera would be absurd. Under
  reduced motion or on mobile the section renders as a plain unpinned stack of
  captions with no canvas at all.

**Two more lint rules that caught real problems**

- `react-hooks/purity`: `Math.random()` inside `useMemo` is impure and can
  produce different output on re-render. Replaced with a deterministic
  hash-based generator — which is also better, since the particle field no
  longer rearranges itself.
- The `mounted` flag in `HeroStory` was a redundant `setState`-in-effect: the
  scene is already `dynamic(..., { ssr: false })`, so it simply does not exist
  during server rendering and the flag was guarding nothing.

**Phase 9 — polish**

- **SEO**: `sitemap.ts` emits 162 URLs (all variants, manufacturers, countries,
  parts) and deliberately omits `/favorites`, `/login`, `/admin` and `/compare`
  — two are per-user and compare generates unlimited permutations. `robots.ts`
  disallows the same set. JSON-LD `Car` on detail pages and `Organization` on
  manufacturer pages, both asserting only figures that actually exist.
  `generateMetadata` with canonical + OpenGraph on every dynamic route.
- **Accessibility audit** across six page types: exactly one `<h1>` each, every
  input labelled, no empty buttons, no missing alt text, skip link, `<main>`,
  `aria-label="Primary"` on the nav and `aria-current="page"` on the active item.
- **Two real contrast failures found and fixed.** `ink-600` was 1.95:1 and
  `ink-500` 3.03:1 against the near-black ground — both were carrying real
  informational text, including the required disclaimer. Retuned to:

  | Token   | Before | After    | Status                   |
  | ------- | ------ | -------- | ------------------------ |
  | ink-400 | 4.92   | **5.93** | AA body                  |
  | ink-500 | 3.03   | **4.63** | AA body                  |
  | ink-600 | 1.95   | **3.01** | AA large / non-text only |

  The scale compresses at the bottom, which is the honest consequence of a
  near-black background: there is only so much room for distinguishable greys
  that still pass AA. `ink-600` is now reserved for decorative marks, and the
  footer disclaimer was moved up to `ink-500`.

- **Responsive**: scripted overflow audit across 7 pages × 4 widths
  (375/768/1280/1920) = 28 combinations, measuring `scrollWidth` vs
  `clientWidth` in a real iframe. **Zero horizontal overflow anywhere.**
- **Performance**: initial JS is 190–240 KB gzipped per page. The 262 KB
  gzipped three.js/R3F chunk is **not in the initial payload of any page**,
  including car detail — confirmed by parsing the served HTML for chunk
  references. It is fetched only when a viewer scrolls into view.

**Car photographs**

- `scripts/fetch-images.mjs --all --download` fills `car_media` from Wikimedia
  Commons into `public/images/cars/` and rewrites `public/images/CREDITS.md`.
  It is safe to re-run: working photographs are left alone, and a row whose
  local file is missing (never committed) is removed and fetched again, because
  a dangling row renders a broken image rather than the placeholder.
- **Every automatic pick must be checked by eye.** Of the first 18, 10 showed
  the wrong car (a NASCAR Supra, a dashboard, a concept, older generations).
  Those are listed in `scripts/image-skip.txt` so a re-run cannot reinstall
  them, and need a photograph added by hand.

**Phase 10 — a real-looking car, and a scroll tour of it**

- **The car is a lofted surface, not boxes.** `car-styles.ts` holds a side-view
  profile per body style (belt, roof, sill, nose/tail, overhangs) with no
  three.js import, so the card silhouette (`cars/car-silhouette.ts`) draws from
  the same profiles. `car-shape.ts` lofts it: monotone (Fritsch–Carlson)
  curves in side view, a superellipse in plan view, Catmull-Rom cross-sections
  per station, wheel arches cut by clamping samples to the arch circle.
- **Everything inside is laid out from the variant's rows** (`car-layout.ts`,
  `car-systems.ts`): cylinder count and bank layout from `engines`, engine
  position from the new `car_models.engine_position`, driven axles from
  `drive_type`, motor count and battery for EVs, seat count, and steering side
  from the maker's home market. A 911 gets a flat-six behind the rear axle; a
  Plaid gets three motors and a floor battery and no engine.
- **Migration 0006** adds `engine_position` (front/mid/rear enum, NULL for
  EVs). The seed backfills all 31 models with an engine, hybrids included;
  the 15 electric-only models stay NULL. An engine whose position is not
  recorded is **not drawn** rather than guessed, so an unmigrated database
  shows combustion cars without engines.
- **Lighting is built in the scene** (drei `Lightformer`s rendered once into
  the environment map). The old `preset="studio"` fetched an HDR from a
  third-party CDN at runtime; when that failed it took the whole car page down.
- **The anatomy tour** (`lib/anatomy-tour.ts`, pure and unit-tested) turns a
  variant's rows into stops — design, engine or motors, battery, drivetrain,
  chassis, brakes, cabin, performance — each with only the figures that exist
  and components chosen by the data (a turbocharger only for boosted engines).
  `CarShowcase` is a CSS `sticky` stage beside normal-flow cards; scroll
  position becomes a continuous `beat`. `StageDirector` (shared with the home
  story) damps that beat and flies the camera between shots framed from the
  car's own layout (`tour-cameras.ts`), ghosting the body and dimming other
  systems when a stop looks inside. The road slides and the wheels turn with
  the scroll, so the car reads as driving.
- **The home story** now runs on the same Director and a generic coupé, and
  its finale explodes the car into its subsystems.
- **Missing photographs render a body-style silhouette** (`CarPhoto`), never a
  broken-image icon. It is labelled as a placeholder, not a likeness.
- Viewer panels list only the groups the car has (no battery on a petrol car),
  and add the tour's general components after the variant's own, so a panel
  is not empty just because nothing is catalogued against that exact variant.

**Four bugs worth remembering**

1. **`animation-fill-mode: both` broke every `position: fixed` child.** The
   page-enter keyframe ends at `transform: none`, but interpolated against
   `translateY()` it lands on an identity matrix — still a transform — which
   makes the wrapper the containing block for fixed descendants. The home
   story's ScrollTrigger pin was placed at the top of the page (a black
   screen), and every `Sheet` opened on a scrolled page was misplaced. Fixed
   with `backwards` fill. Rule: never leave a transform on a layout wrapper.
2. **ScrollTrigger turns `pinSpacing` off when the pin's parent is flex**, and
   the page wrapper is flex, so the next section scrolled straight over the
   pinned story. Now explicit `pinSpacing: true`.
3. **Read the last IntersectionObserver entry, not the first.** Creating the
   pin re-parents the section, and the first callback arrived with a stale
   zero-size entry ahead of the real one — the scene never mounted.
4. **`emissiveIntensity` defaults to 1**, so a highlight that set the emissive
   colour to gold rendered the part solid gold. Highlights blend the emissive
   colour instead. Related: three's `computeVertexNormals` zig-zagged across
   the lofted grid's thin, unevenly spaced quads and striped the reflections;
   normals now come from central differences across the grid.

Screenshots under SwiftShader need long settles: GSAP's lag smoothing advances
tweens only 33 ms per slow frame, so an explode "takes" 30 s there.

**Open items**

- Apply migration 0006 to the hosted database: `npm run db:push`, then
  `npm run db:seed` (idempotent). Until then combustion cars render without an
  engine, and the tour's engine stop has no position line.
- Cars without a verified photograph show the silhouette placeholder. Run
  `node scripts/fetch-images.mjs --all --download` on a machine with internet
  access, check every pick by eye, and commit the files in
  `public/images/cars/`.
- Otherwise none blocking. The Supabase publishable key was initially rejected because
  the paste had wrapped and lost its last four characters (`BUNI` arrived on a
  line of its own and looked like a stray token). The corrected key is in
  `.env.local` and is verified working: `/auth/v1/health` returns 200, anon
  SELECT on `car_catalog` returns all 54 rows through PostgREST, and anon
  INSERT is correctly refused with `42501 permission denied`.
