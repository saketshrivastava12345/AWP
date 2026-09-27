import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatEnumLabel, formatNumber, NOT_AVAILABLE } from "@/lib/format";
import { drawingGeometry, pathFrom, type Point } from "@/lib/detail/drawing";
import { toFinite } from "@/lib/detail/figures";
import { vehicleCode } from "@/lib/detail/vehicle";
import { powertrainKind, type VariantDetail } from "@/types/domain";
import { DetailHeading } from "./DetailHeading";

/**
 * A dimensioned technical drawing: side elevation over plan view, sharing one
 * horizontal scale, drawn at the car's published size (lib/detail/drawing.ts).
 *
 * Props:
 *   detail        the variant (body type, engine position, dimensions)
 *   headingLevel  2 when used as a chapter's first block (default 3)
 *
 * A dimension line is drawn ONLY for a published figure and is labelled with
 * that figure; nothing is ever labelled with an assumed number. Where length
 * or height is not recorded, the body is drawn at its style's typical
 * proportions and the caption says so. Labels are HTML laid over the SVG at
 * percentage positions, so they stay 10–11px and crisp from 375px to 1920px
 * while the linework scales. The drawing is role="img" with a summary; the
 * table beside it is the full text alternative.
 */
export function DimensionDrawing({
  detail,
  headingLevel = 3,
  className,
}: {
  detail: VariantDetail;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const dims = detail.dimensions;
  const geometry = drawingGeometry({
    bodyType: detail.model.body_type,
    powertrain: powertrainKind(detail.variant.fuel_type),
    enginePosition: detail.model.engine_position,
    lengthMm: dims?.length_mm ?? null,
    widthMm: dims?.width_mm ?? null,
    heightMm: dims?.height_mm ?? null,
    wheelbaseMm: dims?.wheelbase_mm ?? null,
    groundClearanceMm: dims?.ground_clearance_mm ?? null,
  });
  const { published, length: L, height: H, width: W, side, plan } = geometry;
  const bodyLabel = formatEnumLabel(geometry.bodyType, "").toLowerCase();

  // ------------------------------------------------------------------ layout
  const pad = 0.045 * L;
  const rowGap = 0.075 * L;
  const dimX = L + 0.075 * L;
  const originX = pad + 0.02 * L;
  const sideTop = pad + 0.06 * L;
  const ground = sideTop + H;
  const rows: ("wheelbase" | "length")[] = [];
  if (published.wheelbase) rows.push("wheelbase");
  if (published.length) rows.push("length");
  const rowY = (row: "wheelbase" | "length") => ground + (rows.indexOf(row) + 1) * rowGap;
  const planTop = ground + Math.max(rows.length, 0.6) * rowGap + 0.11 * L;
  const planCentre = planTop + W / 2;
  const totalW = originX + dimX + 0.05 * L + pad;
  const totalH = planCentre + W / 2 + pad;

  const sx = (x: number) => originX + x;
  const sideXY = ([x, y]: Point): Point => [sx(x), ground - y];
  const planXY = ([x, y]: Point): Point => [sx(x), planCentre - y];

  const arrow = 0.016 * L;
  const arrowHalf = 0.0055 * L;
  const pct = (x: number, y: number) => ({
    left: `${((x / totalW) * 100).toFixed(3)}%`,
    top: `${((y / totalH) * 100).toFixed(3)}%`,
  });

  // --------------------------------------------------------------- figures
  const figure = (value: number | null | undefined) => toFinite(value);
  const lengthMm = figure(dims?.length_mm);
  const widthMm = figure(dims?.width_mm);
  const heightMm = figure(dims?.height_mm);
  const wheelbaseMm = figure(dims?.wheelbase_mm);
  const clearanceMm = figure(dims?.ground_clearance_mm);

  const labels: {
    key: string;
    x: number;
    y: number;
    placement: "on-line" | "on-line-vertical" | "right";
    abbr: string;
    value: number;
  }[] = [];
  const dimLines: ReactNode[] = [];

  const horizontalDim = (
    key: string,
    x1: number,
    x2: number,
    y: number,
    abbr: string,
    value: number,
  ) => {
    dimLines.push(
      <g key={key}>
        <line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          className="stroke-gold-500/80"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M${x1} ${y} l${arrow} ${-arrowHalf} v${arrowHalf * 2} Z M${x2} ${y} l${-arrow} ${-arrowHalf} v${arrowHalf * 2} Z`}
          className="fill-gold-500"
        />
      </g>,
    );
    labels.push({ key, x: (x1 + x2) / 2, y, placement: "on-line", abbr, value });
  };

  const verticalDim = (
    key: string,
    x: number,
    y1: number,
    y2: number,
    abbr: string,
    value: number,
    labelPlacement: "on-line-vertical" | "right" = "on-line-vertical",
  ) => {
    // A span too short for two arrowheads gets them outside, pointing in —
    // the drafting convention for small dimensions.
    const outside = y2 - y1 < arrow * 2.5;
    const heads = outside
      ? `M${x} ${y1} l${-arrowHalf} ${-arrow} h${arrowHalf * 2} Z M${x} ${y2} l${-arrowHalf} ${arrow} h${arrowHalf * 2} Z`
      : `M${x} ${y1} l${-arrowHalf} ${arrow} h${arrowHalf * 2} Z M${x} ${y2} l${-arrowHalf} ${-arrow} h${arrowHalf * 2} Z`;
    dimLines.push(
      <g key={key}>
        <line
          x1={x}
          y1={outside ? y1 - arrow * 1.8 : y1}
          x2={x}
          y2={outside ? y2 + arrow * 1.8 : y2}
          className="stroke-gold-500/80"
          vectorEffect="non-scaling-stroke"
        />
        <path d={heads} className="fill-gold-500" />
      </g>,
    );
    labels.push({ key, x, y: (y1 + y2) / 2, placement: labelPlacement, abbr, value });
  };

  const extension = (key: string, x1: number, y1: number, x2: number, y2: number) => (
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className="stroke-ink-500/70"
      strokeWidth={0.75}
      vectorEffect="non-scaling-stroke"
    />
  );
  const extensions: ReactNode[] = [];
  const overshoot = 0.018 * L;
  const gap = 0.012 * L;

  if (published.length && lengthMm !== null) {
    const y = rowY("length");
    extensions.push(extension("ext-l0", sx(0), ground + gap, sx(0), y + overshoot));
    extensions.push(extension("ext-l1", sx(L), ground + gap, sx(L), y + overshoot));
    horizontalDim("length", sx(0), sx(L), y, "L", lengthMm);
  }
  if (published.wheelbase && wheelbaseMm !== null) {
    const y = rowY("wheelbase");
    horizontalDim(
      "wheelbase",
      sx(side.rearAxleX),
      sx(side.frontAxleX),
      y,
      "WB",
      wheelbaseMm,
    );
  }
  // Extension lines leave the drawing at the feature they measure: the roof's
  // highest point for height, the body's widest point for width.
  const roofX = highest(side.body)[0];
  const widestX = highest(plan.outline)[0];

  if (published.height && heightMm !== null) {
    extensions.push(
      extension("ext-h0", sx(L) + gap, ground, dimX + originX + overshoot, ground),
    );
    extensions.push(
      extension(
        "ext-h1",
        sx(roofX) + gap,
        ground - H,
        dimX + originX + overshoot,
        ground - H,
      ),
    );
    verticalDim("height", originX + dimX, ground - H, ground, "H", heightMm);
  }
  if (published.width && widthMm !== null) {
    for (const [key, y] of [
      ["ext-w0", planCentre - W / 2],
      ["ext-w1", planCentre + W / 2],
    ] as const) {
      extensions.push(
        extension(key, sx(widestX) + gap, y, dimX + originX + overshoot, y),
      );
    }
    verticalDim(
      "width",
      originX + dimX,
      planCentre - W / 2,
      planCentre + W / 2,
      "W",
      widthMm,
    );
  }
  if (published.groundClearance && clearanceMm !== null) {
    const x = sx(side.rearAxleX + (side.frontAxleX - side.rearAxleX) * 0.3);
    verticalDim(
      "clearance",
      x,
      ground - geometry.groundClearance,
      ground,
      "GC",
      clearanceMm,
      "right",
    );
  }

  // Axle centre lines run from above the wheel, through the ground, down to
  // the wheelbase line (or just below the ground when it is not drawn), and
  // again across the plan view.
  const centreBottom = published.wheelbase
    ? rowY("wheelbase") + overshoot
    : ground + gap * 2;
  const wheelTop = (side.wheels[0]?.r ?? 0) * 2 + 0.03 * L;

  // --------------------------------------------------------------- caption
  const missing = [
    !published.length && "length",
    !published.height && "height",
    !published.width && "width",
    !published.wheelbase && "wheelbase",
  ].filter((entry): entry is string => Boolean(entry));
  const toScale = missing.length === 0;
  const caption = toScale
    ? "Drawn to scale from the published dimensions."
    : missing.length === 4
      ? `Drawn to typical ${bodyLabel} proportions — published dimensions not recorded.`
      : `Drawn to scale where published; ${joinList(missing)} not recorded, so drawn to typical ${bodyLabel} proportions.`;

  const summary = [
    `Technical drawing of the ${detail.manufacturer.name} ${detail.model.name} body style, side elevation and plan.`,
    lengthMm !== null ? `Length ${formatNumber(lengthMm)} mm.` : null,
    widthMm !== null ? `Width ${formatNumber(widthMm)} mm.` : null,
    heightMm !== null ? `Height ${formatNumber(heightMm)} mm.` : null,
    wheelbaseMm !== null ? `Wheelbase ${formatNumber(wheelbaseMm)} mm.` : null,
    clearanceMm !== null ? `Ground clearance ${formatNumber(clearanceMm)} mm.` : null,
    caption,
  ]
    .filter(Boolean)
    .join(" ");

  const headingId = "dimensions-drawing-heading";
  const rowsTable: { label: string; value: string | null }[] = [
    { label: "Length", value: withUnit(lengthMm, "mm") },
    { label: "Width", value: withUnit(widthMm, "mm") },
    { label: "Height", value: withUnit(heightMm, "mm") },
    { label: "Wheelbase", value: withUnit(wheelbaseMm, "mm") },
    { label: "Ground clearance", value: withUnit(clearanceMm, "mm") },
    { label: "Kerb weight", value: withUnit(figure(dims?.kerb_weight_kg), "kg") },
    {
      label: "Seats",
      value:
        figure(dims?.seating_capacity) === null ? null : String(dims?.seating_capacity),
    },
    { label: "Boot", value: withUnit(figure(dims?.boot_capacity_l), "L") },
  ];

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow="Dimensions"
        title="Technical drawing"
        meta={`DWG · ${vehicleCode(detail)}`}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <figure className="min-w-0">
          <div className="relative overflow-hidden rounded-xs border border-line bg-surface-1/40">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 tech-grid opacity-70"
            />
            <div
              role="img"
              aria-label={summary}
              className="relative w-full"
              style={{ aspectRatio: `${totalW.toFixed(1)} / ${totalH.toFixed(1)}` }}
            >
              <svg
                viewBox={`0 0 ${totalW.toFixed(1)} ${totalH.toFixed(1)}`}
                className="absolute inset-0 size-full"
                fill="none"
                aria-hidden="true"
              >
                {/* ------------------------------------------ Side elevation */}
                <line
                  x1={sx(-0.03 * L)}
                  y1={ground}
                  x2={sx(L * 1.03)}
                  y2={ground}
                  className="stroke-ink-500"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={pathFrom(side.body, sideXY)}
                  className="fill-surface-3/80 stroke-ink-300"
                  strokeWidth={1.25}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {side.glass.length > 0 ? (
                  <path
                    d={pathFrom(side.glass, sideXY)}
                    className="fill-void/70 stroke-ink-500/70"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                {side.wheels.map((wheel, index) => (
                  <g key={`wheel-${index}`}>
                    <circle
                      cx={sx(wheel.cx)}
                      cy={ground - wheel.cy}
                      r={wheel.r}
                      className="fill-void stroke-ink-300"
                      strokeWidth={1.25}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={sx(wheel.cx)}
                      cy={ground - wheel.cy}
                      r={wheel.rim}
                      className="stroke-gold-700"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
                {/* Axle centre lines */}
                {side.wheels.map((wheel, index) => (
                  <line
                    key={`axle-${index}`}
                    x1={sx(wheel.cx)}
                    y1={ground - wheelTop}
                    x2={sx(wheel.cx)}
                    y2={centreBottom}
                    className="stroke-ink-500/80"
                    strokeWidth={0.75}
                    strokeDasharray="10 3 2 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* ----------------------------------------------- Plan view */}
                <line
                  x1={sx(-0.03 * L)}
                  y1={planCentre}
                  x2={sx(L * 1.03)}
                  y2={planCentre}
                  className="stroke-ink-500/80"
                  strokeWidth={0.75}
                  strokeDasharray="10 3 2 3"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={pathFrom(plan.outline, planXY)}
                  className="fill-surface-3/80 stroke-ink-300"
                  strokeWidth={1.25}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {plan.cabin.length > 0 ? (
                  <path
                    d={pathFrom(plan.cabin, planXY)}
                    className="fill-void/60 stroke-ink-500/70"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                {plan.wheels.map((wheel, index) => (
                  <rect
                    key={`plan-wheel-${index}`}
                    x={sx(wheel.x)}
                    y={planCentre - (wheel.y + wheel.h)}
                    width={wheel.w}
                    height={wheel.h}
                    rx={wheel.h * 0.18}
                    className="stroke-ink-400/80"
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {side.wheels.map((wheel, index) => (
                  <line
                    key={`plan-axle-${index}`}
                    x1={sx(wheel.cx)}
                    y1={planCentre - W / 2 - 0.03 * L}
                    x2={sx(wheel.cx)}
                    y2={planCentre + W / 2 + 0.03 * L}
                    className="stroke-ink-500/80"
                    strokeWidth={0.75}
                    strokeDasharray="10 3 2 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* ------------------------------------------ Dimensioning */}
                {extensions}
                {dimLines}
              </svg>

              {/* Labels: HTML, so they stay legible at every size. */}
              <span
                className="absolute text-hud text-ink-500"
                style={{ ...pct(originX, pad * 0.7) }}
              >
                Side elevation
              </span>
              <span
                className="absolute text-hud text-ink-500"
                style={{ ...pct(originX, planTop - 0.075 * L) }}
              >
                Plan
              </span>
              {labels.map((label) => (
                <span
                  key={label.key}
                  className={cn(
                    "absolute flex items-baseline gap-1.5 rounded-xs bg-void px-1.5 py-0.5 font-mono text-[10px] leading-none whitespace-nowrap tabular-nums sm:text-[11px]",
                    label.placement === "on-line" && "-translate-x-1/2 -translate-y-1/2",
                    label.placement === "on-line-vertical" &&
                      "-translate-x-1/2 -translate-y-1/2 -rotate-90",
                    label.placement === "right" && "translate-x-2 -translate-y-1/2",
                  )}
                  style={pct(label.x, label.y)}
                >
                  <span className="text-ink-500">{label.abbr}</span>
                  <span className="text-gold-200">{formatNumber(label.value)}</span>
                </span>
              ))}
            </div>
          </div>
          <figcaption className="mt-3 flex flex-col gap-1 text-xs leading-relaxed text-ink-500 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <span className={toScale ? undefined : "text-ink-400"}>{caption}</span>
            <span className="shrink-0 text-hud text-ink-600">
              mm · body-style drawing, not a likeness
            </span>
          </figcaption>
        </figure>

        {/* ------------------------------------------------ Figures table */}
        <div>
          <dl className="divide-y divide-line-subtle border-y border-line">
            {rowsTable.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 py-2.5"
              >
                <dt className="text-sm text-ink-300">{row.label}</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {row.value === null ? (
                    <span className="text-ink-500 italic">{NOT_AVAILABLE}</span>
                  ) : (
                    <span className="text-ink-50">{row.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {dims?.notes?.trim() ? (
            <p className="mt-4 text-xs leading-relaxed text-ink-500">{dims.notes}</p>
          ) : null}
          {labels.length > 0 ? (
            // Key to the abbreviations — only those the drawing actually uses.
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-hud text-ink-600">
              {labels.map((label) => (
                <div key={label.key} className="contents">
                  <dt>{label.abbr}</dt>
                  <dd>{ABBREVIATIONS[label.abbr] ?? label.key}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const ABBREVIATIONS: Record<string, string> = {
  L: "Length",
  WB: "Wheelbase",
  H: "Height",
  W: "Width",
  GC: "Ground clearance",
};

/** The point with the greatest y (highest in elevation, widest in plan). */
function highest(points: readonly Point[]): Point {
  let best: Point = points[0] ?? [0, 0];
  for (const point of points) if (point[1] > best[1]) best = point;
  return best;
}

function withUnit(value: number | null, unit: string): string | null {
  return value === null ? null : `${formatNumber(value)} ${unit}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
