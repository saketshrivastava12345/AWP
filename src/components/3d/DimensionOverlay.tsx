"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ViewerBridge } from "@/lib/viewer-bridge";
import { DIMENSION_LABELS, type Measurement } from "@/lib/viewer-dimensions";
import { formatNumber } from "@/lib/format";

/**
 * Measurement lines drawn from the car's published dimensions, projected from
 * 3D every frame: a dimension line with end ticks, extension lines back to the
 * car, and a label that stays upright and readable whatever the angle. Only
 * published figures are drawn.
 */

function MeasurementLine({
  measurement,
  bridge,
}: {
  measurement: Measurement;
  bridge: ViewerBridge;
}) {
  const line = useRef<SVGLineElement>(null);
  const tickA = useRef<SVGLineElement>(null);
  const tickB = useRef<SVGLineElement>(null);
  const extA = useRef<SVGLineElement>(null);
  const extB = useRef<SVGLineElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const { id } = measurement;

  useLayoutEffect(() => {
    if (!line.current || !tickA.current || !tickB.current || !label.current) return;
    bridge.overlay.dimensions.set(id, {
      line: line.current,
      tickA: tickA.current,
      tickB: tickB.current,
      extA: extA.current,
      extB: extB.current,
      label: label.current,
    });
    bridge.requestFrame.current?.();
    return () => {
      bridge.overlay.dimensions.delete(id);
    };
  }, [bridge, id]);

  const hidden = { visibility: "hidden" } as const;
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <line ref={extA} className="stroke-gold-500/35" strokeWidth={1} style={hidden} />
        <line ref={extB} className="stroke-gold-500/35" strokeWidth={1} style={hidden} />
        <line ref={line} className="stroke-gold-400" strokeWidth={1.25} style={hidden} />
        <line ref={tickA} className="stroke-gold-300" strokeWidth={1.5} style={hidden} />
        <line ref={tickB} className="stroke-gold-300" strokeWidth={1.5} style={hidden} />
      </svg>
      <div
        ref={label}
        className="pointer-events-none absolute top-0 left-0 border border-gold-700/50 bg-void/85 px-2 py-1 whitespace-nowrap backdrop-blur-sm will-change-transform"
        style={hidden}
      >
        <span className="font-mono text-micro tracking-hud text-ink-300 uppercase">
          {DIMENSION_LABELS[id]}{" "}
        </span>
        <span className="tabular font-mono text-xs text-gold-200">
          {formatNumber(measurement.mm)} mm
        </span>
      </div>
    </>
  );
}

export function DimensionOverlay({
  measurements,
  bridge,
}: {
  measurements: Measurement[];
  bridge: ViewerBridge;
}) {
  useEffect(() => {
    bridge.requestFrame.current?.();
  }, [bridge, measurements]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {measurements.map((measurement) => (
        <MeasurementLine key={measurement.id} measurement={measurement} bridge={bridge} />
      ))}
      {/* The same figures as text, for screen readers. */}
      <ul className="sr-only">
        {measurements.map(({ id, mm }) => (
          <li key={id}>
            {DIMENSION_LABELS[id]}: {formatNumber(mm)} mm
          </li>
        ))}
      </ul>
    </div>
  );
}
