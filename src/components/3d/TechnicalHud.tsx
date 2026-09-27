"use client";

import { setOverlayElement, type ViewerBridge } from "@/lib/viewer-bridge";
import { cn } from "@/lib/utils";

export type HudEntry = { label: string; value: string };

/**
 * A quiet technical read-out in the stage's corner: the figures the page hands
 * in (`hud`), the current view, and a live camera line (azimuth, elevation,
 * distance) written by the canvas without re-rendering React.
 */
export function TechnicalHud({
  entries,
  mode,
  bridge,
  className,
}: {
  entries: HudEntry[];
  /** What the viewer is showing, e.g. "Front 3/4 · X-ray". */
  mode: string;
  bridge: ViewerBridge;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-3 max-w-[70%] bg-void/55 px-3 py-2.5 backdrop-blur-[2px] hud-corners",
        className,
      )}
    >
      <p className="font-mono text-micro tracking-hud text-gold-300 uppercase">{mode}</p>
      {entries.length > 0 ? (
        <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          {entries.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="font-mono text-micro tracking-hud text-ink-400 uppercase">
                {label}
              </dt>
              <dd className="tabular text-right font-mono text-micro text-ink-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p
        ref={(node) => {
          setOverlayElement(bridge, "telemetry", node);
          return () => setOverlayElement(bridge, "telemetry", null);
        }}
        aria-hidden="true"
        className="mt-1.5 font-mono text-micro tracking-hud text-ink-400 tabular-nums"
      />
    </div>
  );
}
