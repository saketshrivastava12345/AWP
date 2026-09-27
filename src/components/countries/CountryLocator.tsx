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
 * around the country, with its marker. Server-rendered SVG, no script.
 * Renders nothing for a country without recorded coordinates rather than
 * guessing where it is.
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
    <figure
      className={cn(
        "relative overflow-hidden border border-line bg-surface-1/60",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 opacity-60 hud-corners"
      />
      <svg
        viewBox={`${left.toFixed(1)} ${top.toFixed(1)} ${width} ${height.toFixed(1)}`}
        className="block h-auto w-full"
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
              fill="var(--color-ink-600)"
            />
          </pattern>
          <clipPath id={`${id}-land`}>
            <path d={landPath()} />
          </clipPath>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0" />
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
        <g stroke="var(--color-gold-700)" strokeWidth="0.6" strokeDasharray="2 4">
          <line x1={left} y1={y} x2={left + width} y2={y} />
          <line x1={x} y1={top} x2={x} y2={top + height} />
        </g>
        <circle cx={x} cy={y} r={26} fill={`url(#${id}-glow)`} />
        <circle
          cx={x}
          cy={y}
          r={9}
          fill="none"
          stroke="var(--color-gold-400)"
          strokeWidth="1"
        />
        <circle cx={x} cy={y} r={4.5} className="fill-gold-300" />
      </svg>
      <figcaption className="flex items-center justify-between gap-3 border-t border-line-subtle px-4 py-2.5 text-hud">
        <span>{formatCoordinates(marker.lat, marker.lon)}</span>
        <span className="text-ink-500">Approx. centroid</span>
      </figcaption>
    </figure>
  );
}
