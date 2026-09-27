import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { drawingGeometry } from "@/lib/detail/drawing";
import { planExplode, type GroupExtent, type Vec3 } from "@/lib/viewer-explode";
import { computeLayout } from "./car-layout";

/**
 * The blueprint as a still drawing, for visitors who prefer reduced motion
 * and devices without WebGL: the car's exploded view in oblique projection,
 * as SVG-ready 2D shapes.
 *
 * It is laid out from the same data as the 3D blueprint — the car's layout
 * (engine position and size, battery, gearbox, seats, wheels at the real
 * track and wheelbase) and the same explode plan — but each system is drawn
 * as the box that contains it, which is what a still diagram needs: the
 * body is the one true outline (the side elevation from the published
 * dimensions, lib/detail/drawing.ts). Runs on the server; nothing here is
 * sent to the browser but the resulting numbers.
 *
 * Units are metres. Screen x runs toward the nose; screen y is up (the SVG
 * component flips it). The near side of the car (+x, the side the 3D camera
 * looks at) is drawn at full size; depth recedes up and to the right.
 */

export type Point2 = [number, number];

export type DiagramShape =
  | { kind: "poly"; points: Point2[]; closed: boolean; weight: "outline" | "detail" }
  | { kind: "circle"; cx: number; cy: number; r: number; weight: "outline" | "detail" };

export type DiagramGroup = {
  group: ViewerGroup;
  shapes: DiagramShape[];
  /** Where the group's label points. */
  anchor: Point2;
};

export type BlueprintDiagramData = {
  groups: DiagramGroup[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

/** Oblique projection: depth recedes at 30°, foreshortened by half. */
const DEPTH = 0.5;
const COS = Math.cos(Math.PI / 6) * DEPTH;
const SIN = Math.sin(Math.PI / 6) * DEPTH;

const project = ([x, y, z]: Vec3): Point2 => [z - x * COS, y - x * SIN];

type Box3D = { min: Vec3; max: Vec3 };

const box = (center: Vec3, size: Vec3): Box3D => ({
  min: [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
  max: [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2],
});

const shift = (b: Box3D, [dx, dy, dz]: Vec3): Box3D => ({
  min: [b.min[0] + dx, b.min[1] + dy, b.min[2] + dz],
  max: [b.max[0] + dx, b.max[1] + dy, b.max[2] + dz],
});

/** The visible outline of a box, plus its hidden near edges as detail. */
function boxShapes(b: Box3D): DiagramShape[] {
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  const p = (x: number, y: number, z: number) => project([x, y, z]);
  // Near face (x1), top face and nose-end face are the ones this view sees.
  return [
    {
      kind: "poly",
      closed: true,
      weight: "outline",
      points: [p(x1, y0, z0), p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0)],
    },
    {
      kind: "poly",
      closed: true,
      weight: "outline",
      points: [p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1), p(x0, y1, z0)],
    },
    {
      kind: "poly",
      closed: false,
      weight: "outline",
      points: [p(x1, y0, z1), p(x0, y0, z1), p(x0, y1, z1)],
    },
  ];
}

const topOf = (b: Box3D): Point2 =>
  project([b.max[0], b.max[1], (b.min[2] + b.max[2]) / 2]);

export function blueprintDiagram(
  build: CarBuild,
  groups: readonly ViewerGroup[],
): BlueprintDiagramData {
  const layout = computeLayout(build);
  const { spec, cabin } = layout;
  const R = spec.wheelRadius;
  const v = (vector: { x: number; y: number; z: number }): Vec3 => [
    vector.x,
    vector.y,
    vector.z,
  ];

  // --- Each system as boxes, assembled -----------------------------------------
  const boxes: Partial<Record<ViewerGroup, Box3D[]>> = {};
  const floor = spec.groundClearance + 0.04;

  if (layout.engine) {
    const e = layout.engine;
    const height = Math.max(0.3, (e.center.y - floor) * 2.4);
    const across = Math.min(spec.width * 0.55, 0.75 * e.scale);
    const size: Vec3 = e.longitudinal
      ? [across, height, e.footprint]
      : [e.footprint, height, across];
    boxes.engine = [box([e.center.x, floor + height / 2, e.center.z], size)];
  }
  if (layout.gearbox)
    boxes.transmission = [box(v(layout.gearbox.center), v(layout.gearbox.size))];
  else
    boxes.transmission = layout.differentials.map((point) =>
      box(v(point), [0.34, 0.26, 0.3]),
    );
  const pack: Box3D[] = [];
  if (layout.battery) pack.push(box(v(layout.battery.center), v(layout.battery.size)));
  for (const motor of layout.motors)
    pack.push(box(v(motor.position), [motor.length, motor.radius * 2, motor.radius * 2]));
  if (pack.length > 0) boxes.battery = pack;

  boxes.suspension = layout.wheels.map(({ position, side }) =>
    box([position.x - side * 0.3, R + 0.14, position.z], [0.14, 0.4, 0.16]),
  );
  boxes.interior = [
    ...cabin.seatRows.flatMap((row, index) =>
      (index === 0 ? [cabin.seatX, -cabin.seatX] : [0]).map((x) =>
        box(
          [x, cabin.floorY + 0.36, row],
          [index === 0 ? 0.5 : spec.width * 0.62, 0.72, 0.62],
        ),
      ),
    ),
    box([0, cabin.dashY - 0.12, cabin.dashZ], [spec.width * 0.78, 0.22, 0.34]),
  ];
  boxes.electronics = [
    box([0, cabin.dashY - 0.34, cabin.dashZ + 0.12], [0.34, 0.14, 0.2]),
  ];
  const tail = spec.tailZ;
  boxes.exhaust = [
    box([0, spec.groundClearance + 0.12, tail + 0.55], [spec.width * 0.42, 0.14, 0.7]),
  ];

  // Body, as its bounding box (for the explode plan) and its side elevation.
  const drawing = drawingGeometry({
    bodyType: build.bodyType,
    powertrain: build.powertrain,
    enginePosition: build.enginePosition,
    lengthMm: build.length_mm,
    widthMm: build.width_mm,
    heightMm: build.height_mm,
    wheelbaseMm: build.wheelbase_mm,
    groundClearanceMm: build.ground_clearance_mm,
  });
  const scale = spec.length / (drawing.length / 1000);
  const toZ = (x: number) => (x / 1000) * scale - spec.length / 2;
  const toY = (y: number) => (y / 1000) * scale;

  // --- The same explode plan as the 3D car --------------------------------------
  const extents: GroupExtent[] = [];
  for (const group of groups) {
    if (group === "body") {
      extents.push({ group, minY: spec.groundClearance, centerZ: 0 });
      continue;
    }
    if (group === "wheels" || group === "brakes") {
      extents.push({ group, minY: 0, centerZ: 0 });
      continue;
    }
    const list = boxes[group];
    if (!list || list.length === 0) continue;
    const minY = Math.min(...list.map((b) => b.min[1]));
    const centerZ =
      group === "engine" && layout.engine
        ? layout.engine.center.z
        : list.reduce((sum, b) => sum + (b.min[2] + b.max[2]) / 2, 0) / list.length;
    extents.push({ group, minY, centerZ });
  }
  const plan = planExplode({
    groups: extents,
    powertrain: build.powertrain,
    enginePosition: layout.engine ? build.enginePosition : null,
    length: spec.length,
  });
  const offset = (group: ViewerGroup): Vec3 => plan.offsets[group] ?? [0, 0, 0];

  // --- Shapes, exploded ------------------------------------------------------------
  const out: DiagramGroup[] = [];
  // A still drawing has no perspective to separate the shell from the cabin
  // below it, so the shell is lifted further than in 3D.
  const SHELL_CLEARANCE = 0.55 * (spec.length / 4.5);
  for (const group of groups) {
    const [dx, baseDy, dz] = offset(group);
    const dy = group === "body" ? baseDy + SHELL_CLEARANCE : baseDy;
    if (group === "body") {
      const near = spec.width / 2 + dx;
      const lift = (points: readonly (readonly [number, number])[]): Point2[] =>
        points.map(([x, y]) => project([near, toY(y) + dy, toZ(x) + dz]));
      const shapes: DiagramShape[] = [
        {
          kind: "poly",
          closed: true,
          weight: "outline",
          points: lift(drawing.side.body),
        },
      ];
      if (drawing.side.glass.length > 0)
        shapes.push({
          kind: "poly",
          closed: true,
          weight: "detail",
          points: lift(drawing.side.glass),
        });
      // The far side's roofline, receding: the shell reads as a volume.
      const far = -spec.width / 2 + dx;
      const roof = drawing.side.body
        .filter(([, y]) => y > drawing.height * 0.55)
        .map(([x, y]) => project([far, toY(y) + dy, toZ(x) + dz]));
      if (roof.length > 1)
        shapes.push({ kind: "poly", closed: false, weight: "detail", points: roof });
      const peak = drawing.side.body.reduce((best, point) =>
        point[1] > best[1] ? point : best,
      );
      out.push({
        group,
        shapes,
        anchor: project([near, toY(peak[1]) + dy, toZ(peak[0]) + dz]),
      });
      continue;
    }
    if (group === "wheels" || group === "brakes") {
      const spread = group === "wheels" ? plan.spread.wheels : plan.spread.brakes;
      const shapes: DiagramShape[] = [];
      let anchor: Point2 = [0, 0];
      // Far side first so the near wheels are drawn over them.
      const order = [...layout.wheels].sort((a, b) => a.side - b.side);
      for (const { position, side, front } of order) {
        const x =
          position.x +
          side * spread +
          dx -
          (group === "brakes" ? side * spec.tyreWidth * 0.12 : 0);
        const [cx, cy] = project([x, position.y + dy, position.z + dz]);
        const weight = side === 1 ? "outline" : "detail";
        if (group === "wheels") {
          shapes.push({ kind: "circle", cx, cy, r: R, weight });
          shapes.push({ kind: "circle", cx, cy, r: spec.rimRadius, weight: "detail" });
        } else {
          shapes.push({ kind: "circle", cx, cy, r: spec.rimRadius * 0.82, weight });
          shapes.push({
            kind: "circle",
            cx,
            cy,
            r: spec.rimRadius * 0.3,
            weight: "detail",
          });
        }
        // Label the near rear wheel and the near front brake, as the 3D view does.
        if (side === 1 && front === (group === "brakes"))
          anchor = [cx, cy + (group === "wheels" ? R : spec.rimRadius * 0.82)];
      }
      out.push({ group, shapes, anchor });
      continue;
    }
    const list = boxes[group];
    if (!list || list.length === 0) continue;
    const moved = list.map((b) => shift(b, [dx, dy, dz]));
    const top = moved.reduce((best, b) => (b.max[1] > best.max[1] ? b : best));
    out.push({ group, shapes: moved.flatMap(boxShapes), anchor: topOf(top) });
  }

  // --- Bounds ------------------------------------------------------------------------
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const { shapes } of out) {
    for (const shape of shapes) {
      if (shape.kind === "circle") {
        include(shape.cx - shape.r, shape.cy - shape.r);
        include(shape.cx + shape.r, shape.cy + shape.r);
      } else for (const [x, y] of shape.points) include(x, y);
    }
  }
  include(minX, 0);
  return { groups: out, bounds: { minX, maxX, minY, maxY } };
}
