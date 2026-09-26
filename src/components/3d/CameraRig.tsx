"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DEFAULT_PRESET, type CameraPreset } from "./viewer-config";

/**
 * Moves the camera to a preset with a GSAP tween.
 *
 * Both the camera position and the OrbitControls target are animated, because
 * moving only the camera swings the framing wildly as the look-at point stays
 * put. `controls.update()` runs on every tick so damping does not fight the
 * tween.
 *
 * When reduced motion is set the camera jumps to the preset instead.
 */
export function CameraRig({
  preset,
  presets,
  controlsRef,
  reducedMotion,
  onArrive,
}: {
  preset: string;
  /** Presets for this car, from `cameraPresets(layout)`. */
  presets: CameraPreset[];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  reducedMotion: boolean;
  onArrive?: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const target =
      presets.find((entry) => entry.id === preset) ??
      presets.find((entry) => entry.id === DEFAULT_PRESET);
    if (!target) return;

    const controls = controlsRef.current;

    // The very first render should start framed, not animate in from the
    // default camera position.
    if (isFirstRun.current || reducedMotion) {
      isFirstRun.current = false;
      camera.position.set(...target.position);
      if (controls) {
        controls.target.set(...target.target);
        controls.update();
      }
      invalidate();
      onArrive?.();
      return;
    }

    const tween = gsap.to(
      {
        px: camera.position.x,
        py: camera.position.y,
        pz: camera.position.z,
        tx: controls?.target.x ?? 0,
        ty: controls?.target.y ?? 0,
        tz: controls?.target.z ?? 0,
      },
      {
        px: target.position[0],
        py: target.position[1],
        pz: target.position[2],
        tx: target.target[0],
        ty: target.target[1],
        tz: target.target[2],
        duration: 1.1,
        ease: "power3.inOut",
        onUpdate() {
          const values = this.targets()[0] as Record<string, number>;
          camera.position.set(values.px ?? 0, values.py ?? 0, values.pz ?? 0);
          if (controls) {
            controls.target.set(values.tx ?? 0, values.ty ?? 0, values.tz ?? 0);
            controls.update();
          }
          invalidate();
        },
        onComplete: onArrive,
      },
    );

    return () => {
      tween.kill();
    };
  }, [preset, presets, camera, controlsRef, invalidate, reducedMotion, onArrive]);

  return null;
}
