"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GOLD } from "@/lib/viewer-colors";
import type { CarMotion } from "./ProceduralCar";
import type { CarLayout } from "./car-layout";
import { cameraAt, type Shot } from "./tour-cameras";

/**
 * The parts shared by the two scroll-driven scenes: the anatomy tour on a
 * car's page and the story on the home page.
 *
 * The page owns the scroll: it writes a continuous `beat` (0 = first shot,
 * 1 = the next, …) into a ref, and the scene reads it every frame. Nothing
 * here causes a React render while scrolling — the camera, the rolling wheels
 * and the road are all set directly on objects.
 */

export type TourProgress = { beat: number };

/** Moves the camera, drives the car and keeps it clear of the text column. */
export function Director({
  shots,
  progressRef,
  shownRef,
  motionRef,
  reducedMotion,
  drive,
  phoneLift = true,
  fitWidth = 1.6,
}: {
  shots: Shot[];
  progressRef: RefObject<TourProgress>;
  /** The beat actually on screen, eased toward the scroll position. */
  shownRef: RefObject<number>;
  motionRef: RefObject<CarMotion>;
  reducedMotion: boolean;
  /** How far the car has driven at a given beat, in metres. */
  drive: (beat: number) => number;
  /**
   * On phones, lift the car into the top of the frame because the cards sit
   * over the bottom of it. False when the cards are laid out below the stage.
   */
  phoneLift?: boolean;
  /**
   * The narrowest aspect ratio (width / height) the shots are framed for; a
   * narrower stage backs the camera away until the car spans the same width.
   */
  fitWidth?: number;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const positionRef = useRef(new THREE.Vector3());
  const targetRef = useRef(new THREE.Vector3());
  const started = useRef(false);

  useFrame((_, delta) => {
    const position = positionRef.current;
    const target = targetRef.current;
    const goal = progressRef.current?.beat ?? 0;
    // Ease toward the scroll position so a flick of the wheel becomes a
    // camera move rather than a jump.
    const beat =
      !started.current || reducedMotion
        ? goal
        : THREE.MathUtils.damp(shownRef.current ?? goal, goal, 4, Math.min(delta, 0.1));
    started.current = true;
    shownRef.current = beat;
    // On-demand rendering: keep asking for frames until the camera has
    // caught up with the scroll position, then let the canvas idle.
    if (Math.abs(beat - goal) > 1e-4) invalidate();

    cameraAt(shots, beat, reducedMotion, position, target);
    // Shots are framed for a landscape screen. A portrait phone sees far less
    // width at the same distance, so back away until it covers the same
    // horizontal span — otherwise the car is cropped at every stop.
    const aspect = size.width / Math.max(1, size.height);
    const fit = Math.min(2.4, Math.max(1, fitWidth / aspect));
    if (fit > 1) position.sub(target).multiplyScalar(fit).add(target);
    camera.position.copy(position);
    camera.lookAt(target);

    // The road slides past and the wheels turn to match, so the motion reads
    // as the car driving rather than the camera drifting.
    if (!reducedMotion) motionRef.current.distance = drive(beat);

    // Offset the frame so the car sits beside the text, not under it: to the
    // right on wide screens, upward on phones where the cards sit low.
    const x =
      size.width >= 1024
        ? -size.width * 0.15
        : size.width >= 768
          ? -size.width * 0.07
          : 0;
    const y = phoneLift && size.width < 768 ? size.height * 0.2 : 0;
    camera.setViewOffset(size.width, size.height, x, y, size.width, size.height);
  });

  useEffect(() => () => camera.clearViewOffset(), [camera]);
  return null;
}

function setOpacity(material: THREE.Material, opacity: number): void {
  material.opacity = opacity;
}

/** Lane markings that slide under the car as it drives. */
export function Road({
  layout,
  motionRef,
  visibilityRef,
}: {
  layout: CarLayout;
  motionRef: RefObject<CarMotion>;
  /** 0–1, read every frame: fades the markings out (the blueprint's grid replaces them). */
  visibilityRef?: RefObject<number>;
}) {
  const spacing = 4.5;
  const count = 14;
  const span = spacing * count;
  const x = layout.spec.width / 2 + 1.05;
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(0.1, 1.5).rotateX(-Math.PI / 2),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (visibilityRef) {
      const visibility = visibilityRef.current ?? 1;
      setOpacity(material, 0.32 * visibility);
      if (groupRef.current) groupRef.current.visible = visibility > 0.001;
    }
    const distance = motionRef.current.distance;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const slot = index % count;
      const z = (((slot * spacing - distance) % span) + span) % span;
      mesh.position.z = z - span / 2;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0.004, 0]}>
      {Array.from({ length: count * 2 }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          geometry={geometry}
          material={material}
          position={[index < count ? x : -x, 0, 0]}
        />
      ))}
    </group>
  );
}
