"use client";

import { useEffect } from "react";
import type { ViewerGroup } from "@/types/domain";
import type { ViewerBridge } from "@/lib/viewer-bridge";
import type { HotspotDef } from "@/lib/viewer-hotspots";
import { cn } from "@/lib/utils";
import { GROUP_LABELS } from "./viewer-config";

/**
 * Hotspots: small markers anchored to the car. Each reveals its name on hover
 * or keyboard focus and opens its subsystem's panel when chosen. The canvas
 * positions them every frame through the bridge; a marker whose anchor is off
 * screen or not drawn (an engine the car does not have) stays hidden.
 */
export function HotspotMarkers({
  hotspots,
  bridge,
  onOpen,
}: {
  hotspots: HotspotDef[];
  bridge: ViewerBridge;
  onOpen: (group: ViewerGroup) => void;
}) {
  // New markers need one projection before they can be seen.
  useEffect(() => {
    bridge.requestFrame.current?.();
  }, [bridge, hotspots]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          ref={(node) => {
            if (!node) return;
            bridge.overlay.points.set(hotspot.id, node);
            return () => {
              bridge.overlay.points.delete(hotspot.id);
            };
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ visibility: "hidden" }}
        >
          <button
            type="button"
            onClick={() => onOpen(hotspot.group)}
            aria-label={`${hotspot.label} — open ${GROUP_LABELS[hotspot.group]}`}
            className="group/spot pointer-events-auto absolute -top-[22px] -left-[22px] grid size-11 place-items-center rounded-full focus-visible:outline-offset-0"
          >
            <span className="relative grid size-4 place-items-center rounded-full border border-gold-300/90 bg-void/60 shadow-[0_0_0_4px_rgb(200_163_74/0.14)] transition-transform duration-(--duration-fast) group-hover/spot:scale-125 group-focus-visible/spot:scale-125">
              <span className="size-1.5 rounded-full bg-gold-300" />
            </span>
            <span
              className={cn(
                "absolute top-1/2 left-[calc(100%-6px)] -translate-y-1/2 border border-gold-700/60 bg-void/85 px-2 py-1 whitespace-nowrap backdrop-blur-sm",
                "font-mono text-micro tracking-hud text-gold-200 uppercase",
                "opacity-0 transition-opacity duration-(--duration-fast) group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100",
              )}
            >
              {hotspot.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * The same hotspots, and every subsystem, as a plain list of buttons: the
 * keyboard and screen-reader route into the car, independent of where the
 * camera happens to be pointing.
 */
export function ComponentIndex({
  hotspots,
  groups,
  onOpen,
}: {
  hotspots: HotspotDef[];
  groups: ViewerGroup[];
  onOpen: (group: ViewerGroup) => void;
}) {
  return (
    <details className="group/index border border-line">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-label transition-colors hover:text-ink-200">
        Inspect a subsystem
        <span
          aria-hidden="true"
          className="font-mono text-micro text-ink-500 transition-transform group-open/index:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="space-y-5 border-t border-line-subtle px-4 py-4">
        <div>
          <p className="text-hud">Components</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {hotspots.map((hotspot) => (
              <li key={hotspot.id}>
                <button
                  type="button"
                  onClick={() => onOpen(hotspot.group)}
                  className="min-h-11 rounded-xs border border-line px-3 text-xs text-ink-300 transition-colors duration-(--duration-fast) hover:border-gold-700 hover:text-gold-300 sm:min-h-9"
                >
                  {hotspot.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-hud">Subsystems</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {groups.map((group) => (
              <li key={group}>
                <button
                  type="button"
                  onClick={() => onOpen(group)}
                  className="min-h-11 rounded-xs border border-line px-3 text-xs text-ink-300 transition-colors duration-(--duration-fast) hover:border-gold-700 hover:text-gold-300 sm:min-h-9"
                >
                  {GROUP_LABELS[group]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
