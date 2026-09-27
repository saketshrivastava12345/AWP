import type { CarBuild } from "@/lib/car-build";
import { drawingGeometry, pathFrom, type Point } from "@/lib/detail/drawing";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The hero's still composition: a side elevation of the featured car's body
 * style, drawn at its PUBLISHED size, with a dimension line for each figure
 * the maker publishes and none for the ones it does not.
 *
 * Server-rendered, so it is the first thing every visitor sees behind the
 * headline; the 3D scene fades in over it only where one can run. With
 * reduced motion, no WebGL or a low-power device it is the whole story — a
 * drawing, not a photograph, and not a likeness: the body style's profile at
 * this car's dimensions, the same profile the 3D representation is lofted
 * from.
 */

const MARGIN = 420; // mm of drawing sheet around the car
const TICK = 90;
/** Hairlines stay hairlines at any size the sheet is drawn. */
const HAIR = { vectorEffect: "non-scaling-stroke" as const };

function DimensionLine({
  from,
  to,
  label,
  vertical = false,
}: {
  from: Point;
  to: Point;
  label: string;
  vertical?: boolean;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="stroke-gold-600"
        strokeWidth={1}
        {...HAIR}
      />
      {vertical ? (
        <>
          <line
            x1={x1 - TICK / 2}
            y1={y1}
            x2={x1 + TICK / 2}
            y2={y1}
            className="stroke-gold-600"
            strokeWidth={1}
            {...HAIR}
          />
          <line
            x1={x2 - TICK / 2}
            y1={y2}
            x2={x2 + TICK / 2}
            y2={y2}
            className="stroke-gold-600"
            strokeWidth={1}
            {...HAIR}
          />
        </>
      ) : (
        <>
          <line
            x1={x1}
            y1={y1 - TICK / 2}
            x2={x1}
            y2={y1 + TICK / 2}
            className="stroke-gold-600"
            strokeWidth={1}
            {...HAIR}
          />
          <line
            x1={x2}
            y1={y2 - TICK / 2}
            x2={x2}
            y2={y2 + TICK / 2}
            className="stroke-gold-600"
            strokeWidth={1}
            {...HAIR}
          />
        </>
      )}
      <text
        x={vertical ? mx + 70 : mx}
        y={vertical ? my : my + 135}
        textAnchor={vertical ? "start" : "middle"}
        dominantBaseline={vertical ? "middle" : "auto"}
        className="fill-ink-300 font-mono transition-opacity duration-500 group-data-[story=true]/stage:opacity-0 max-lg:hidden"
        fontSize={104}
        letterSpacing={6}
      >
        {label}
      </text>
    </g>
  );
}

export function HeroPoster({
  build,
  className,
}: {
  build: CarBuild;
  className?: string;
}) {
  const geometry = drawingGeometry({
    bodyType: build.bodyType,
    powertrain: build.powertrain,
    enginePosition: build.enginePosition,
    lengthMm: build.length_mm,
    widthMm: build.width_mm,
    heightMm: build.height_mm,
    wheelbaseMm: build.wheelbase_mm,
    groundClearanceMm: build.ground_clearance_mm,
  });
  const { length: L, height: H, side, published } = geometry;

  // Sheet coordinates: x from the tail, y down from the top of the sheet. The
  // height is dimensioned at the nose, away from the text column.
  const left = MARGIN;
  const top = MARGIN;
  const ground = top + H;
  const toSheet = ([x, y]: Point): Point => [left + x, ground - y];
  const heightX = left + L + 200;
  const width = heightX + 720;
  const height = ground + 580;

  const body = pathFrom(side.body, toSheet);
  const glass = pathFrom(side.glass, toSheet);
  const wheelbaseY = ground + 110;
  const lengthY = ground + 390;
  const mm = (value: number) => `${formatNumber(Math.round(value))} MM`;

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* The key light's pool on the studio floor. */}
      <div className="absolute top-[66%] left-1/2 h-[36%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-gold-800/20 blur-[90px] lg:top-[52%] lg:left-[72%] lg:h-[50%] lg:w-[52%]" />
      <div className="absolute inset-0 tech-grid opacity-40" />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-x-[4%] bottom-[21%] h-[24%] w-[92%] overflow-visible sm:bottom-[17%] sm:h-[36%] lg:inset-x-auto lg:top-[24%] lg:right-[3%] lg:bottom-auto lg:h-[52%] lg:w-[46%]"
      >
        <defs>
          <linearGradient id="hero-poster-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-surface-4)" />
            <stop offset="100%" stopColor="var(--color-surface-1)" />
          </linearGradient>
        </defs>

        {/* Ground line, running off both edges like a studio floor. */}
        <line
          x1={0}
          y1={ground}
          x2={width}
          y2={ground}
          className="stroke-line-strong"
          strokeWidth={1}
          {...HAIR}
        />

        <path
          d={body}
          fill="url(#hero-poster-body)"
          className="stroke-ink-500"
          strokeWidth={1.25}
          {...HAIR}
        />
        {glass ? (
          <path
            d={glass}
            className="fill-void/70 stroke-ink-600"
            strokeWidth={1}
            {...HAIR}
          />
        ) : null}
        {side.wheels.map((wheel, index) => {
          const [cx, cy] = toSheet([wheel.cx, wheel.cy]);
          return (
            <g key={index}>
              <circle
                cx={cx}
                cy={cy}
                r={wheel.r}
                className="fill-void stroke-ink-500"
                strokeWidth={1.25}
                {...HAIR}
              />
              <circle
                cx={cx}
                cy={cy}
                r={wheel.rim}
                className="fill-surface-2 stroke-gold-700"
                strokeWidth={1}
                {...HAIR}
              />
              <circle cx={cx} cy={cy} r={wheel.rim * 0.2} className="fill-surface-4" />
            </g>
          );
        })}

        {/* Only published figures get a dimension line. */}
        {published.height ? (
          <DimensionLine
            from={[heightX, ground]}
            to={[heightX, top]}
            label={mm(H)}
            vertical
          />
        ) : null}
        {published.wheelbase ? (
          <DimensionLine
            from={[left + side.rearAxleX, wheelbaseY]}
            to={[left + side.frontAxleX, wheelbaseY]}
            label={mm(geometry.wheelbase)}
          />
        ) : null}
        {published.length ? (
          <DimensionLine from={[left, lengthY]} to={[left + L, lengthY]} label={mm(L)} />
        ) : null}
      </svg>
    </div>
  );
}
