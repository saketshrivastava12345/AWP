"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CarLayout } from "./car-layout";
import type { BodyGeometry } from "./body-geometry";
import { GOLD, type MaterialKit } from "./car-materials";
import { SHELL_PAINT, SHELL_TRIM, SHELL_UNDER } from "./car-shape";
import { grilleTexture, headlightTexture, taillightTexture } from "./car-parts";

/**
 * The body subsystem: shell, glass, lamps and exterior trim.
 *
 * `ghost` fades the bodywork to a translucent shell with its panel edges
 * traced in gold, so the mechanical systems inside can be seen without the
 * car losing its shape. X-ray, the interior and engine views, and the tour
 * all use it. The geometry is built once per car (body-geometry.ts); this
 * component owns only the materials and the fade.
 */

type Fade = { material: THREE.Material; base: number; ghost: number };

/** Set every body material between solid (0) and ghosted (1). */
function applyGhost(fades: Fade[], edges: THREE.LineBasicMaterial, amount: number): void {
  for (const { material, base, ghost } of fades) {
    const opacity = THREE.MathUtils.lerp(base, ghost, amount);
    material.opacity = opacity;
    const transparent = opacity < 0.999;
    // Toggling `transparent` changes the compiled shader program; without
    // needsUpdate three keeps the old one and the shell stays solid (seen on
    // the LOW quality tier, where nothing else forces a rebuild).
    if (material.transparent !== transparent) {
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    // A ghosted shell must not hide what is behind it in the depth buffer.
    material.depthWrite = amount < 0.35 && base >= 1;
  }
  edges.opacity = 0.55 * amount;
}

/** Decorative and duplicate surfaces are never picked by the pointer. */
const noRaycast = () => null;

export function CarBody({
  layout,
  geometry,
  kit,
  ghost,
  glassTransmission = false,
  edgeMaterial = null,
}: {
  layout: CarLayout;
  geometry: BodyGeometry;
  kit: MaterialKit;
  /** 0 = solid bodywork, 1 = translucent shell. */
  ghost: number;
  /** The windscreen is drawn by transmission (solid base opacity). */
  glassTransmission?: boolean;
  /**
   * Draw the panel lines with this material instead of the body's own gold
   * one, so the blueprint can tone them (its opacity still follows `ghost`).
   */
  edgeMaterial?: THREE.LineBasicMaterial | null;
}) {
  const { def } = layout.spec;
  const invalidate = useThree((state) => state.invalidate);

  // --- materials --------------------------------------------------------------
  const decalMaterials = useMemo(() => {
    const head = headlightTexture(def.headlights);
    const tail = taillightTexture();
    const grille = grilleTexture(def.grille);
    const decal = {
      transparent: true,
      alphaTest: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      depthWrite: false,
    };
    const materials = {
      head: new THREE.MeshStandardMaterial({
        ...decal,
        map: head,
        emissiveMap: head,
        emissive: "#ffffff",
        emissiveIntensity: 1.3,
        roughness: 0.12,
        metalness: 0.4,
      }),
      tail: new THREE.MeshStandardMaterial({
        ...decal,
        map: tail,
        emissiveMap: tail,
        emissive: "#ff2a2a",
        emissiveIntensity: 1.35,
        roughness: 0.2,
      }),
      grille: new THREE.MeshStandardMaterial({
        ...decal,
        map: grille,
        roughness: 0.55,
        metalness: 0.3,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: "#060607",
        roughness: 0.45,
        metalness: 0.3,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#c9cbd0",
        roughness: 0.15,
        metalness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
      edges: new THREE.LineBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    };
    return {
      materials,
      // Textures are kept: a development double-mount disposes and then
      // reuses this object, and three re-uploads a disposed texture on use.
      dispose: () => {
        for (const material of Object.values(materials)) material.dispose();
        head?.dispose();
        tail?.dispose();
        grille?.dispose();
      },
    };
  }, [def.headlights, def.grille]);

  useEffect(() => () => decalMaterials.dispose(), [decalMaterials]);

  const glassMaterial = kit.get("glass");
  const edges = edgeMaterial ?? decalMaterials.materials.edges;

  // Every body material, with its solid opacity and its ghosted opacity.
  const fades = useMemo<Fade[]>(() => {
    const entries: [THREE.Material, number, number][] = [
      [kit.get("paint"), 1, 0.07],
      [kit.get("lining"), 1, 0],
      [kit.get("under"), 1, 0.05],
      [kit.get("trim"), 1, 0.08],
      [kit.get("well"), 1, 0],
      [glassMaterial, glassTransmission ? 1 : 0.42, 0.03],
      [kit.get("sideGlass"), 1, 0.04],
      [kit.get("satin"), 1, 0.1],
      [kit.get("chrome"), 1, 0.15],
      [kit.get("carbon"), 1, 0.12],
      [kit.get("tyre"), 1, 1],
      [decalMaterials.materials.head, 1, 0.1],
      [decalMaterials.materials.tail, 1, 0.14],
      [decalMaterials.materials.grille, 1, 0.06],
      [decalMaterials.materials.trim, 1, 0.08],
      [decalMaterials.materials.chrome, 1, 0.12],
    ];
    return entries.map(([material, base, ghostOpacity]) => ({
      material,
      base,
      ghost: ghostOpacity,
    }));
  }, [kit, glassMaterial, glassTransmission, decalMaterials]);

  // The fade is eased toward `ghost` a frame at a time; -1 means "apply the
  // target outright", which happens on mount and whenever the set of
  // materials changes.
  const current = useRef(-1);
  const liningRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    current.current = -1;
    invalidate();
  }, [fades, edges, invalidate]);

  useEffect(() => {
    invalidate();
  }, [ghost, invalidate]);

  useFrame((_, delta) => {
    const target = ghost;
    const previous = current.current;
    const next =
      previous < 0
        ? target
        : THREE.MathUtils.damp(previous, target, 5, Math.min(delta, 0.1));
    if (previous >= 0 && Math.abs(next - previous) < 0.0005) return;
    current.current = Math.abs(next - target) < 0.002 ? target : next;
    applyGhost(fades, edges, current.current);
    if (liningRef.current) liningRef.current.visible = current.current < 0.6;
    // Keep frames coming until the fade has settled (on-demand rendering).
    if (current.current !== target) invalidate();
  });

  const shellMaterials = useMemo(() => {
    const slots: THREE.Material[] = [];
    slots[SHELL_PAINT] = kit.get("paint");
    slots[SHELL_UNDER] = kit.get("under");
    slots[SHELL_TRIM] = kit.get("trim");
    return slots;
  }, [kit]);

  const paintMaterial = kit.get("paint");

  return (
    <group name="body-shell">
      <mesh
        geometry={geometry.shell}
        material={shellMaterials}
        castShadow
        receiveShadow
      />
      <mesh
        ref={liningRef}
        geometry={geometry.shell}
        material={kit.get("lining")}
        raycast={noRaycast}
      />
      <lineSegments geometry={geometry.edges} material={edges} raycast={noRaycast} />

      {geometry.glass.map((glass, index) => (
        <mesh key={index} geometry={glass} material={glassMaterial} renderOrder={2} />
      ))}
      {geometry.sideGlass.map((glass, index) => (
        <mesh key={index} geometry={glass} material={kit.get("sideGlass")} />
      ))}

      {geometry.decals.map(({ geometry: decal, kind }, index) => (
        <mesh
          key={index}
          geometry={decal}
          material={decalMaterials.materials[kind]}
          renderOrder={3}
          raycast={noRaycast}
        />
      ))}

      {geometry.mirrors.map(({ side, base }) => (
        <group key={side} position={base}>
          <mesh
            geometry={geometry.mirrorShell}
            position={[side * 0.1, 0.045, -0.02]}
            scale={[0.075, 0.055, 0.105]}
            material={paintMaterial}
            castShadow
          />
          <mesh
            geometry={geometry.mirrorArm}
            position={[side * 0.045, 0.012, 0]}
            material={kit.get("trim")}
          />
        </group>
      ))}

      {layout.wheels.map(({ position, side }, index) => (
        <group key={index} position={[0, position.y, position.z]}>
          <mesh
            geometry={geometry.liner}
            material={kit.get("well")}
            position={[side * geometry.linerCenterX, 0, 0]}
          />
          <mesh
            geometry={geometry.plate}
            material={kit.get("well")}
            position={[side * geometry.plateX, 0, 0]}
          />
        </group>
      ))}

      {geometry.spoiler ? (
        <mesh
          geometry={geometry.spoiler}
          material={paintMaterial}
          position={geometry.spoilerAt}
          castShadow
        />
      ) : null}
      {geometry.wing ? (
        <group position={geometry.spoilerAt}>
          <mesh geometry={geometry.wing.blade} material={kit.get("carbon")} castShadow />
          <mesh geometry={geometry.wing.posts} material={kit.get("carbon")} />
        </group>
      ) : null}

      {geometry.rails.map((rail, index) => (
        <mesh key={index} geometry={rail} material={kit.get("satin")} />
      ))}

      {geometry.spare ? (
        <group position={geometry.spare.at}>
          <mesh geometry={geometry.spare.tyre} material={kit.get("tyre")} />
          <mesh geometry={geometry.spare.rim} material={kit.get("satin")} />
          <mesh geometry={geometry.spare.spokes} material={kit.get("satin")} />
        </group>
      ) : null}
    </group>
  );
}
