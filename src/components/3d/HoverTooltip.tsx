"use client";

import { useSyncExternalStore } from "react";
import { setOverlayElement, type ViewerBridge } from "@/lib/viewer-bridge";
import { GROUP_DESCRIPTIONS, GROUP_LABELS } from "./viewer-config";

/**
 * The small label that follows the pointer over a subsystem: its name and
 * one line on what it is. The canvas moves it (through the bridge) without a
 * React render; this component re-renders only when the group changes.
 */
export function HoverTooltip({ bridge }: { bridge: ViewerBridge }) {
  const group = useSyncExternalStore(
    bridge.hover.subscribe,
    bridge.hover.get,
    () => null,
  );
  return (
    <div
      ref={(node) => {
        setOverlayElement(bridge, "tooltip", node);
        return () => setOverlayElement(bridge, "tooltip", null);
      }}
      aria-hidden="true"
      className="group/tip pointer-events-none absolute top-0 left-0 z-(--z-raised)"
      style={{ visibility: group ? "visible" : "hidden" }}
    >
      <div className="w-max max-w-60 translate-x-4 translate-y-4 rounded-sm border border-line-strong bg-surface-2/95 px-3 py-2 shadow-lg backdrop-blur-sm group-data-[flip=1]/tip:-translate-x-[calc(100%+1rem)]">
        {group ? (
          <>
            <p className="font-display text-micro tracking-hud text-gold-300 uppercase">
              {GROUP_LABELS[group]}
            </p>
            <p className="mt-1 text-xs leading-snug text-ink-300">
              {GROUP_DESCRIPTIONS[group]}
            </p>
            <p className="mt-1.5 font-mono text-micro text-ink-400 uppercase">
              Select to inspect
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
