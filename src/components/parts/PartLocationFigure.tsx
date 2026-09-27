import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { Scanlines } from "@/components/fx/Backgrounds";
import { cn } from "@/lib/utils";
import { ZONE_NOTES, locationFigure, type ZoneShape } from "./part-location";
import type { ViewerGroup } from "@/types/domain";

/**
 * "Typical location": a technical side elevation of a generic saloon with the
 * zone a system usually occupies hatched in cyan, its outline a running dash,
 * on a HUD panel a scan beam sweeps down. Server-rendered SVG; the motion is
 * CSS (stroke-dashoffset and a translate) and stops under reduced motion.
 *
 * It is deliberately labelled as typical: a part in the encyclopedia is not
 * tied to one car, and the note under the drawing says where the answer
 * varies (engines sit at the front, the middle or the back).
 */
export function PartLocationFigure({
  groups,
  id,
  className,
}: {
  groups: readonly ViewerGroup[];
  /** Unique per page; prefixes the SVG ids. */
  id: string;
  className?: string;
}) {
  const unique = [...new Set(groups)];
  if (unique.length === 0) return null;

  const figure = locationFigure(unique);
  const { silhouette, width: W, height: H } = figure;
  const padX = W * 0.05;
  const padTop = H * 0.1;
  const padBottom = H * 0.3;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    clip: `${safeId}-clip`,
    hatch: `${safeId}-hatch`,
    title: `${safeId}-title`,
    desc: `${safeId}-desc`,
  };
  const labels = unique.map((group) => GROUP_LABELS[group]);
  const labelY = H + padBottom * 0.62;

  const renderShape = (shape: ZoneShape, key: string) => {
    switch (shape.type) {
      case "rect":
        return (
          <g key={key}>
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              className="fill-cyan-400/12"
            />
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill={`url(#${ids.hatch})`}
              className="animate-hud-dash stroke-cyan-300"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          </g>
        );
      case "circle":
        return (
          <circle
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={`url(#${ids.hatch})`}
            className="animate-hud-dash stroke-cyan-300"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        );
      case "line":
        return (
          <path
            key={key}
            d={shape.d}
            fill="none"
            className={cn("stroke-cyan-200", shape.dashed && "animate-hud-dash")}
            strokeWidth={shape.dashed ? 2 : 2.4}
            strokeDasharray={shape.dashed ? "7 5" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      case "outline":
        return (
          <path
            key={key}
            d={silhouette.body}
            fill={`url(#${ids.hatch})`}
            className="animate-hud-dash stroke-cyan-300"
            strokeWidth={2.5}
            strokeDasharray="8 5"
          />
        );
    }
  };

  return (
    <figure
      className={cn(
        "relative min-w-0 overflow-hidden rounded-card p-5 hud-panel sm:p-8",
        className,
      )}
    >
      <span aria-hidden="true" className="hud-brackets -m-px" />
      <Scanlines beam />
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2.5 font-hud text-xs tracking-hud text-ink-50 uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse-glow rounded-full bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          Typical location
        </p>
        <p className="hud-label" aria-hidden="true">
          Side elevation // generic saloon
        </p>
        <p className="sr-only">Side elevation of a generic saloon</p>
      </div>

      <svg
        viewBox={`${(-padX).toFixed(1)} ${(-padTop).toFixed(1)} ${(W + padX * 2).toFixed(1)} ${(
          H +
          padTop +
          padBottom
        ).toFixed(1)}`}
        className="relative mt-4 block h-auto w-full"
        role="img"
        aria-labelledby={`${ids.title} ${ids.desc}`}
      >
        <title
          id={ids.title}
        >{`Typical location of the ${labels.join(" and ")} system`}</title>
        <desc id={ids.desc}>{unique.map((group) => ZONE_NOTES[group]).join(" ")}</desc>
        <defs>
          <clipPath id={ids.clip}>
            <path d={silhouette.body} />
          </clipPath>
          <pattern
            id={ids.hatch}
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              stroke="var(--color-cyan-300)"
              strokeWidth="1.3"
              strokeOpacity="0.5"
            />
          </pattern>
          <pattern
            id={`${ids.hatch}-grid`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="oklch(0.83 0.13 210 / 9%)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Engineering grid behind the drawing. */}
        <rect
          x={-padX}
          y={-padTop}
          width={W + padX * 2}
          height={H + padTop}
          fill={`url(#${ids.hatch}-grid)`}
        />

        {/* Ground line with axle stations, like a general-arrangement drawing. */}
        <line
          x1={-padX}
          y1={H}
          x2={W + padX}
          y2={H}
          stroke="oklch(0.83 0.13 210 / 45%)"
          strokeWidth="1.2"
        />
        {[figure.rearAxleX, figure.frontAxleX].map((x) => (
          <line
            key={x}
            x1={x}
            y1={H + 4}
            x2={x}
            y2={H + padBottom * 0.28}
            stroke="oklch(0.83 0.13 210 / 40%)"
            strokeWidth="1.2"
          />
        ))}

        <path
          d={silhouette.body}
          className="fill-surface-3 stroke-ink-500"
          strokeWidth={2}
        />
        {silhouette.glass ? <path d={silhouette.glass} className="fill-void/70" /> : null}

        <g clipPath={`url(#${ids.clip})`}>
          {figure.zones.flatMap((zone) =>
            zone.inside
              .filter((shape) => shape.type !== "outline")
              .map((shape, index) => renderShape(shape, `${zone.group}-in-${index}`)),
          )}
        </g>
        {figure.zones.flatMap((zone) =>
          zone.inside
            .filter((shape) => shape.type === "outline")
            .map((shape, index) => renderShape(shape, `${zone.group}-outline-${index}`)),
        )}

        {silhouette.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-600"
              strokeWidth={2}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              fill="none"
              className="stroke-ink-600"
              strokeWidth={1.5}
            />
          </g>
        ))}

        {figure.zones.flatMap((zone) =>
          zone.over.map((shape, index) =>
            renderShape(shape, `${zone.group}-over-${index}`),
          ),
        )}

        <g className="font-mono" fontSize="14" letterSpacing="2">
          <text x={-padX * 0.2} y={labelY} className="fill-cyan-200">
            ← REAR
          </text>
          <text x={W + padX * 0.2} y={labelY} textAnchor="end" className="fill-cyan-200">
            FRONT →
          </text>
        </g>
      </svg>

      <figcaption className="relative mt-5 space-y-3 border-t border-line-subtle pt-5">
        {unique.map((group) => (
          <p key={group} className="flex items-start gap-3 text-body-s text-ink-300">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2.5 shrink-0 rounded-[2px] border border-cyan-300 bg-cyan-400/25 shadow-[0_0_6px_var(--color-cyan-400)]"
            />
            <span>
              <span className="text-ink-100">{GROUP_LABELS[group]}.</span>{" "}
              {ZONE_NOTES[group]}
            </span>
          </p>
        ))}
        <p className="text-caption">
          Drawn on a generic saloon from AURIX&apos;s own body profiles: where this
          usually sits, not a drawing of any particular car.
        </p>
      </figcaption>
    </figure>
  );
}
