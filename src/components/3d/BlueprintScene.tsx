"use client";

import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ViewerGroup } from "@/types/domain";
import {
  blueprintFrame,
  focusCardAt,
  groupCard,
  type BlueprintOverlay,
} from "@/lib/blueprint";
import { GOLD, VIEWER_COLORS, VOID } from "@/lib/viewer-colors";
import type { DimensionId, PublishedDimensions } from "@/lib/viewer-dimensions";
import type { CarLayout } from "./car-layout";
import { dimensionLines } from "./dimension-geometry";
import type { BlueprintState } from "./ProceduralCar";

/**
 * The parts of the blueprint that are not the car: the technical ground, the
 * dimension lines, the driver that turns the scroll position into the car's
 * separation, and the projector that pins the DOM labels to the parts.
 *
 * Everything runs off refs inside the render loop. The only React state is
 * the focus card, which changes a dozen times over the whole section.
 */

/** Blueprint line work is decoration: never picked by the pointer. */
const noRaycast = () => null;

// ---------------------------------------------------------------------------
// Ground: a matte sheet over the showroom floor, and a technical grid on it
// ---------------------------------------------------------------------------

const GRID_HALF = 12;

function gridGeometry(step: number, skip: number | null): THREE.BufferGeometry {
  const points: number[] = [];
  const count = Math.round(GRID_HALF / step);
  for (let index = -count; index <= count; index += 1) {
    if (skip !== null && index % skip === 0) continue;
    const at = index * step;
    points.push(-GRID_HALF, 0, at, GRID_HALF, 0, at);
    points.push(at, 0, -GRID_HALF, at, 0, GRID_HALF);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function useGround() {
  return useMemo(() => {
    const geometry = {
      sheet: new THREE.CircleGeometry(GRID_HALF * 2.5, 48).rotateX(-Math.PI / 2),
      // 25 cm minor squares in ink, metre lines in gold.
      minor: gridGeometry(0.25, 4),
      major: gridGeometry(1, null),
    };
    const sheet = new THREE.MeshBasicMaterial({
      color: VOID,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const minor = new THREE.LineBasicMaterial({
      color: VIEWER_COLORS.ink,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const major = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return {
      geometry,
      sheet,
      minor,
      major,
      dispose: () => {
        Object.values(geometry).forEach((entry) => entry.dispose());
        sheet.dispose();
        minor.dispose();
        major.dispose();
      },
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Dimension lines, from the published figures only
// ---------------------------------------------------------------------------

const TICK = 0.07;

/** Line segments for every published measurement: line, extensions and end ticks. */
function dimensionGeometry(
  layout: CarLayout,
  dimensions: PublishedDimensions,
): THREE.BufferGeometry {
  const lines = dimensionLines(layout, dimensions);
  const points: number[] = [];
  const push = (a: THREE.Vector3, b: THREE.Vector3) =>
    points.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const along = new THREE.Vector3();
  const across = new THREE.Vector3();
  const slash = new THREE.Vector3();

  for (const line of Object.values(lines)) {
    push(line.a, line.b);
    if (line.extA) push(line.extA[0], line.extA[1]);
    if (line.extB) push(line.extB[0], line.extB[1]);
    // Architectural ticks: a short 45° slash through each end.
    along.subVectors(line.b, line.a).normalize();
    const ext = line.extB ?? line.extA;
    if (ext) across.subVectors(ext[1], ext[0]).normalize();
    else across.set(1, 0, 0);
    slash.copy(along).add(across).normalize().multiplyScalar(TICK);
    for (const end of [line.a, line.b]) {
      push(end.clone().sub(slash), end.clone().add(slash));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

// ---------------------------------------------------------------------------
// The driver: scroll position → the car, the ground, the fog
// ---------------------------------------------------------------------------

export function BlueprintRig({
  layout,
  groups,
  dimensions,
  shownRef,
  state,
  roadRef,
  floorRef,
}: {
  layout: CarLayout;
  /** The groups taken apart, in order. */
  groups: readonly ViewerGroup[];
  dimensions: PublishedDimensions | null;
  /** The beat on screen, eased by the Director. */
  shownRef: RefObject<number>;
  state: RefObject<BlueprintState>;
  /** Visibility of the road markings, written here. */
  roadRef: RefObject<number>;
  /** The showroom floor, hidden once the sheet covers it. */
  floorRef: RefObject<THREE.Group | null>;
}) {
  const scene = useThree((three) => three.scene);
  const ground = useGround();
  useEffect(() => () => ground.dispose(), [ground]);

  const measures = useMemo(
    () => (dimensions ? dimensionGeometry(layout, dimensions) : null),
    [layout, dimensions],
  );
  useEffect(() => () => measures?.dispose(), [measures]);
  const dimensionMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: VIEWER_COLORS.goldLight,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  useEffect(() => () => dimensionMaterial.dispose(), [dimensionMaterial]);

  useFrame(() => {
    const beat = shownRef.current ?? 0;
    const values = blueprintFrame(beat, groups.length);
    const current = state.current;
    current.drawing = values.drawing;
    groups.forEach((group, index) => {
      current.explode[group] = values.explode[index] ?? 0;
    });

    const d = values.drawing;
    roadRef.current = 1 - d;
    ground.sheet.opacity = d;
    ground.minor.opacity = 0.07 * d;
    ground.major.opacity = 0.16 * d;
    // The reflective floor renders the scene a second time: once the sheet
    // hides it completely, stop drawing it.
    if (floorRef.current) floorRef.current.visible = d < 0.999;
    dimensionMaterial.opacity = 0.85 * values.dimensions;
    dimensionMaterial.visible = values.dimensions > 0.002;

    // The exploded car is larger than the assembled one: push the fog back.
    const fog = scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.near = 11 + 8 * d;
      fog.far = 32 + 14 * d;
    }
  });

  return (
    <group>
      <mesh
        geometry={ground.geometry.sheet}
        material={ground.sheet}
        position={[0, 0.002, 0]}
        renderOrder={-2}
        raycast={noRaycast}
      />
      <lineSegments
        geometry={ground.geometry.minor}
        material={ground.minor}
        position={[0, 0.003, 0]}
        renderOrder={-1}
        raycast={noRaycast}
      />
      <lineSegments
        geometry={ground.geometry.major}
        material={ground.major}
        position={[0, 0.004, 0]}
        renderOrder={-1}
        raycast={noRaycast}
      />
      {measures ? (
        <lineSegments
          geometry={measures}
          material={dimensionMaterial}
          renderOrder={10}
          raycast={noRaycast}
        />
      ) : null}
    </group>
  );
}

// ---------------------------------------------------------------------------
// The projector: 3D points → DOM labels
// ---------------------------------------------------------------------------

const world = new THREE.Vector3();
const ndc = new THREE.Vector3();

/**
 * Pins the overlay's labels to the scene every frame. Rendered after
 * everything that moves (the Director and the car), so it projects the
 * frame that is about to be drawn.
 */
export function BlueprintLabels({
  layout,
  groups,
  dimensions,
  shownRef,
  state,
  overlay,
}: {
  layout: CarLayout;
  groups: readonly ViewerGroup[];
  dimensions: PublishedDimensions | null;
  shownRef: RefObject<number>;
  state: RefObject<BlueprintState>;
  overlay: BlueprintOverlay | null;
}) {
  const camera = useThree((three) => three.camera);
  const size = useThree((three) => three.size);
  const dimensionLabels = useMemo(() => {
    if (!dimensions) return null;
    const lines = dimensionLines(layout, dimensions);
    return (Object.entries(lines) as [DimensionId, { a: THREE.Vector3; b: THREE.Vector3 }][])
      .map(([id, line]): [DimensionId, THREE.Vector3] => [id, line.a.clone().lerp(line.b, 0.5)]);
  }, [layout, dimensions]);

  useFrame(() => {
    if (!overlay) return;
    const beat = shownRef.current ?? 0;
    const values = blueprintFrame(beat, groups.length);
    camera.updateMatrixWorld();

    const place = (element: HTMLElement, point: THREE.Vector3, opacity: number) => {
      ndc.copy(point).project(camera);
      const onScreen =
        ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < 1.05 && Math.abs(ndc.y) < 1.05;
      const shown = onScreen && opacity > 0.01;
      const value = shown ? opacity.toFixed(3) : "0";
      if (element.style.opacity !== value) element.style.opacity = value;
      if (!shown) return;
      const x = (ndc.x * 0.5 + 0.5) * size.width;
      const y = (-ndc.y * 0.5 + 0.5) * size.height;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    if (overlay.grid) {
      const value = (0.9 * values.drawing).toFixed(3);
      if (overlay.grid.style.opacity !== value) overlay.grid.style.opacity = value;
    }

    for (const [id, point] of dimensionLabels ?? []) {
      const element = overlay.dimensions.get(id);
      if (element) place(element, point, values.dimensions);
    }

    const focus = focusCardAt(beat, groups.length);
    groups.forEach((group, index) => {
      const element = overlay.groups.get(group);
      if (!element) return;
      const anchor = state.current.labels.get(group);
      if (!anchor) {
        element.style.opacity = "0";
        return;
      }
      anchor.object.updateWorldMatrix(true, false);
      world.copy(anchor.local).applyMatrix4(anchor.object.matrixWorld);
      // The finale labels every group; before it, only the part in motion.
      const own = focus === groupCard(index) ? (values.explode[index] ?? 0) : 0;
      place(element, world, Math.max(values.labels, own));
    });
  });

  return null;
}
