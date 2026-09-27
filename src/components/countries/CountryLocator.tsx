import { cn } from "@/lib/utils";
import {
  CELL,
  MAP_HEIGHT,
  MAP_WIDTH,
  formatCoordinates,
  landPath,
  markerFor,
  project,
} from "./atlas";

/**
 * A small, static locator for a country page: the dot-matrix world, cropped
 * around the country, with its marker under a breathing glow and a slowly
 * turning dashed reticle. Server-rendered SVG, no script; the motion is CSS
 * and stops under reduced motion. Renders nothing for a country without
 * recorded coordinates rather than guessing where it is.
 */
export function CountryLocator({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const marker = markerFor(slug);
  if (!marker) return null;

  const { x, y } = project(marker.lon, marker.lat);
  // A window about 150° of longitude wide, centred on the country and kept
  // inside the map.
  const width = 420;
  const height = width * 0.62;
  const left = Math.min(Math.max(x - width / 2, 0), MAP_WIDTH - width);
  const top = Math.min(Math.max(y - height / 2, 0), MAP_HEIGHT - height);
  const id = `locator-${slug.replace(/[^a-z0-9-]/gi, "")}`;

  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox={`${left.toFixed(1)} ${top.toFixed(1)} ${width} ${height.toFixed(1)}`}
        className="block h-auto w-full [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
        role="img"
        aria-label={`Location of ${name} on a world map`}
      >
        <defs>
          <pattern
            id={`${id}-dots`}
            width={CELL}
            height={CELL}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={CELL / 2}
              cy={CELL / 2}
              r={CELL * 0.26}
              fill="oklch(0.45 0.045 235)"
            />
          </pattern>
          <clipPath id={`${id}-land`}>
            <path d={landPath()} />
          </clipPath>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0%" stopColor="var(--color-cyan-300)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-cyan-400)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          fill={`url(#${id}-dots)`}
          clipPath={`url(#${id}-land)`}
        />
        {/* Crosshair through the marker. */}
        <g stroke="oklch(0.83 0.13 210 / 35%)" strokeWidth="0.6" strokeDasharray="2 4">
          <line x1={left} y1={y} x2={left + width} y2={y} />
          <line x1={x} y1={top} x2={x} y2={top + height} />
        </g>
        <circle
          cx={x}
          cy={y}
          r={26}
          fill={`url(#${id}-glow)`}
          className="animate-pulse-glow"
        />
        <circle
          cx={x}
          cy={y}
          r={15}
          fill="none"
          stroke="var(--color-cyan-300)"
          strokeWidth="0.8"
          strokeDasharray="3 5"
          className="origin-center animate-spin-slow [transform-box:fill-box]"
        />
        <circle
          cx={x}
          cy={y}
          r={9}
          fill="none"
          stroke="var(--color-cyan-300)"
          strokeWidth="1"
        />
        <circle cx={x} cy={y} r={4.5} className="fill-cyan-200" />
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] tracking-hud text-ink-400 uppercase">
        <span className="tabular-nums text-cyan-200">
          {formatCoordinates(marker.lat, marker.lon)}
        </span>
        <span>Approximate centroid</span>
      </figcaption>
    </figure>
  );
}
