import type { ViewerGroup } from "@/types/domain";

/**
 * The link between the viewer's DOM (toolbar, overlays, tooltips) and its
 * WebGL canvas.
 *
 * The two live in different React renderers, and much of what passes between
 * them changes every frame — projected label positions, the hover point — so
 * it goes through this plain object instead of React state. The DOM side
 * registers overlay elements; the canvas projects its 3D anchors and writes
 * straight into their style. Nothing here causes a React render per frame.
 *
 * No three.js import: the DOM half of the viewer loads without it.
 */

/** Imperative camera moves, implemented by the canvas. */
export type ViewerCommands = {
  /** +1 moves closer, -1 further away. */
  zoom(direction: 1 | -1): void;
  /** Orbit around the target by angles in radians. */
  orbit(azimuth: number, polar: number): void;
  /** Pan the target, in metres along the screen's axes. */
  pan(x: number, y: number): void;
};

/** One measurement line: the dimension line, its end ticks, extension lines and label. */
export type DimensionElements = {
  line: SVGLineElement;
  tickA: SVGLineElement;
  tickB: SVGLineElement;
  extA: SVGLineElement | null;
  extB: SVGLineElement | null;
  label: HTMLElement;
};

/** One engineering callout: a leader line from the component to its label. */
export type CalloutElements = {
  leader: SVGPolylineElement;
  dot: SVGCircleElement;
  label: HTMLElement;
};

export type OverlayRegistry = {
  /** Hotspot markers, keyed by hotspot id. */
  points: Map<string, HTMLElement>;
  /** Measurement lines, keyed by dimension id. */
  dimensions: Map<string, DimensionElements>;
  /** Engineering callouts, keyed by callout id. */
  callouts: Map<string, CalloutElements>;
  /** Live camera read-out in the HUD. */
  telemetry: HTMLElement | null;
  /** The hover tooltip, moved with the pointer. */
  tooltip: HTMLElement | null;
};

export type HoverStore = {
  get(): ViewerGroup | null;
  /** Report the hovered group and the pointer position within the stage. */
  set(group: ViewerGroup | null, x?: number, y?: number): void;
  subscribe(listener: () => void): () => void;
};

export type ViewerBridge = {
  commands: { current: ViewerCommands | null };
  overlay: OverlayRegistry;
  hover: HoverStore;
  /**
   * Ask the canvas for a frame, e.g. after an overlay appears and needs its
   * first projection. Set by the canvas while it is mounted.
   */
  requestFrame: { current: (() => void) | null };
};

function createHoverStore(overlay: OverlayRegistry): HoverStore {
  let group: ViewerGroup | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => group,
    set(next, x, y) {
      const tooltip = overlay.tooltip;
      if (tooltip && x !== undefined && y !== undefined) {
        // Keep the tooltip inside the stage: past the middle it opens leftward.
        const stage = tooltip.parentElement?.clientWidth ?? 0;
        tooltip.dataset.flip = x > stage / 2 ? "1" : "0";
        tooltip.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      }
      if (next === group) return;
      group = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createViewerBridge(): ViewerBridge {
  const overlay: OverlayRegistry = {
    points: new Map(),
    dimensions: new Map(),
    callouts: new Map(),
    telemetry: null,
    tooltip: null,
  };
  return {
    commands: { current: null },
    overlay,
    hover: createHoverStore(overlay),
    requestFrame: { current: null },
  };
}

/**
 * Registration helpers. Components never assign into the bridge directly:
 * it is shared, long-lived state, and going through a function keeps every
 * write in one place (and out of React's render-purity checks).
 */
export function setOverlayElement(
  bridge: ViewerBridge,
  slot: "telemetry" | "tooltip",
  element: HTMLElement | null,
): void {
  bridge.overlay[slot] = element;
}

export function setFrameRequester(
  bridge: ViewerBridge,
  request: (() => void) | null,
): void {
  bridge.requestFrame.current = request;
}

export function setCommands(
  target: { current: ViewerCommands | null },
  commands: ViewerCommands | null,
): void {
  target.current = commands;
}
