import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { formatEnumLabel, formatNumber, NOT_AVAILABLE } from "@/lib/format";
import { toFinite } from "@/lib/detail/figures";
import { carBuildFromDetail } from "@/lib/car-build";
import {
  blueprintSheet,
  type ShapeRole,
  type SheetDimension,
  type SheetView,
} from "@/lib/blueprint-sheet";
import type { VariantDetail } from "@/types/domain";
import { Reveal } from "@/components/fx/Reveal";
import { DetailHeading } from "./DetailHeading";

/**
 * The blueprint sheet: the car in four orthographic views — side, front, top
 * and rear — at one common scale on a navy drawing grid, with a dimension
 * line for every figure the variant publishes and none for a missing one
 * (lib/blueprint-sheet.ts draws it; this component only paints it).
 *
 * Props:
 *   detail        the variant (body type, engine position, dimensions, parts)
 *   headingLevel  2 when used as a chapter's first block (default 3)
 *
 * Layout: side | front over top | rear in 2fr/1fr columns from md, so every
 * view is at the same scale (each view's width is in proportion to its
 * columns); phones stack side, top, then front and rear side by side, which
 * keeps the one scale too. The grid is 100 mm and 500 mm squares.
 *
 * The line work draws itself in as the sheet scrolls into view: each stroke
 * is dashed along its own length (pathLength 1) and the dash slides in. It
 * is hidden only once the FX runtime is running and before the sheet is
 * shown, and never under reduced motion — without JavaScript, or if the
 * runtime never starts, the drawing is simply there. Strokes are sized in
 * drawing units per breakpoint (--bp-u), because `vector-effect:
 * non-scaling-stroke` disables pathLength dashing in Chromium.
 *
 * Labels are HTML over the SVG at percentage positions, so they stay 11px
 * and crisp at every width. The whole sheet is one role="img" with a
 * summary; the figures table below it is the full text alternative.
 */
export function BlueprintSheet({
  detail,
  headingLevel = 3,
  className,
}: {
  detail: VariantDetail;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const dims = detail.dimensions;
  const build = carBuildFromDetail(detail);
  const sheet = blueprintSheet({
    bodyType: build.bodyType,
    powertrain: build.powertrain,
    enginePosition: build.enginePosition,
    lengthMm: build.length_mm,
    widthMm: build.width_mm,
    heightMm: build.height_mm,
    wheelbaseMm: build.wheelbase_mm,
    groundClearanceMm: build.ground_clearance_mm,
    // The catalogue records no track widths, so none is dimensioned.
    rearWing: build.rearWing,
  });

  const figure = (value: number | null | undefined) => {
    const number = toFinite(value);
    return number !== null && number > 0 ? number : null;
  };
  const lengthMm = figure(dims?.length_mm);
  const widthMm = figure(dims?.width_mm);
  const heightMm = figure(dims?.height_mm);
  const wheelbaseMm = figure(dims?.wheelbase_mm);
  const clearanceMm = figure(dims?.ground_clearance_mm);

  // ------------------------------------------------------------ caption
  const bodyLabel = formatEnumLabel(sheet.bodyType, "").toLowerCase();
  const representation = "A representation, not a manufacturer drawing.";
  const caption =
    sheet.missing.length === 0
      ? "Drawn from published dimensions — a representation, not a manufacturer drawing."
      : sheet.missing.length === 4
        ? `No dimensions published, so it is drawn to typical ${bodyLabel} proportions and carries no dimension lines. ${representation}`
        : `Drawn from published dimensions where they exist; ${joinList(sheet.missing)} ${sheet.missing.length === 1 ? "is" : "are"} not published, so ${sheet.missing.length === 1 ? "it is" : "they are"} drawn to typical ${bodyLabel} proportions with no dimension line. ${representation}`;

  const carName = `${detail.manufacturer.name} ${detail.model.name}`;
  const summary = [
    `Blueprint of the ${carName} as a ${bodyLabel}, in four views — side, front, top and rear — at one scale.`,
    lengthMm !== null && sheet.published.length
      ? `Length ${formatNumber(lengthMm)} mm.`
      : null,
    widthMm !== null && sheet.published.width
      ? `Width ${formatNumber(widthMm)} mm.`
      : null,
    heightMm !== null && sheet.published.height
      ? `Height ${formatNumber(heightMm)} mm.`
      : null,
    wheelbaseMm !== null && sheet.published.wheelbase
      ? `Wheelbase ${formatNumber(wheelbaseMm)} mm.`
      : null,
    clearanceMm !== null && sheet.published.groundClearance
      ? `Ground clearance ${formatNumber(clearanceMm)} mm.`
      : null,
    caption,
  ]
    .filter(Boolean)
    .join(" ");

  const table: { label: string; abbr?: string; value: string | null }[] = [
    { label: "Length", abbr: "L", value: withUnit(lengthMm, "mm") },
    { label: "Width", abbr: "W", value: withUnit(widthMm, "mm") },
    { label: "Height", abbr: "H", value: withUnit(heightMm, "mm") },
    { label: "Wheelbase", abbr: "WB", value: withUnit(wheelbaseMm, "mm") },
    { label: "Ground clearance", abbr: "GC", value: withUnit(clearanceMm, "mm") },
    { label: "Kerb weight", value: withUnit(figure(dims?.kerb_weight_kg), "kg") },
    {
      label: "Seats",
      value:
        figure(dims?.seating_capacity) === null ? null : String(dims?.seating_capacity),
    },
    { label: "Boot", value: withUnit(figure(dims?.boot_capacity_l), "L") },
  ];

  // Stroke widths scale with the drawing, so the scale factor for this car
  // (its sheet width against a typical one) keeps them ~1px everywhere.
  const sheetWidth = sheet.views[0]?.viewBox.width ?? REFERENCE_WIDTH;
  const vars = { "--bp-k": (sheetWidth / REFERENCE_WIDTH).toFixed(3) } as CSSProperties;

  const headingId = "blueprint-sheet-heading";
  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title="Blueprint"
        note="Four views · one scale · millimetres"
      />

      <figure className="mt-10">
        <div
          className={cn(
            "relative p-px hud-panel [--panel-bg:var(--bp-bg)]",
            "[--bp-bg:oklch(0.205_0.047_252)] [--bp-body:oklch(0.235_0.05_250)] [--bp-glass:oklch(0.3_0.062_236)] [--bp-rule:oklch(0.83_0.1_210/22%)] [--bp-tyre:oklch(0.15_0.03_256)]",
          )}
        >
          <span aria-hidden="true" className="hud-brackets [--hud-l:16px]" />
          <Reveal
            variant="fade"
            role="img"
            aria-label={summary}
            className={cn(
              "grid grid-cols-2 gap-px bg-(--bp-rule)",
              "[grid-template-areas:'side_side'_'top_top'_'front_rear']",
              "md:grid-cols-[2fr_1fr] md:[grid-template-areas:'side_front'_'top_rear']",
              STROKE_UNITS,
              DRAW_GATE,
            )}
            style={vars}
          >
            {sheet.views.map((view, index) => (
              <SheetCell key={view.id} view={view} index={index} />
            ))}
          </Reveal>

          <dl className="grid grid-cols-2 gap-px border-t border-(--bp-rule) bg-(--bp-rule) sm:grid-cols-4">
            {table.map((row) => (
              <div key={row.label} className="bg-(--bp-bg) px-3 py-2.5 sm:px-4">
                <dt className="font-mono text-[11px] leading-4 tracking-hud text-ink-300 uppercase">
                  {row.label}
                  {row.abbr ? <span className="text-cyan-300"> · {row.abbr}</span> : null}
                </dt>
                <dd className="mt-1">
                  {row.value === null ? (
                    <span className="text-body-s text-ink-400">{NOT_AVAILABLE}</span>
                  ) : (
                    <span className="text-data text-ink-50">{row.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <figcaption className="mt-3 flex flex-col gap-1 text-caption">
          <span>{caption}</span>
          <span>
            Lamps, grille and mirrors are the body style&apos;s generic shapes, placed as
            on the 3D model.
            {dims?.source?.trim() ? ` Dimensions: ${dims.source.trim()}.` : null}
          </span>
          {dims?.notes?.trim() ? <span>{dims.notes}</span> : null}
        </figcaption>
      </figure>
    </section>
  );
}

/** The side view's width, in millimetres, the stroke units below are tuned for. */
const REFERENCE_WIDTH = 5800;

/**
 * Drawing units per CSS pixel at each breakpoint, for a sheet of the
 * reference width in this page's container: the side view spans the width
 * on phones and two thirds of it from md. Strokes multiply it by a pixel
 * weight, so a 1.3px outline stays within about a quarter of that anywhere.
 */
const STROKE_UNITS =
  "[--bp-u:calc(var(--bp-k)*15)] min-[480px]:[--bp-u:calc(var(--bp-k)*11.5)] sm:[--bp-u:calc(var(--bp-k)*9)] md:[--bp-u:calc(var(--bp-k)*10.5)] lg:[--bp-u:calc(var(--bp-k)*8.3)] xl:[--bp-u:calc(var(--bp-k)*7)]";

/**
 * Hide the strokes (dash slid out) until the sheet is shown — only while the
 * FX runtime runs (html[data-fx]) and only with motion allowed.
 */
const DRAW_GATE =
  "motion-safe:[html[data-fx]_&:not([data-shown])_[data-draw]]:[stroke-dashoffset:1]";

/** A stroke that draws itself in. Used with pathLength={1}. */
const DRAW =
  "[stroke-dasharray:1] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[2200ms] motion-safe:ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-safe:delay-(--bp-delay)";

const W_OUTLINE = "[stroke-width:calc(var(--bp-u)*1.3px)]";
const W_DETAIL = "[stroke-width:calc(var(--bp-u)*0.85px)]";
const W_FINE = "[stroke-width:calc(var(--bp-u)*0.7px)]";

const ROLE_CLASS: Record<ShapeRole, string> = {
  body: cn("fill-(--bp-body) stroke-cyan-100", W_OUTLINE),
  near: cn("fill-(--bp-body) stroke-cyan-100", W_OUTLINE),
  glass: cn("fill-(--bp-glass) stroke-cyan-200/80", W_DETAIL),
  tyre: cn("fill-(--bp-tyre) stroke-cyan-100", W_OUTLINE),
  detail: cn("stroke-cyan-200/75", W_DETAIL),
  hidden: cn(
    "stroke-cyan-300/60 [stroke-dasharray:calc(var(--bp-u)*6px)_calc(var(--bp-u)*4px)]",
    W_FINE,
  ),
  centre: cn(
    "stroke-cyan-300/50 [stroke-dasharray:calc(var(--bp-u)*16px)_calc(var(--bp-u)*4px)_calc(var(--bp-u)*3px)_calc(var(--bp-u)*4px)]",
    W_FINE,
  ),
  ground: cn("stroke-cyan-200/55", W_FINE),
};

const DRAWN: ReadonlySet<ShapeRole> = new Set([
  "body",
  "near",
  "glass",
  "tyre",
  "detail",
]);

function SheetCell({ view, index }: { view: SheetView; index: number }) {
  const { x, y, width, height } = view.viewBox;
  const pct = ([px, py]: readonly [number, number]) => ({
    left: `${(((px - x) / width) * 100).toFixed(3)}%`,
    top: `${(((py - y) / height) * 100).toFixed(3)}%`,
  });
  const marker = `bps-arrow-${view.id}`;
  return (
    <div
      className="min-w-0 bg-(--bp-bg)"
      style={{ gridArea: view.id, "--bp-delay": `${index * 180}ms` } as CSSProperties}
    >
      <p className="flex h-8 items-center justify-between gap-3 px-3 font-mono text-[11px] tracking-hud text-cyan-200 uppercase sm:px-4">
        <span>{view.title}</span>
        <span aria-hidden="true" className="hud-label">
          {String(index + 1).padStart(2, "0")}
        </span>
      </p>
      <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          viewBox={`${x} ${y} ${width} ${height}`}
          className="absolute inset-0 size-full"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              markerUnits="strokeWidth"
              orient="auto-start-reverse"
            >
              <path d="M0 1.6 L10 5 L0 8.4 Z" className="fill-ink-100" />
            </marker>
          </defs>
          <path
            d={view.grid.minor}
            className="stroke-cyan-300/[0.07] [stroke-width:calc(var(--bp-u)*0.6px)] max-sm:hidden"
          />
          <path
            d={view.grid.major}
            className="stroke-cyan-300/[0.16] [stroke-width:calc(var(--bp-u)*0.7px)]"
          />
          {view.shapes.map((shape, i) =>
            DRAWN.has(shape.role) ? (
              <path
                key={i}
                d={shape.d}
                pathLength={1}
                data-draw=""
                className={cn(ROLE_CLASS[shape.role], DRAW)}
              />
            ) : (
              <path key={i} d={shape.d} className={ROLE_CLASS[shape.role]} />
            ),
          )}
          {view.dimensions.map((dimension) => (
            <DimensionLines key={dimension.id} dimension={dimension} marker={marker} />
          ))}
        </svg>

        {view.dimensions.map((dimension) => (
          <span
            key={dimension.id}
            className={cn(
              "absolute flex items-baseline gap-1 bg-(--bp-bg) px-1 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap tabular-nums",
              dimension.placement === "beside"
                ? "translate-x-1.5 -translate-y-1/2"
                : dimension.orientation === "vertical"
                  ? "-translate-x-1/2 -translate-y-1/2 -rotate-90"
                  : "-translate-x-1/2 -translate-y-1/2",
            )}
            style={pct(dimension.label)}
          >
            <span className="text-cyan-300">{dimension.abbr}</span>
            <span className="text-ink-50">{formatNumber(dimension.valueMm)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DimensionLines({
  dimension,
  marker,
}: {
  dimension: SheetDimension;
  marker: string;
}) {
  const { from, to, extensions } = dimension;
  return (
    <g>
      {extensions.map(([a, b], i) => (
        <line
          key={i}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          className="stroke-ink-300/55 [stroke-width:calc(var(--bp-u)*0.7px)]"
        />
      ))}
      <line
        x1={from[0]}
        y1={from[1]}
        x2={to[0]}
        y2={to[1]}
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
        className="stroke-ink-100 [stroke-width:calc(var(--bp-u)*1px)]"
      />
    </g>
  );
}

function withUnit(value: number | null, unit: string): string | null {
  return value === null ? null : `${formatNumber(value)} ${unit}`;
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
