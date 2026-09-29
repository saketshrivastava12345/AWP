# AURIX design system — futuristic HUD tokens and motion kit

The earlier component APIs (Button, Badge, StatCard, SubNav, …) are unchanged; they are restyled.
This file lists what is NEW or CHANGED. Source of truth: `src/app/globals.css`,
`src/components/fx/*`, `src/components/ui/*`.

## 0. Architecture (read this first)

- **Every fx component is a SERVER component** (no "use client") that renders data
  attributes / classes. ONE client component, `FxRuntime` (already mounted in
  `app/layout.tsx`), drives them all: a shared IntersectionObserver, one delegated
  pointermove (rAF-coalesced), a MutationObserver for streamed/new content.
  => Use them freely in server pages, pass `as={Link}`, pass server children.
  => They also work inside client components.
- Hidden initial states (Reveal) exist only under `html.js` (set by the boot script
  before paint) AND `prefers-reduced-motion: no-preference`. No-JS / reduced-motion
  users see everything immediately. A 3s CSS failsafe reveals content if the runtime
  never mounts.
- Reduced motion: runtime shows everything, no count-up, scramble, tilt, magnet,
  parallax, cursor glow; CSS backstop kills animations.
- Ambient loops (the infinite `animate-*` below, the marquee, `fx-glitch`) run only while
  on screen and while the tab is visible: the runtime pauses them otherwise. Every running
  loop keeps the browser producing frames, and a page carries dozens, mostly out of view.
- **Lite mode** (`html.fx-lite`, `src/components/fx/fx-lite.ts`): set before first paint for
  ≤4 cores, ≤4 GiB memory or Data Saver, and by the runtime when frames are slow at rest
  after load (remembered for the session). The look stays, standing still: ambient loops
  are removed, beams / glitch / cursor glow hidden, spotlights rest. Entrances, reveals,
  count-ups, tilt, magnet, marquee and loaders are unchanged. `localStorage["aurix-fx"]`
  = `"full"` or `"lite"` overrides detection (handy for testing either look).
- New ambient animations must animate only `transform`/`opacity` (a painted property —
  `background-position`, `stroke-dashoffset`, `box-shadow`, `filter` — repaints every
  frame) and belong in the runtime's `AMBIENT` list and the `html.fx-lite` rule.

## 1. Tokens (globals.css `@theme`)

| Kind                         | Classes                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Grounds                      | `bg-void` #04060b, `bg-surface-1..4` (cold blue-grey)                                                           |
| Cyan (primary tech glow)     | `cyan-100..900` (custom sRGB; `cyan-300/400` are the workhorses). Text: `text-cyan-200/300` pass AA anywhere    |
| Gold (brand)                 | `gold-200..800` — wordmark, "best"/premium markers                                                              |
| Violet / magenta (sparingly) | `violet-300..600`, `magenta-400/500`                                                                            |
| Ink                          | `ink-50..600` cool-tinted; ink-400/500 ≥ 4.5:1 up to surface-3; ink-600 decorative only                         |
| Lines                        | `border-line-subtle`, `border-line`, `border-line-strong`, `--color-line-glow` (cyan 45%)                       |
| Signals (saturated now)      | `signal-positive` green, `signal-negative` rose, `signal-electric` sky, `signal-hybrid` violet                  |
| Glow shadows                 | `shadow-glow-cyan`, `shadow-glow-gold`, `shadow-glow-violet` (theme) — also `glow-cyan/gold/violet` utilities   |
| Motion                       | `ease-spring` (new), `duration-(--duration-slow)` 700ms (new) + existing                                        |
| Tracking                     | `tracking-hud` .12em, `tracking-wide-hud` .22em, `tracking-label` .14em, `tracking-button` .08em                |
| Fonts                        | `font-hud` (= `font-brand`) Michroma; `font-display` Inter Tight; `font-sans` Inter; `font-mono` JetBrains Mono |

The body has a fixed cold radial glow (top) + violet wash (bottom) — pages sit on it;
don't paint full-page `bg-void` over it unless you want flat black.

## 2. Type (same class names, new look)

- `text-display-xl`, `text-display-l`, `text-h1`, `text-h2` → **Michroma** (wide, techy),
  sizes tuned so "Manufacturers" fits 350px. Sentence case. Still `text-ink-*` overridable.
- `text-h3`, `text-h4` → Inter Tight 500 (card titles, long headings).
- `text-figure-xl`, `text-figure` → Michroma tabular (telemetry numbers).
- `text-eyebrow` → **JetBrains Mono, uppercase, 0.2em, cyan-300**. One per section.
- `text-label` → mono uppercase 12px ink-400; `text-hud` → mono uppercase 11px ink-400 (IDs, codes).
- `text-data`, `text-lead`, `text-body`, `text-body-s`, `text-caption` unchanged in role.
- cn() knows all of these plus `glow-text*`, `gradient-text*`, `glow-*`, `shadow-glow-*`.

## 3. New utilities (globals.css)

Text & glow

- `gradient-text` (white → cyan), `gradient-text-aurora` (cyan → violet), `gold-gradient-text` (brand).
  Put on the heading/span; AA judged on darkest stop (all pass).
- `glow-text` (soft white/cyan halo — big numbers), `glow-text-cyan`, `glow-text-gold`. Never on body copy.
- `glow-cyan` / `glow-gold` / `glow-violet` = box-shadow glows (emphasis/active states).

Surfaces / HUD

- `hud-panel` — glass ground + gradient luminous border (cyan→hairline→violet). Tune with
  `[--panel-bg:…]` / `[--panel-edge:linear-gradient(…)]`. **Don't combine with `bg-*`** (it sets `background`).
- `hud-brackets` — absolutely-positioned corner-bracket layer (`relative` parent; color `[--hud-c:…]`,
  arm `[--hud-l:14px]`). `hud-corners` = legacy background version (viewer).
- `hud-label` — tiny mono decorative label (10px, .22em, cyan/70). **Always `aria-hidden`.**
- `hud-rule` — 1px cyan → transparent rule (`<hr className="hud-rule" />` or a div).
- `hud-ticks` — ruler tick marks along the bottom edge of an element.
- `hud-segments` — masks a bar fill into 6px segments (telemetry bars): `<div className="h-1.5 bg-cyan-400 hud-segments" style={{width:"72%"}}/>`.
- `chamfer`, `chamfer-sm`, `chamfer-lg` — clip-path cut corners (TL + BR), size `[--chamfer:16px]`.
  **clip-path clips outlines/shadows: never chamfer a focusable element or anything with a focus ring;
  chamfer an inner decorative layer instead.**
- `glass` (tinted blur + hairline), `edge-light` (cyan top glint), `tech-grid`, `scanlines`, `grain` — restyled.
- `fx-link` — animated underline growing from the left on hover/focus (for inline text links).
- `fx-card` — interactive card: lift 3px, cyan border + glow, spotlight `::after` following the pointer
  (add `data-spotlight` on the same element so the runtime writes `--mx/--my`). Uses `::after` + `translate`.

Animations (all stop under reduced motion; the infinite ones pause off screen and stand
still in lite mode)

- `animate-grid-drift` (a `translateY` of one cell on GridBackground's oversized sheet — use it
  through `<GridBackground>`, not on a bare element; vars `--grid-size`, `--grid-speed`), `animate-scan-beam`
  (translateY sweep; parent `overflow-hidden`), `animate-pulse-glow` (2.4s breathing, status dots),
  `animate-blink` (1Hz caret), `animate-spin-slow` (18s, rings), `animate-float`, `animate-orb-drift`,
  `animate-hud-dash` (SVG stroke-dashoffset; set `stroke-dasharray`), `animate-flow` (existing),
  `animate-rise-in`, `animate-panel-in*`, `animate-overlay-in` (existing, `backwards` fill).
- `fx-glitch` + `data-text="Same text"` — periodic chromatic-split glitch (404/error only).
- `animate-route-in` — opacity-only route fade (template.tsx uses it).

## 4. Motion kit — `@/components/fx` (barrel) or `@/components/fx/<Name>`

```tsx
import {
  Reveal,
  ScrambleText,
  CountUp,
  TiltCard,
  Magnetic,
  Parallax,
  Marquee,
  GridBackground,
  Scanlines,
  GlowOrbs,
  Spotlight,
  HudFrame,
} from "@/components/fx";
```

**Reveal** — `<Reveal as? variant?="rise"|"fade"|"clip"|"scale"|"blur" delay?={ms} stagger?={true|ms} once?={true}>`

```tsx
<Reveal as="section" variant="rise">…</Reveal>
<Reveal as="ul" stagger className="grid grid-cols-3 gap-6">{cards.map(c => <li key…>…</li>)}</Reveal>
<Reveal variant="clip" delay={150}><h2 className="text-h2">…</h2></Reveal>
```

- `stagger` animates DIRECT children (13+ share the last delay). Extra props pass through (id, aria-*).
- The Reveal element transitions opacity/transform/filter until it settles (`data-settled` ~1s after).
  ⚠ Never make a sticky/fixed element, or an ancestor of one (SubNav, CarShowcase stage, HeroStory pin),
  a Reveal. Don't put hover-transition classes on the Reveal element itself — put them on a child.
- Don't Reveal the LCP hero headline on first paint for SEO/LCP reasons? It's fine (text is in HTML),
  but prefer `ScrambleText` or CSS `animate-rise-in` for above-the-fold heroes.

**ScrambleText** — `<ScrambleText text="Top speed" as?="span" trigger?="view"|"hover"|"both" duration?={ms} />`

```tsx
<h1 className="text-display-l"><ScrambleText text={model.name} /></h1>
<ButtonLink href="/cars"><ScrambleText text="Explore" trigger="hover" /></ButtonLink>
```

- `text` must be a plain string. Real text stays in flow and is the accessible text; glyphs are an
  aria-hidden overlay (cyan-200; override `[--fx-scramble-color:…]`). Renders `inline-block`.
- `trigger="hover"` also fires when the enclosing `a`/`button` is hovered or focused.

**CountUp** — `<CountUp value={string|number|null} decimals? duration? className? />`

```tsx
<CountUp value={formatNumber(car.power_hp)} />; // preferred: pass the site's formatted string
{
  power == null ? NOT_AVAILABLE : <CountUp value={power} />;
}
```

- SSR/rest = the real value (exact string you passed). null/undefined → renders nothing (caller shows
  "Not available"/"—"). A string with no digits renders as-is. Keeps prefix/suffix/decimals/grouping
  (incl. Indian 1,23,456). Never feed it an approximated number.

**StatCard** (ui) gained `countUp?: boolean` and `tone?: "cyan"|"gold"`:
`<StatRow><StatCard label="Power" value="1,020" unit="hp" countUp /><StatCard label="Top speed" value={null} /></StatRow>`
Look: lit tick above, glowing Michroma figure, mono uppercase label, cyan unit.

**TiltCard** — `<TiltCard as?={Link|"article"|…} max?={6} glare?={true} className …rest>`

```tsx
<TiltCard
  as={Link}
  href={href}
  className="block rounded-card border border-line bg-surface-1"
>
  …
</TiltCard>
```

- Sets `--rx/--ry/--mx/--my` while hovered (mouse only), removes the transform on leave. Adds `relative`
  and a glare span. ⚠ Don't combine with Reveal on the same element (wrap: `<Reveal><TiltCard/></Reveal>`,
  or put TiltCards inside a `<Reveal stagger>` list as the li's child).

**Magnetic** — `<Magnetic strength?={0.3}>{button}</Magnetic>`; or simply `<Button magnetic>` /
`<ButtonLink magnetic>` (built-in). Use for 1–2 hero CTAs per page, not every button.

**Parallax** — `<Parallax speed={-0.2} as? className>` translate by scroll. Decorative layers/images only
(⚠ `translate` = containing block; never around sticky/fixed content).

**Marquee** — `<Marquee speed?={40} gap?="3rem" reverse? controls?={true} label="brands">{items}</Marquee>`

- Children are the items (rendered twice; copy is aria-hidden + inert). Pauses on hover/focus; a small
  keyboard-reachable pause toggle appears on hover/focus. Reduced motion → static scroller.
- ⚠ Data honesty: only pass items that came from a query/prop; otherwise decorative non-data words.

**Backgrounds** (aria-hidden, pointer-events none, `absolute inset-0 -z-10` — put inside a
`relative isolate` section, content above it):

- `<GridBackground variant?="flat"|"floor" size?={48} animated? />` — flat grid fading at edges, or a
  perspective floor grid with a horizon glow (heroes).
- `<Scanlines beam? />` — faint scan lines (+ a slow sweeping beam; parent `overflow-hidden`).
- `<GlowOrbs tone?="cyan-violet"|"cyan"|"gold" />` — large soft drifting glows behind heroes.
- `<Spotlight size? color? rest?="50% 0%" />` — pointer-following light; put `data-spotlight` on the
  section element.

```tsx
<section data-spotlight className="relative isolate overflow-hidden">
  <GlowOrbs />
  <GridBackground variant="floor" />
  <Scanlines />
  <Spotlight />
  <Container className="relative">…</Container>
</section>
```

**HudFrame** — `<HudFrame as? label?="DATA // SPEC" code?="01" tone?="cyan"|"gold"|"violet" padded?={true} brackets?={true}>`

- hud-panel + corner brackets + decorative top-edge label (aria-hidden — never the only place info lives;
  put a real heading inside). Label background is `bg-void`; on other grounds pass `className` tweaks.

## 5. Restyled ui primitives (same APIs)

- **Button / ButtonLink / buttonClasses**: chamfered HUD plates (Michroma uppercase, tracked). primary =
  cyan plate + glow; secondary = cyan-edged dark plate; ghost; danger; hover light-sweep. Sizes unchanged
  (sm is a 44px box with a 40px plate). New prop `magnetic`. `variant="link"`: Inter, cyan arrow, growing
  underline. ⚠ The plate is drawn by `::before/::after` of `.fx-btn` — do NOT pass `bg-*`/`border-*` to
  change a button's colour (it won't show); for a custom plate set `[--btn-edge:…] [--btn-fill:…]`.
  Don't use `before:`/`after:` utilities on non-link buttons.
- **Badge**: mono uppercase chip, tinted edge + glowing dot per tone (label still sentence case in source).
- **SectionHeading**: cyan mono eyebrow with a lit tick; new `scramble?: boolean` (string titles) and
  `code?: string` (decorative "// 01").
- **GlassCard**: tinted panel with hairline border; `interactive` → `fx-card` + spotlight; new
  `brackets?: boolean`.
- **EmptyState**: HUD panel with brackets, cyan glowing icon.
- **SubNav**: glass bar with a cyan glint line; mono uppercase items; active = cyan glowing underline.
- IconButton pressed/hover, Switch, SegmentedControl active, Field/Select focus, Progress, Tooltip,
  Toast, Kbd, Breadcrumbs (mono uppercase), Dialog (cyan-edged glass) → cyan accents.
- Focus ring everywhere: 2px `cyan-300` outline, offset 2.

Chrome (FX1-owned, for reference): navbar = mono uppercase links, sliding glowing cyan rule + light beam,
glass on scroll with a cyan glint, page-wide glowing ScrollProgress on its bottom edge; wordmark decodes on
hover; mobile menu = numbered Michroma rows sliding in over a grid + scan beam; footer = ticker marquee
(non-data words) + grid; palette = cyan-edged HUD with brackets; loading screen = boot sequence (ring
gauge, segmented bar, boot log tied to the real readiness signals); route change = cyan scan line + fade;
404/error = glitching outline code over floor grid.

## 6. Traps (must not regress)

1. No-JS: never hide text unconditionally. Use Reveal (gated) or CSS animations with `backwards` fill.
2. Never leave a transform/filter/translate/perspective/contain/will-change on an ancestor of
   sticky/fixed content (SubNav, CarShowcase stage, HeroStory pin, Sheets). Reveal, TiltCard, Parallax,
   Magnetic, fx-card all apply transforms — keep them on leaf-ish content.
3. Hydration: no Math.random/Date.now in render. The fx kit only randomises after mount.
4. `animation-fill-mode: forwards/both` with transforms on wrappers is banned (CLAUDE.md bug 1).
5. AA: glow never counts toward contrast; check the base colour. Cyan-200/300 and ink-400+ are safe on
   every surface. `ink-600` / `hud-label` are decorative only (aria-hidden).
6. Flashing: nothing faster than ~1Hz; `fx-glitch` is a 4s cycle burst of colour offsets — 404/error only.
7. Data honesty: CountUp/Marquee never invent or approximate; null stays "Not available"/"—".
8. cn(): new text-_/shadow-_/bg-* custom names must be registered in `src/lib/utils.ts` (FX1 owns it —
   ask FX1/main rather than editing). Already registered: everything in this file.
9. Performance: backgrounds are CSS; don't add canvases or per-element listeners — use the data
   attributes (`data-tilt`, `data-spotlight`, `data-magnetic`, `data-parallax`) or the components.
10. One h1 per page. Decorative layers `aria-hidden`. 44px targets.
11. Selective hydration: the runtime may write attributes/styles (`data-shown`, `--mx`, `translate`) to
    server HTML before that Suspense boundary hydrates. All fx components and GlassCard/Button already
    carry `suppressHydrationWarning`. If YOU put `data-spotlight` / `data-tilt` / `data-magnetic` /
    `data-parallax` / `data-reveal` directly on your own element, add `suppressHydrationWarning` to it too.
12. No-JS can only be judged on a production build (dev streams everything behind JS). The reveal gating
    is verified: without `html.js` everything is visible; with JS but no runtime, a 3s failsafe shows it.
