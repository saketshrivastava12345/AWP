/**
 * One scene renders at a time.
 *
 * The car page has two WebGL canvases — the anatomy tour's stage and the
 * interactive viewer — and near the boundary between them both are partly on
 * screen. Rendering both would halve the frame rate for no benefit, so each
 * canvas reports how much of it is visible and only the most visible one
 * renders; the other holds its last frame.
 *
 * A small hysteresis stops the two trading places on every scroll event when
 * they are nearly equally visible.
 */

export type RenderArbiter = {
  /** Visible area of a scene in px² (0 when off screen). */
  report(id: string, visibleArea: number): void;
  /** The scene unmounted. */
  remove(id: string): void;
  /** The scene allowed to render, or null when none is visible. */
  winner(): string | null;
  subscribe(listener: () => void): () => void;
};

export function createRenderArbiter({ hysteresis = 1.15 } = {}): RenderArbiter {
  const areas = new Map<string, number>();
  const listeners = new Set<() => void>();
  let current: string | null = null;

  const recompute = () => {
    let best: string | null = null;
    let bestArea = 0;
    for (const [id, area] of areas) {
      if (area > bestArea) {
        best = id;
        bestArea = area;
      }
    }
    let next = best;
    const currentArea = current !== null ? (areas.get(current) ?? 0) : 0;
    // Keep the current winner unless the challenger is clearly more visible.
    if (current !== null && currentArea > 0 && best !== current) {
      if (bestArea < currentArea * hysteresis) next = current;
    }
    if (next !== current) {
      current = next;
      for (const listener of listeners) listener();
    }
  };

  return {
    report(id, visibleArea) {
      const area = Number.isFinite(visibleArea) ? Math.max(0, visibleArea) : 0;
      if (areas.get(id) === area) return;
      areas.set(id, area);
      recompute();
    },
    remove(id) {
      if (!areas.delete(id)) return;
      if (current !== id) {
        recompute();
        return;
      }
      current = null;
      recompute();
      // The winner left and nobody took over: still a change worth announcing.
      if (current === null) for (const listener of listeners) listener();
    },
    winner: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The page-wide arbiter shared by every canvas. */
export const renderArbiter = createRenderArbiter();
