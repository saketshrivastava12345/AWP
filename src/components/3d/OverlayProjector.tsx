"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three";
import { setFrameRequester, type ViewerBridge } from "@/lib/viewer-bridge";
import type { DimensionId } from "@/lib/viewer-dimensions";
import type { AnchorRegistry } from "./ProceduralCar";
import type { DimensionLine } from "./dimension-geometry";

/**
 * Projects the car's 3D anchors into the DOM overlays every rendered frame:
 * hotspot markers, measurement lines and engineering callouts, plus the HUD's
 * camera read-out.
 *
 * The overlays are ordinary DOM (crisp text, real buttons, readable by screen
 * readers); this component only writes their positions. It runs inside the
 * render loop, so it costs nothing while the canvas is idle, and it never
 * causes a React render.
 */

const world = new THREE.Vector3();
const ndc = new THREE.Vector3();
const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();

type Screen = { x: number; y: number; visible: boolean };

/**
 * Label sizes, measured once per element and stage width: reading layout
 * every frame would force a reflow per label.
 */
const labelSize = new WeakMap<
  HTMLElement,
  { width: number; height: number; stage: number }
>();

function sizeOf(element: HTMLElement, stage: number) {
  let size = labelSize.get(element);
  if (!size || size.width === 0 || size.stage !== stage) {
    size = { width: element.offsetWidth, height: element.offsetHeight, stage };
    labelSize.set(element, size);
  }
  return size;
}

function show(element: Element, visible: boolean) {
  const style = (element as HTMLElement | SVGElement).style;
  const value = visible ? "visible" : "hidden";
  if (style.visibility !== value) style.visibility = value;
}

function setLine(line: SVGLineElement, a: Screen, b: Screen) {
  line.setAttribute("x1", a.x.toFixed(1));
  line.setAttribute("y1", a.y.toFixed(1));
  line.setAttribute("x2", b.x.toFixed(1));
  line.setAttribute("y2", b.y.toFixed(1));
}

type ProjectionInput = {
  bridge: ViewerBridge;
  anchors: AnchorRegistry;
  dimensions: Partial<Record<DimensionId, DimensionLine>> | null;
  camera: THREE.Camera;
  size: { width: number; height: number };
  controls: CameraControlsImpl | null;
};

/** Write every overlay's position for the current camera. */
function projectOverlays({
  bridge,
  anchors,
  dimensions,
  camera,
  size,
  controls,
}: ProjectionInput) {
  const { overlay } = bridge;
  const { width, height } = size;
  camera.updateMatrixWorld();

  const project = (point: THREE.Vector3): Screen => {
    ndc.copy(point).project(camera);
    return {
      x: (ndc.x * 0.5 + 0.5) * width,
      y: (-ndc.y * 0.5 + 0.5) * height,
      visible:
        ndc.z < 1 && ndc.z > -1 && Math.abs(ndc.x) < 1.08 && Math.abs(ndc.y) < 1.08,
    };
  };
  const anchorScreen = (id: string): Screen | null => {
    const anchor = anchors.get(id);
    if (!anchor) return null;
    anchor.object.updateWorldMatrix(true, false);
    world.copy(anchor.local).applyMatrix4(anchor.object.matrixWorld);
    return project(world);
  };

  // --- hotspots -------------------------------------------------------------
  for (const [id, element] of overlay.points) {
    const screen = anchorScreen(id);
    if (!screen?.visible) {
      show(element, false);
      continue;
    }
    element.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`;
    show(element, true);
  }

  // --- measurement lines ----------------------------------------------------
  for (const [id, parts] of overlay.dimensions) {
    const line = dimensions?.[id as DimensionId];
    if (!line) {
      for (const element of [
        parts.line,
        parts.tickA,
        parts.tickB,
        parts.extA,
        parts.extB,
        parts.label,
      ])
        if (element) show(element, false);
      continue;
    }
    const a = project(line.a);
    const b = project(line.b);
    const visible = a.visible || b.visible;
    setLine(parts.line, a, b);
    // End ticks, perpendicular to the line on screen.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * 6;
    const ny = (dx / length) * 6;
    setLine(
      parts.tickA,
      { x: a.x - nx, y: a.y - ny, visible },
      { x: a.x + nx, y: a.y + ny, visible },
    );
    setLine(
      parts.tickB,
      { x: b.x - nx, y: b.y - ny, visible },
      { x: b.x + nx, y: b.y + ny, visible },
    );
    for (const [element, ends] of [
      [parts.extA, line.extA],
      [parts.extB, line.extB],
    ] as const) {
      if (!element) continue;
      if (!ends) {
        show(element, false);
        continue;
      }
      setLine(element, project(scratchA.copy(ends[0])), project(scratchB.copy(ends[1])));
      show(element, visible);
    }
    // Label at the middle, pushed off the line away from the car's centre.
    const centre = project(scratchA.set(0, 0.6, 0));
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const away = (mx - centre.x) * nx + (my - centre.y) * ny >= 0 ? 1 : -1;
    const { width: w, height: h } = sizeOf(parts.label, width);
    const lx = mx + away * nx * 2.6 - w / 2;
    const ly = my + away * ny * 2.6 - h / 2;
    parts.label.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
    for (const element of [parts.line, parts.tickA, parts.tickB, parts.label])
      show(element, visible);
  }

  // --- engineering callouts -------------------------------------------------
  type Item = {
    id: string;
    anchor: Screen;
    parts: NonNullable<ReturnType<typeof overlay.callouts.get>>;
  };
  const left: Item[] = [];
  const right: Item[] = [];
  for (const [id, parts] of overlay.callouts) {
    const anchor = anchorScreen(`callout:${id}`);
    if (!anchor?.visible) {
      show(parts.leader, false);
      show(parts.dot, false);
      show(parts.label, false);
      continue;
    }
    (anchor.x < width / 2 ? left : right).push({ id, anchor, parts });
  }
  const margin = 16;
  const gap = width < 640 ? 34 : 44;
  const top = 64;
  const bottom = height - 28;
  for (const [column, side] of [
    [left, -1],
    [right, 1],
  ] as const) {
    column.sort((p, q) => p.anchor.y - q.anchor.y);
    // Spread the labels out top-down, then pull them back inside the frame.
    const ys = column.map((item) => Math.min(bottom, Math.max(top, item.anchor.y)));
    for (let i = 1; i < ys.length; i += 1)
      ys[i] = Math.max(ys[i] ?? 0, (ys[i - 1] ?? 0) + gap);
    for (let i = ys.length - 1; i >= 0; i -= 1) {
      const limit = i === ys.length - 1 ? bottom : (ys[i + 1] ?? bottom) - gap;
      ys[i] = Math.min(ys[i] ?? 0, limit);
    }
    column.forEach((item, index) => {
      const y = ys[index] ?? item.anchor.y;
      const { width: w, height: h } = sizeOf(item.parts.label, width);
      const x = side < 0 ? margin : width - margin - w;
      const edge = side < 0 ? x + w + 4 : x - 4;
      const elbow = side < 0 ? edge + 22 : edge - 22;
      item.parts.label.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - h / 2).toFixed(1)}px, 0)`;
      item.parts.leader.setAttribute(
        "points",
        `${item.anchor.x.toFixed(1)},${item.anchor.y.toFixed(1)} ${elbow.toFixed(1)},${y.toFixed(1)} ${edge.toFixed(1)},${y.toFixed(1)}`,
      );
      item.parts.dot.setAttribute("cx", item.anchor.x.toFixed(1));
      item.parts.dot.setAttribute("cy", item.anchor.y.toFixed(1));
      show(item.parts.leader, true);
      show(item.parts.dot, true);
      show(item.parts.label, true);
    });
  }

  // --- HUD camera read-out --------------------------------------------------
  const telemetry = overlay.telemetry;
  if (telemetry && controls) {
    const azimuth = ((THREE.MathUtils.radToDeg(controls.azimuthAngle) % 360) + 360) % 360;
    const elevation = 90 - THREE.MathUtils.radToDeg(controls.polarAngle);
    const text = `AZ ${azimuth.toFixed(0).padStart(3, "0")}° · EL ${elevation.toFixed(0)}° · ${controls.distance.toFixed(1)} M`;
    if (telemetry.textContent !== text) telemetry.textContent = text;
  }
}

export function OverlayProjector({
  bridge,
  anchors,
  dimensions,
}: {
  bridge: ViewerBridge;
  anchors: AnchorRegistry;
  /** Measurement lines in car space; null when none are published. */
  dimensions: Partial<Record<DimensionId, DimensionLine>> | null;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useThree((state) => state.controls) as CameraControlsImpl | null;

  // The DOM asks for a frame when an overlay appears and needs placing.
  useEffect(() => {
    setFrameRequester(bridge, () => invalidate());
    return () => setFrameRequester(bridge, null);
  }, [bridge, invalidate]);

  // Labels are measured per size: a resize can rewrap them.
  useEffect(() => {
    invalidate();
  }, [size, invalidate]);

  useFrame(() => {
    projectOverlays({ bridge, anchors, dimensions, camera, size, controls });
  });

  return null;
}
