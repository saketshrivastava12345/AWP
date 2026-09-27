"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { PowertrainKind, ViewerGroup } from "@/types/domain";
import type { ViewerBridge } from "@/lib/viewer-bridge";

/**
 * X-ray / Engineering mode: the body turns to a transparent shell, the
 * powertrain comes forward, and labelled leader lines point at its
 * components. This module decides WHAT is called out (by powertrain) and
 * draws the labels; the canvas does the ghosting and projects the anchors.
 */

export type Callout = {
  /** Matches an anchor `callout:<id>` registered by the car. */
  id: "engine" | "transmission" | "battery" | "motor" | "suspension" | "exhaust";
  label: string;
  /** A short fact from the catalogue, when there is one. */
  note: string | null;
};

/** Which subsystems X-ray brings forward, by powertrain. */
export function xrayEmphasis(kind: PowertrainKind, groups: ViewerGroup[]): ViewerGroup[] {
  const wanted: ViewerGroup[] =
    kind === "electric"
      ? ["battery", "transmission", "suspension"]
      : kind === "hybrid"
        ? ["engine", "battery", "transmission", "suspension", "exhaust"]
        : ["engine", "transmission", "suspension", "exhaust"];
  return wanted.filter((group) => groups.includes(group));
}

/** The first two facts of a " · "-joined note: enough for a label. */
function shortNote(note: string | undefined): string | null {
  if (!note) return null;
  return note.split(" · ").slice(0, 2).join(" · ") || null;
}

/** The callouts for a car: its engine or battery and motors, driveline and chassis. */
export function xrayCallouts(
  kind: PowertrainKind,
  groups: ViewerGroup[],
  notes: Partial<Record<ViewerGroup, string>>,
  hasMotors: boolean,
): Callout[] {
  const callouts: Callout[] = [];
  if (groups.includes("engine"))
    callouts.push({ id: "engine", label: "Engine", note: shortNote(notes.engine) });
  if (groups.includes("battery"))
    callouts.push({ id: "battery", label: "Battery", note: shortNote(notes.battery) });
  if (hasMotors && kind !== "combustion")
    callouts.push({
      id: "motor",
      label: kind === "electric" ? "Drive motor" : "Electric motor",
      note: null,
    });
  callouts.push({
    id: "transmission",
    label: kind === "electric" ? "Reduction drive" : "Transmission",
    note: shortNote(notes.transmission),
  });
  callouts.push({ id: "suspension", label: "Suspension", note: null });
  if (groups.includes("exhaust"))
    callouts.push({ id: "exhaust", label: "Exhaust", note: null });
  return callouts;
}

function CalloutLabel({ callout, bridge }: { callout: Callout; bridge: ViewerBridge }) {
  const leader = useRef<SVGPolylineElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const label = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!leader.current || !dot.current || !label.current) return;
    bridge.overlay.callouts.set(callout.id, {
      leader: leader.current,
      dot: dot.current,
      label: label.current,
    });
    bridge.requestFrame.current?.();
    return () => {
      bridge.overlay.callouts.delete(callout.id);
    };
  }, [bridge, callout.id]);

  const hidden = { visibility: "hidden" } as const;
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <polyline
          ref={leader}
          fill="none"
          className="stroke-gold-400/80"
          strokeWidth={1}
          style={hidden}
        />
        <circle
          ref={dot}
          r={3}
          className="fill-gold-300 stroke-void"
          strokeWidth={1}
          style={hidden}
        />
      </svg>
      <div
        ref={label}
        className="pointer-events-none absolute top-0 left-0 max-w-44 border-l border-gold-500 bg-void/80 px-2.5 py-1.5 backdrop-blur-sm will-change-transform sm:max-w-56"
        style={hidden}
      >
        <p className="font-display text-micro tracking-hud text-gold-200 uppercase">
          {callout.label}
        </p>
        {callout.note ? (
          <p className="mt-0.5 truncate font-mono text-micro text-ink-300 max-sm:hidden">
            {callout.note}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function EngineeringCallouts({
  callouts,
  bridge,
}: {
  callouts: Callout[];
  bridge: ViewerBridge;
}) {
  useEffect(() => {
    bridge.requestFrame.current?.();
  }, [bridge, callouts]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* A phone-width stage has no room for label columns beside the car:
          they would sit on top of it. There the x-ray view speaks for itself
          and the hotspots stay tappable; the list below is still read out. */}
      <div className="contents max-sm:hidden">
        {callouts.map((callout) => (
          <CalloutLabel key={callout.id} callout={callout} bridge={bridge} />
        ))}
      </div>
      <ul className="sr-only">
        {callouts.map((callout) => (
          <li key={callout.id}>
            {callout.label}
            {callout.note ? `: ${callout.note}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
