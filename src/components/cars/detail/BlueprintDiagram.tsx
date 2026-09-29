import { cacheLife } from "next/cache";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { BLUEPRINT_LABELS } from "@/lib/blueprint";
import {
  blueprintDiagram,
  type BlueprintDiagramData,
  type DiagramShape,
} from "@/components/3d/blueprint-diagram";

/**
 * The drawing depends only on the build, so it is cached. (The layout it is
 * drawn from is measured with three.js objects, whose ids are random — which
 * Cache Components rightly refuses in a prerender unless it is cached.)
 */
async function diagramFor(
  build: CarBuild,
  groups: readonly ViewerGroup[],
): Promise<BlueprintDiagramData> {
  "use cache";
  cacheLife("max");
  return blueprintDiagram(build, groups);
}

/**
 * The blueprint as a still exploded drawing, rendered on the server: what
 * the blueprint stage shows when the visitor prefers reduced motion, or the
 * device has no WebGL. Same layout and explode plan as the 3D car, drawn in
 * oblique projection (blueprint-diagram.ts).
 *
 * Props:
 *   build   the variant's CarBuild
 *   groups  the groups the blueprint takes apart, in order (blueprintGroups)
 *
 * Linework is SVG with non-scaling hairlines; the numbered labels are HTML
 * laid over it at percentage positions so they stay crisp at any width. The
 * cards beside it carry every figure, so the drawing is one labelled image.
 */
export async function BlueprintDiagram({
  build,
  groups,
  label,
}: {
  build: CarBuild;
  groups: readonly ViewerGroup[];
  /** The car's name, for the image description. */
  label: string;
}) {
  const data = await diagramFor(build, groups);
  const { minX, maxX, minY, maxY } = data.bounds;
  const pad = 0.35;
  const top = maxY + pad + 0.4;
  const width = maxX - minX + pad * 2;
  const height = top - (minY - pad);
  const sx = (x: number) => x - minX + pad;
  const sy = (y: number) => top - y;
  const pct = (x: number, y: number) => ({
    left: `${((sx(x) / width) * 100).toFixed(3)}%`,
    top: `${((sy(y) / height) * 100).toFixed(3)}%`,
  });

  const draw = (shape: DiagramShape, key: string, body: boolean) => {
    const stroke = body
      ? shape.weight === "outline"
        ? "stroke-gold-400"
        : "stroke-gold-700"
      : shape.weight === "outline"
        ? "stroke-ink-300"
        : "stroke-ink-600";
    if (shape.kind === "circle") {
      return (
        <circle
          key={key}
          cx={sx(shape.cx)}
          cy={sy(shape.cy)}
          r={shape.r}
          className={`fill-none ${stroke}`}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    const points = shape.points
      .map(([x, y]) => `${sx(x).toFixed(3)},${sy(y).toFixed(3)}`)
      .join(" ");
    return shape.closed ? (
      <polygon
        key={key}
        points={points}
        className={`fill-void/70 ${stroke}`}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    ) : (
      <polyline
        key={key}
        points={points}
        className={`fill-none ${stroke}`}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  const names = data.groups.map(({ group }) => BLUEPRINT_LABELS[group]).join(", ");

  // Keep labels from covering each other. The drawing is laid out at about
  // 520 px wide on a desktop stage, so label boxes are estimated in metres
  // from their character count (monospace), and a label that would overlap
  // one already placed climbs on a longer leader until it is clear.
  const perPx = width / 520;
  const boxH = 18 * perPx;
  const labels = data.groups
    .map(({ group, anchor }) => {
      const text = `${String(groups.indexOf(group) + 1).padStart(2, "0")} ${BLUEPRINT_LABELS[group]}`;
      return { group, anchor, w: (text.length * 6.6 + 12) * perPx, lead: 10 * perPx };
    })
    .sort((a, b) => b.anchor[1] - a.anchor[1]);
  const placed: { left: number; right: number; bottom: number; top: number }[] = [];
  for (const label of labels) {
    const left = label.anchor[0] - label.w / 2;
    const right = label.anchor[0] + label.w / 2;
    for (let guard = 0; guard < 12; guard += 1) {
      const bottom = label.anchor[1] + label.lead;
      const hit = placed.find(
        (box) =>
          left < box.right &&
          right > box.left &&
          bottom < box.top &&
          bottom + boxH > box.bottom,
      );
      if (!hit) break;
      label.lead = hit.top - label.anchor[1] + 2 * perPx;
    }
    const bottom = label.anchor[1] + label.lead;
    placed.push({ left, right, bottom, top: bottom + boxH });
  }

  return (
    <figure className="w-full max-w-3xl">
      <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          viewBox={`0 0 ${width.toFixed(3)} ${height.toFixed(3)}`}
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={`Exploded drawing of the ${label}: ${names}.`}
        >
          <line
            x1={0}
            x2={width}
            y1={sy(0)}
            y2={sy(0)}
            className="stroke-line-strong"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* Back to front: the body last, so its outline reads on top. */}
          {data.groups
            .filter(({ group }) => group !== "body")
            .map(({ group, shapes }) => (
              <g key={group}>
                {shapes.map((shape, index) => draw(shape, `${group}-${index}`, false))}
              </g>
            ))}
          {data.groups
            .filter(({ group }) => group === "body")
            .map(({ group, shapes }) => (
              <g key={group}>
                {shapes.map((shape, index) => draw(shape, `${group}-${index}`, true))}
              </g>
            ))}
          {labels.map(({ group, anchor, lead }) => (
            <g key={`dot-${group}`}>
              <line
                x1={sx(anchor[0])}
                x2={sx(anchor[0])}
                y1={sy(anchor[1])}
                y2={sy(anchor[1] + lead)}
                className="stroke-gold-600"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={sx(anchor[0])}
                cy={sy(anchor[1])}
                r={0.035}
                className="fill-gold-400"
              />
            </g>
          ))}
        </svg>
        {labels.map(({ group, anchor, lead }) => (
          <span
            key={group}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-full border border-gold-700/60 bg-void/85 px-1 font-mono text-nano leading-4 tracking-hud whitespace-nowrap text-gold-200 uppercase"
            style={pct(anchor[0], anchor[1] + lead)}
          >
            <span className="text-gold-500">
              {String(groups.indexOf(group) + 1).padStart(2, "0")}
            </span>
            <span className="max-md:hidden"> {BLUEPRINT_LABELS[group]}</span>
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-hud text-ink-400 max-md:hidden">
        Exploded view · each system drawn as the space it occupies in this car&apos;s
        layout
      </figcaption>
    </figure>
  );
}
