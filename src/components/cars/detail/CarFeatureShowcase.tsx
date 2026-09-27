"use client";

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { CarColor } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  FINISH_LABELS,
  catalogueSwatches,
  configStorageKey,
  defaultConfig,
  finishFromCatalogue,
  normaliseHex,
  resolvePaint,
} from "@/lib/viewer-paint";
import { bodyStyleOf, wheelDefaults } from "@/components/3d/wheel-defaults";
import { useStoredConfig } from "@/components/3d/useViewerStorage";
import type { Silhouette } from "@/components/cars/car-silhouette";
import type { ShowcaseCard } from "./feature-cards";

/**
 * The feature showcase: a carousel of cards built from this variant's own
 * rows (feature-cards.ts) and a picker of the model's sourced paint colours.
 *
 * Carousel: prev/next buttons, one dot per card, swipe on touch, the arrow
 * keys while it has focus. Each card expands in place — a CSS grid-row
 * transition (0fr → 1fr) so the height animates without measuring — to show
 * its detail text and every published figure. Under reduced motion the
 * carousel steps without sliding and the expand is a plain show.
 *
 * Colour picker: only `car_colors` rows (name, hex, finish, source); none
 * means "No published colours recorded", never a stand-in. Picking one
 * writes the same per-car configuration the viewer's configurator writes
 * (useStoredConfig → sessionStorage + change event), so the 3D viewer at
 * the top of the page repaints the moment a swatch is chosen — and the
 * large chip and silhouette here tint with it whether or not the viewer is
 * on screen.
 *
 * Without JavaScript the same HTML reads as a plain list: the `html.js`
 * class gates the track layout and the collapsed state, so every card and
 * its detail is visible and nothing is off-screen.
 */
const subscribeNothing = () => () => {};

/**
 * False in server HTML and during hydration, true once React runs: the
 * carousel only makes off-screen cards inert once it can also move them, so
 * the no-JS list stays fully readable by assistive technology.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

export function CarFeatureShowcase({
  carName,
  cards,
  colors,
  build,
  carbonCeramic,
  silhouette,
  headingId,
  className,
}: {
  /** "Porsche 911 GT3": keys the viewer configuration this writes to. */
  carName: string;
  cards: ShowcaseCard[];
  /** The model's sourced paint colours (car_colors). */
  colors: CarColor[];
  /** The variant's layout, for the same configuration defaults as the viewer. */
  build: CarBuild;
  carbonCeramic: boolean;
  /** The body-style drawing the chosen colour tints. */
  silhouette: Silhouette;
  /** The chapter heading this block is labelled by. */
  headingId: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const hydrated = useHydrated();
  const id = useId();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const count = cards.length;
  const clamp = useCallback(
    (next: number) => (count === 0 ? 0 : (next + count) % count),
    [count],
  );
  const go = useCallback(
    (next: number) => {
      setIndex(clamp(next));
      setExpanded(null);
    },
    [clamp],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(count - 1);
    }
  };

  // Swipe: a mostly horizontal pointer move of 40px or more between down
  // and up. Vertical moves are left to the page's scroll.
  const onPointerDown = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType === "mouse") return;
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLUListElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className={cn("space-y-14 lg:space-y-16", className)}>
      {count > 0 ? (
        <div
          role="group"
          aria-roledescription="carousel"
          aria-labelledby={headingId}
          onKeyDown={onKeyDown}
          className="relative"
        >
          {/* --------------------------------------------- Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p
              aria-live="polite"
              className="font-mono text-[11px] tracking-hud text-ink-400 uppercase tabular-nums"
            >
              <span className="text-cyan-200">{String(index + 1).padStart(2, "0")}</span>
              {" / "}
              {String(count).padStart(2, "0")}
              <span className="sr-only"> cards</span>
            </p>
            <div className="flex items-center gap-2">
              <NavButton label="Previous card" onClick={() => go(index - 1)}>
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </NavButton>
              <NavButton label="Next card" onClick={() => go(index + 1)}>
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </NavButton>
            </div>
          </div>

          {/* ------------------------------------------------ Track */}
          <div className="mt-3 py-2 [html.js_&]:overflow-hidden">
            <ul
              ref={trackRef}
              aria-live="polite"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                swipe.current = null;
              }}
              className={cn(
                "grid touch-pan-y gap-4",
                // JavaScript: a sliding row of full-width cards.
                "[html.js_&]:flex [html.js_&]:[translate:calc(var(--i)*-100%)_0] [html.js_&]:gap-0",
                !reducedMotion &&
                  "[html.js_&]:transition-[translate] [html.js_&]:duration-(--duration-slow) [html.js_&]:ease-spring",
              )}
              style={{ "--i": index } as CSSProperties}
            >
              {cards.map((card, cardIndex) => (
                <li
                  key={card.id}
                  aria-roledescription="slide"
                  aria-label={`${cardIndex + 1} of ${count}: ${card.title}`}
                  // Off-screen cards are inert for the keyboard and AT.
                  inert={hydrated && cardIndex !== index ? true : undefined}
                  className="min-w-0 [html.js_&]:w-full [html.js_&]:shrink-0 [html.js_&]:px-px"
                >
                  <ShowcaseCardView
                    card={card}
                    open={expanded === card.id}
                    onToggle={() =>
                      setExpanded((current) => (current === card.id ? null : card.id))
                    }
                    reducedMotion={reducedMotion}
                    hydrated={hydrated}
                    panelId={`${id}-${card.id}`}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------- Dots */}
          <ol
            aria-label="Choose a card"
            className="mt-5 flex hidden flex-wrap items-center gap-1 [html.js_&]:flex"
          >
            {cards.map((card, cardIndex) => (
              <li key={card.id}>
                <button
                  type="button"
                  aria-label={`Card ${cardIndex + 1}: ${card.title}`}
                  aria-current={cardIndex === index ? "true" : undefined}
                  onClick={() => go(cardIndex)}
                  className="group grid size-11 place-items-center sm:size-9"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1 transition-[width,background-color,box-shadow] duration-(--duration-normal)",
                      cardIndex === index
                        ? "w-7 bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]"
                        : "w-2.5 bg-ink-600 group-hover:bg-ink-300",
                    )}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-body-s text-ink-400">
          No features or published figures are catalogued for this car yet.
        </p>
      )}

      <ColourPicker
        carName={carName}
        colors={colors}
        build={build}
        carbonCeramic={carbonCeramic}
        silhouette={silhouette}
      />
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid hidden size-11 place-items-center border border-line text-ink-200 transition-[color,border-color,box-shadow] duration-(--duration-fast) hover:border-cyan-400/70 hover:text-cyan-200 hover:glow-cyan [html.js_&]:grid"
    >
      {children}
    </button>
  );
}

/**
 * One card: HUD panel with a mono eyebrow, the title, the collapsed line,
 * and an expand control that reveals the detail text and the figures. Under
 * no-JS the panel is always open (the collapsed row height is gated on
 * `html.js`).
 */
function ShowcaseCardView({
  card,
  open,
  onToggle,
  reducedMotion,
  hydrated,
  panelId,
}: {
  card: ShowcaseCard;
  open: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
  hydrated: boolean;
  panelId: string;
}) {
  const expandable = card.detail !== null || card.figures.length > 0;
  return (
    <article className="relative h-full rounded-card p-5 hud-panel sm:p-7">
      <span aria-hidden="true" className="hud-brackets -m-px" />
      <span
        aria-hidden="true"
        className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
      >
        {card.kind === "highlight" ? "Data // " : "Feature // "}
        {card.eyebrow}
      </span>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-hud text-cyan-200 uppercase">
            {card.eyebrow}
          </p>
          <h3 className="mt-2 text-h3">{card.title}</h3>
          {card.summary ? (
            <p className="mt-2 text-body-s text-ink-200">{card.summary}</p>
          ) : null}
        </div>
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="hidden inline-flex min-h-11 items-center gap-2 border border-line px-4 font-mono text-[11px] tracking-hud text-ink-100 uppercase transition-[color,border-color,box-shadow] duration-(--duration-fast) hover:border-cyan-400/70 hover:text-cyan-200 hover:glow-cyan [html.js_&]:inline-flex"
          >
            {open ? "Less" : "Details"}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform duration-(--duration-normal)",
                open && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>

      {expandable ? (
        <div
          id={panelId}
          // The grid-row trick: 0fr → 1fr animates to the content's height.
          className={cn(
            "grid",
            !reducedMotion &&
              "transition-[grid-template-rows,opacity] duration-(--duration-slow) ease-spring",
            open
              ? "[grid-template-rows:1fr] opacity-100"
              : "[grid-template-rows:1fr] [html.js_&]:[grid-template-rows:0fr] [html.js_&]:opacity-0",
          )}
          inert={hydrated && !open ? true : undefined}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-6">
              {card.detail ? (
                <p className="max-w-[64ch] text-body-s text-ink-300">{card.detail}</p>
              ) : null}
              {card.figures.length > 0 ? (
                <dl
                  className={cn(
                    "grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line-subtle pt-5 sm:grid-cols-3",
                    card.detail && "mt-5",
                  )}
                >
                  {card.figures.map((entry) => (
                    <div key={entry.label} className="min-w-0">
                      <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
                        {entry.label}
                      </dt>
                      <dd className="mt-1 text-data text-ink-50 glow-text">
                        {entry.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * The model's sourced paint colours. The selection is the viewer's own
 * per-car configuration, so the swatch chosen here is the paint on the 3D
 * car above, and vice versa.
 */
function ColourPicker({
  carName,
  colors,
  build,
  carbonCeramic,
  silhouette,
}: {
  carName: string;
  colors: CarColor[];
  build: CarBuild;
  carbonCeramic: boolean;
  silhouette: Silhouette;
}) {
  const wheels = useMemo(() => wheelDefaults(bodyStyleOf(build)), [build]);
  const defaults = useMemo(
    () =>
      defaultConfig({
        colors,
        wheelStyle: wheels.style,
        wheelFinish: wheels.finish,
        carbonCeramic,
      }),
    [colors, wheels, carbonCeramic],
  );
  const [config, setConfig] = useStoredConfig(
    configStorageKey(carName),
    defaults,
    colors,
  );
  const swatches = useMemo(() => catalogueSwatches(colors), [colors]);
  const paint = resolvePaint(config.paint, colors);
  const chosen = paint.source === "catalogue" ? paint : null;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingId = useId();

  const choose = (colorId: string) =>
    setConfig({ ...config, paint: { source: "catalogue", id: colorId } });

  const move = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = position + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = position - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = swatches.length - 1;
    else return;
    event.preventDefault();
    // The carousel's own arrow handling must not also fire.
    event.stopPropagation();
    const target = (next + swatches.length) % swatches.length;
    const swatch = swatches[target];
    if (!swatch) return;
    choose(swatch.id);
    refs.current[target]?.focus();
  };

  const tint = chosen ? chosen.hex : null;

  return (
    <section
      aria-labelledby={headingId}
      className="relative rounded-card p-5 hud-panel sm:p-7"
    >
      <span
        aria-hidden="true"
        className="hud-brackets -m-px [--hud-c:var(--color-gold-400)]"
      />
      <span
        aria-hidden="true"
        className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
      >
        Paint // Catalogued colours
      </span>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <h3 id={headingId} className="text-h3">
            Colours
          </h3>
          {swatches.length > 0 ? (
            <>
              <p className="mt-2 max-w-[52ch] text-body-s text-ink-300">
                {swatches.length} published {swatches.length === 1 ? "colour" : "colours"}{" "}
                recorded for the {carName}, each with its source. Choose one and the 3D
                viewer repaints.
              </p>
              <ul
                role="radiogroup"
                aria-label="Catalogued colours"
                className="mt-6 flex flex-wrap gap-2"
              >
                {swatches.map((color, position) => {
                  const hex = normaliseHex(color.hex) ?? "#888888";
                  const checked = chosen?.color?.id === color.id;
                  return (
                    <li key={color.id}>
                      <button
                        ref={(node) => {
                          refs.current[position] = node;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={`${color.name}, ${FINISH_LABELS[finishFromCatalogue(color.finish)].toLowerCase()}`}
                        tabIndex={checked || (!chosen && position === 0) ? 0 : -1}
                        onClick={() => choose(color.id)}
                        onKeyDown={(event) => move(event, position)}
                        className={cn(
                          "grid size-11 place-items-center rounded-full transition-[box-shadow,scale] duration-(--duration-fast)",
                          checked
                            ? "scale-105 shadow-[0_0_0_1px_var(--color-cyan-300),0_0_14px_var(--color-cyan-400)]"
                            : "hover:shadow-[0_0_0_1px_var(--color-line-strong)]",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="size-8 rounded-full border border-line-strong"
                          style={{
                            background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.5), transparent 46%), ${hex}`,
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[12px] tracking-[0.06em]">
                <dt className="text-ink-400 uppercase">Colour</dt>
                <dd className="text-ink-50">
                  {chosen ? chosen.name : "Studio finish (no catalogued colour chosen)"}
                </dd>
                <dt className="text-ink-400 uppercase">Finish</dt>
                <dd className="text-ink-50">{FINISH_LABELS[paint.finish]}</dd>
                {chosen?.color ? (
                  <>
                    <dt className="text-ink-400 uppercase">Source</dt>
                    <dd className="text-ink-200">
                      {chosen.color.source_url ? (
                        <a
                          href={chosen.color.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 fx-link text-cyan-200"
                        >
                          {chosen.color.source}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </a>
                      ) : (
                        chosen.color.source
                      )}
                    </dd>
                  </>
                ) : null}
              </dl>
              <a
                href="#explore-3d"
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 fx-link font-mono text-[11px] tracking-hud text-cyan-200 uppercase"
              >
                See it on the 3D car
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </>
          ) : (
            <p className="mt-2 max-w-[52ch] text-body-s text-ink-300">
              No published colours recorded for the {carName}. The 3D viewer shows AURIX
              studio finishes, labelled as such.
            </p>
          )}
        </div>

        {/* The chip and silhouette, tinted with the chosen paint. */}
        <div className="relative isolate overflow-hidden rounded-card border border-line-subtle bg-void/60 tech-grid p-6">
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -z-10 size-72 -translate-1/2 rounded-full opacity-40 blur-3xl transition-[background-color] duration-(--duration-slow)"
            style={{ backgroundColor: tint ?? "transparent" }}
          />
          <TintedSilhouette shape={silhouette} tint={tint} />
          <p className="mt-4 text-center font-mono text-[10px] tracking-hud text-ink-500 uppercase">
            {tint
              ? `${chosen?.name ?? "Colour"} · ${tint}`
              : "Body-style drawing, not a likeness"}
          </p>
        </div>
      </div>
    </section>
  );
}

/** The body-style drawing with its panel filled in the chosen colour. */
function TintedSilhouette({ shape, tint }: { shape: Silhouette; tint: string | null }) {
  return (
    <svg
      viewBox={shape.viewBox}
      className="mx-auto h-auto w-full max-w-md overflow-visible"
      aria-hidden="true"
      fill="none"
      style={{ filter: tint ? `drop-shadow(0 0 18px ${tint}88)` : undefined }}
    >
      <path
        d={shape.body}
        className={cn(
          "stroke-ink-400 transition-[fill] duration-(--duration-slow)",
          !tint && "fill-surface-3/70",
        )}
        style={tint ? { fill: tint } : undefined}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {shape.glass ? <path d={shape.glass} className="fill-void/70" /> : null}
      {shape.wheels.map((wheel) => (
        <g key={wheel.cx}>
          <circle
            cx={wheel.cx}
            cy={wheel.cy}
            r={wheel.r}
            className="fill-void stroke-ink-500"
            strokeWidth={2}
          />
          <circle
            cx={wheel.cx}
            cy={wheel.cy}
            r={wheel.r * 0.62}
            className="stroke-cyan-400/60"
            strokeWidth={1.5}
          />
        </g>
      ))}
    </svg>
  );
}
