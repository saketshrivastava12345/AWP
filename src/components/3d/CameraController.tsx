"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three";
import { setCommands, type ViewerCommands } from "@/lib/viewer-bridge";
import type { PresetId } from "@/lib/viewer-presets";
import { framePreset, type CameraPreset, type Vec3 } from "./viewer-config";

/**
 * The viewer's camera: orbit, pan and zoom by pointer, touch, wheel, the
 * toolbar and the keyboard; smooth moves between presets; auto-rotate.
 *
 * Built on camera-controls (via drei), which damps every move — preset
 * changes included — along the sphere around the target, so the camera
 * swings around the car instead of cutting through it. Each damped step asks
 * for a frame and the requests stop when the camera comes to rest, which is
 * what lets the canvas render on demand.
 *
 * A preset request carries a nonce, so asking for the preset the camera is
 * already "on" — RESET after orbiting, or clicking the active preset again —
 * always reframes.
 */

const { ACTION } = CameraControlsImpl;

/** Radians per second: one turn in about 25 s, a showroom turntable. */
const AUTO_ROTATE_SPEED = 0.25;
/** After the visitor lets go, wait this long before turning again. */
const AUTO_ROTATE_RESUME_MS = 2200;
/** Never below the floor: the camera stays at or above the look-at height. */
const MAX_POLAR = Math.PI / 2 - 0.02;

export type PresetRequest = { id: PresetId; nonce: number };

export function CameraController({
  presets,
  request,
  exploded,
  length,
  bounds,
  autoRotate,
  enabled,
  panMode,
  reducedMotion,
  commandsRef,
  onInteract,
  onAwakeChange,
}: {
  presets: Record<PresetId, CameraPreset>;
  request: PresetRequest;
  exploded: boolean;
  /** Car length, metres: scales distances and the explode framing. */
  length: number;
  /** Where the look-at point may be panned to. */
  bounds: { min: Vec3; max: Vec3 };
  autoRotate: boolean;
  /** Pointer and touch input (off in the mobile scroll-safe state). */
  enabled: boolean;
  /** The primary button pans instead of orbiting. */
  panMode: boolean;
  reducedMotion: boolean;
  /** Filled with the camera's imperative moves while mounted. */
  commandsRef: RefObject<ViewerCommands | null>;
  /** The visitor moved the camera themselves. */
  onInteract?: () => void;
  /** The camera started or stopped moving. */
  onAwakeChange?: (awake: boolean) => void;
}) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const aspect = size.width / Math.max(1, size.height);

  const scale = length / 4.5;
  const interacting = useRef(false);
  const resumeAt = useRef(0);
  /** The camera is still where the last preset put it. */
  const atPreset = useRef(false);
  const first = useRef(true);
  const aspectRef = useRef(aspect);
  useLayoutEffect(() => {
    aspectRef.current = aspect;
  }, [aspect]);

  // --- presets ------------------------------------------------------------
  const apply = useCallback(
    (transition: boolean) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const preset = presets[request.id] ?? presets.front34;
      const { position, target } = framePreset(preset, {
        aspect: aspectRef.current,
        exploded,
        length,
      });
      // Unwind any accumulated turns, so the move takes the short way round.
      controls.normalizeRotations();
      void controls.setLookAt(...position, ...target, transition);
      atPreset.current = true;
      invalidate();
    },
    [presets, request, exploded, length, invalidate],
  );

  useLayoutEffect(() => {
    const transition = !first.current && !reducedMotion;
    first.current = false;
    apply(transition);
  }, [apply, reducedMotion]);

  // A resize (fullscreen, rotation) reframes, but only if the visitor has not
  // moved the camera since the preset: their view is theirs.
  const framedAspect = useRef(aspect);
  useEffect(() => {
    if (Math.abs(framedAspect.current - aspect) < 0.01) return;
    framedAspect.current = aspect;
    if (atPreset.current) apply(false);
  }, [aspect, apply]);

  // --- input configuration ------------------------------------------------
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.mouseButtons.left = panMode ? ACTION.TRUCK : ACTION.ROTATE;
    controls.mouseButtons.right = panMode ? ACTION.ROTATE : ACTION.TRUCK;
    controls.mouseButtons.wheel = ACTION.DOLLY;
    controls.touches.one = panMode ? ACTION.TOUCH_TRUCK : ACTION.TOUCH_ROTATE;
    // Pinch zooms and two fingers pan, together, as on a map.
    controls.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    controls.touches.three = ACTION.TOUCH_TRUCK;
  }, [panMode]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // camera-controls sets the element's touch-action itself: "none" while
    // enabled, cleared (so the page scrolls) while disabled.
    controls.enabled = enabled;
  }, [enabled]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.setBoundary(
      new THREE.Box3(new THREE.Vector3(...bounds.min), new THREE.Vector3(...bounds.max)),
    );
  }, [bounds]);

  // --- toolbar and keyboard commands --------------------------------------
  useEffect(() => {
    const transition = !reducedMotion;
    setCommands(commandsRef, {
      zoom(direction) {
        const controls = controlsRef.current;
        if (!controls) return;
        atPreset.current = false;
        void controls.dolly(direction * controls.distance * 0.22, transition);
        invalidate();
      },
      orbit(azimuth, polar) {
        const controls = controlsRef.current;
        if (!controls) return;
        atPreset.current = false;
        void controls.rotate(azimuth, polar, transition);
        invalidate();
      },
      pan(x, y) {
        const controls = controlsRef.current;
        if (!controls) return;
        atPreset.current = false;
        void controls.truck(x * scale, y * scale, transition);
        invalidate();
      },
    });
    return () => setCommands(commandsRef, null);
  }, [commandsRef, reducedMotion, scale, invalidate]);

  // --- auto-rotate ----------------------------------------------------------
  useEffect(() => {
    if (autoRotate) invalidate();
  }, [autoRotate, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !autoRotate || reducedMotion) return;
    if (interacting.current || performance.now() < resumeAt.current) {
      // Keep the loop alive until it is time to turn again.
      invalidate();
      return;
    }
    atPreset.current = false;
    void controls.rotate(Math.min(delta, 0.1) * AUTO_ROTATE_SPEED, 0, false);
  }, -2);

  // --- events -----------------------------------------------------------------
  const handleStart = useCallback(() => {
    interacting.current = true;
    atPreset.current = false;
    onInteract?.();
  }, [onInteract]);
  const handleEnd = useCallback(() => {
    interacting.current = false;
    resumeAt.current = performance.now() + AUTO_ROTATE_RESUME_MS;
  }, []);
  const handleWake = useCallback(() => onAwakeChange?.(true), [onAwakeChange]);
  const handleSleep = useCallback(() => onAwakeChange?.(false), [onAwakeChange]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      minDistance={0.6}
      maxDistance={24 * scale}
      maxPolarAngle={MAX_POLAR}
      dollySpeed={0.6}
      truckSpeed={1.6}
      onControlStart={handleStart}
      onControlEnd={handleEnd}
      onWake={handleWake}
      onSleep={handleSleep}
    />
  );
}
