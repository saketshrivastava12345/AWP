"use client";

import { useSyncExternalStore } from "react";
import { probeWebGL } from "@/lib/viewer-webgl";
import {
  selectQuality,
  type DeviceSignals,
  type QualityDecision,
} from "@/lib/viewer-quality";

/**
 * The quality level this device should start at, from what it reports about
 * itself: pointer type, screen size, memory, CPU cores and — through a
 * one-off WebGL probe — the GPU's own name.
 *
 * The signals do not change during a visit, so they are read once and cached.
 * `null` during server rendering and hydration, where none of them exist.
 */

type NavigatorSignals = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export type GpuTier = QualityDecision & { signals: DeviceSignals };

let cached: GpuTier | null = null;

export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as NavigatorSignals;
  const media = (query: string) =>
    typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const screenMin =
    typeof screen !== "undefined" ? Math.min(screen.width, screen.height) || null : null;
  return {
    // A laptop with a touchscreen still has a fine pointer: treat it as one.
    coarsePointer: !media("(any-pointer: fine)"),
    screenMin,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    renderer: probeWebGL().renderer,
    saveData: nav.connection?.saveData === true,
  };
}

function getSnapshot(): GpuTier {
  if (!cached) {
    const signals = readDeviceSignals();
    cached = { ...selectQuality(signals), signals };
  }
  return cached;
}

const subscribe = () => () => {};
const getServerSnapshot = () => null;

export function useGpuTier(): GpuTier | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
