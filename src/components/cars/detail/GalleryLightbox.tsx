"use client";

import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { GalleryItem } from "@/lib/detail/gallery";
import { PhotoCredit } from "./PhotoCredit";

/**
 * Full-screen photograph viewer on the shared Dialog (placement "full"), so
 * Escape, the focus trap, focus restore and scroll lock come for free.
 *
 * Props:
 *   items          the photographs that can be shown (failed files excluded)
 *   index          which one is open
 *   onIndexChange  called with the new index (wraps around)
 *   onClose        stable callback (useCallback) — the Dialog depends on it
 *   carName        for the dialog's accessible title
 *
 * Zoom: mouse wheel / trackpad pinch (about the cursor), touch pinch,
 * double-click or double-tap, and the − / + buttons (and − + 0 keys). Drag
 * pans when zoomed. Next/previous: buttons, ← / →, or a horizontal swipe when
 * not zoomed. The counter reads "3 / 8"; the caption carries the credit.
 */
export function GalleryLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  carName,
}: {
  items: GalleryItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  carName: string;
}) {
  const item = items[index];
  const count = items.length;
  const reduced = useReducedMotion();

  const [view, setView] = useState<View>(IDENTITY);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ id: string; w: number; h: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  // Files that failed here. Kept local: telling the gallery would remove the
  // photograph from `items` and close the lightbox under the visitor.
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());

  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastPointerType = useRef<string>("mouse");

  // ---------------------------------------------------------------- geometry
  const size = natural && item && natural.id === item.id ? natural : null;
  const fit =
    size && stage.w && stage.h ? Math.min(stage.w / size.w, stage.h / size.h) : 1;
  const shown = size ? { w: size.w * fit, h: size.h * fit } : stage;

  const clamp = (next: View): View => {
    const maxX = Math.max(0, (shown.w * next.scale - stage.w) / 2);
    const maxY = Math.max(0, (shown.h * next.scale - stage.h) / 2);
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  /** Zoom to `scale` keeping the stage point (px, py) — relative to the centre — fixed. */
  const zoomAt = (previous: View, scale: number, px: number, py: number): View => {
    const next = Math.min(MAX_ZOOM, Math.max(1, scale));
    const ratio = next / previous.scale;
    if (next === 1) return IDENTITY;
    return clamp({
      scale: next,
      x: px - (px - previous.x) * ratio,
      y: py - (py - previous.y) * ratio,
    });
  };

  const fromCentre = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  };

  // --------------------------------------------------------------- actions
  const go = (delta: number) => {
    if (count < 2) return;
    onIndexChange((index + delta + count) % count);
    setView(IDENTITY);
    setSwipeX(0);
    gesture.current = null;
  };

  const zoomBy = (factor: number) =>
    setView((previous) => zoomAt(previous, previous.scale * factor, 0, 0));

  const toggleZoomAt = (clientX: number, clientY: number) => {
    const point = fromCentre(clientX, clientY);
    setView((previous) =>
      previous.scale > 1.01
        ? IDENTITY
        : zoomAt(previous, DOUBLE_TAP_ZOOM, point.x, point.y),
    );
  };

  // ------------------------------------------------------ stage measurement
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1]?.contentRect;
      if (rect) setStage({ w: rect.width, h: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ------------------------------------------------------------------ wheel
  // A native listener: React's wheel handler is passive and cannot stop the
  // page (or the browser's own pinch-zoom) from reacting.
  const onWheel = useEffectEvent((event: WheelEvent) => {
    event.preventDefault();
    const point = fromCentre(event.clientX, event.clientY);
    // Trackpad pinches arrive as ctrl+wheel with small deltas.
    const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
    setView((previous) => zoomAt(previous, previous.scale * factor, point.x, point.y));
  });
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const listener = (event: WheelEvent) => onWheel(event);
    element.addEventListener("wheel", listener, { passive: false });
    return () => element.removeEventListener("wheel", listener);
  }, []);

  // --------------------------------------------------------------- keyboard
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
    switch (event.key) {
      case "ArrowRight":
        go(1);
        break;
      case "ArrowLeft":
        go(-1);
        break;
      case "+":
      case "=":
        zoomBy(ZOOM_STEP);
        break;
      case "-":
      case "_":
        zoomBy(1 / ZOOM_STEP);
        break;
      case "0":
        setView(IDENTITY);
        break;
      default:
        return;
    }
    event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  // --------------------------------------------------------------- pointers
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    lastPointerType.current = event.pointerType;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];

    if (points.length === 2) {
      const [a, b] = points as [Pt, Pt];
      gesture.current = {
        kind: "pinch",
        startDistance: Math.max(1, distance(a, b)),
        startMid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
        startView: view,
        moved: true,
      };
      setSwipeX(0);
    } else if (points.length === 1) {
      gesture.current = {
        kind: view.scale > 1.01 ? "pan" : "swipe",
        startX: event.clientX,
        startY: event.clientY,
        startView: view,
        moved: false,
      };
    }
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;
    if (!current) return;

    if (current.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const mid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const zoomed = zoomAt(
        current.startView,
        (current.startView.scale * distance(a, b)) / current.startDistance,
        current.startMid.x,
        current.startMid.y,
      );
      setView(
        clamp({
          ...zoomed,
          x: zoomed.x + (mid.x - current.startMid.x),
          y: zoomed.y + (mid.y - current.startMid.y),
        }),
      );
      return;
    }

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) > 6) current.moved = true;
    if (current.kind === "pan") {
      setView(
        clamp({
          ...current.startView,
          x: current.startView.x + dx,
          y: current.startView.y + dy,
        }),
      );
    } else if (count > 1 && current.moved) {
      setSwipeX(dx);
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const current = gesture.current;

    if (current && current.kind !== "pinch") {
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (current.kind === "swipe") {
        if (
          count > 1 &&
          Math.abs(dx) > SWIPE_DISTANCE &&
          Math.abs(dx) > Math.abs(dy) * 1.2
        ) {
          go(dx < 0 ? 1 : -1);
        } else {
          setSwipeX(0);
        }
      }
      // A touch that did not move is a tap; two quick ones zoom.
      if (!current.moved && event.pointerType !== "mouse" && event.type === "pointerup") {
        const now = event.timeStamp;
        const previous = lastTap.current;
        if (
          previous &&
          now - previous.t < DOUBLE_TAP_MS &&
          Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30
        ) {
          lastTap.current = null;
          toggleZoomAt(event.clientX, event.clientY);
        } else {
          lastTap.current = { t: now, x: event.clientX, y: event.clientY };
        }
      }
    }

    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    } else if (current?.kind === "pinch") {
      // One finger lifted: carry on as a pan from where the pinch left off.
      const [rest] = [...pointers.current.values()];
      if (rest) {
        gesture.current = {
          kind: "pan",
          startX: rest.x,
          startY: rest.y,
          startView: view,
          moved: true,
        };
      }
    }
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    // Touch double-taps are handled above; some browsers also synthesise a
    // dblclick for them, which would undo the zoom.
    if (lastPointerType.current !== "mouse") return;
    toggleZoomAt(event.clientX, event.clientY);
  };

  if (!item) return null;

  const zoomed = view.scale > 1.01;
  const previousItem = items[(index - 1 + count) % count];
  const nextItem = items[(index + 1) % count];

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Photographs of the ${carName}`}
      hideTitle
      placement="full"
      className="bg-void"
      bodyClassName="flex flex-col overflow-hidden p-0 sm:p-0"
    >
      {/* ------------------------------------------------------ Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-subtle px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <p className="font-mono text-xs text-ink-100 tabular-nums">
            {index + 1}
            <span className="text-ink-500"> / {count}</span>
          </p>
          <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
          <p className="truncate text-hud text-ink-400">
            {item.shot}
            <span className="hidden sm:inline"> · {carName}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Zoom out"
            size="md"
            disabled={!zoomed}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <Minus className="size-4" aria-hidden="true" />
          </IconButton>
          <span
            className="hidden w-12 text-center font-mono text-micro text-ink-400 tabular-nums sm:inline"
            aria-hidden="true"
          >
            {Math.round(view.scale * 100)}%
          </span>
          <IconButton
            label="Zoom in"
            size="md"
            disabled={view.scale >= MAX_ZOOM - 0.01}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <Plus className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Reset zoom"
            size="md"
            disabled={!zoomed}
            onClick={() => setView(IDENTITY)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </IconButton>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
          <IconButton label="Close photographs" size="md" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {/* -------------------------------------------------------- Stage */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={onDoubleClick}
          className={cn(
            "absolute inset-0 touch-none overflow-hidden select-none",
            zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
          )}
        >
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 will-change-transform",
              !dragging &&
                !reduced &&
                "transition-transform duration-(--duration-fast) ease-cinematic",
            )}
            style={{
              transform: `translate3d(${view.x + swipeX}px, ${view.y}px, 0) scale(${view.scale})`,
            }}
          >
            {broken.has(item.id) ? (
              // A file that will not load: say so, never a broken-image icon.
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <ImageOff className="size-6 text-ink-500" aria-hidden="true" />
                <p className="text-hud text-ink-400">Photograph unavailable</p>
                <p className="max-w-xs text-sm leading-relaxed text-ink-500">
                  This catalogued file could not be loaded.
                </p>
              </div>
            ) : (
              <Image
                src={item.url}
                alt={item.alt}
                fill
                sizes="100vw"
                quality={90}
                loading="eager"
                unoptimized={!item.optimize}
                draggable={false}
                onLoad={(event) =>
                  setNatural({
                    id: item.id,
                    w: event.currentTarget.naturalWidth,
                    h: event.currentTarget.naturalHeight,
                  })
                }
                onError={() => setBroken((previous) => new Set(previous).add(item.id))}
                className="object-contain"
              />
            )}
          </div>
        </div>

        {count > 1 ? (
          <>
            <IconButton
              label="Previous photograph"
              variant="solid"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-2 -translate-y-1/2 border border-line bg-void/70 backdrop-blur-sm sm:left-4"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Next photograph"
              variant="solid"
              onClick={() => go(1)}
              className="absolute top-1/2 right-2 -translate-y-1/2 border border-line bg-void/70 backdrop-blur-sm sm:right-4"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </IconButton>
          </>
        ) : null}

        {/* Warm the neighbours so next/previous is instant. */}
        {count > 1
          ? [previousItem, nextItem]
              .filter(
                (neighbour): neighbour is GalleryItem =>
                  Boolean(neighbour) && neighbour !== item,
              )
              .map((neighbour) => (
                <Image
                  key={`preload-${neighbour.id}`}
                  src={neighbour.url}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="100vw"
                  quality={90}
                  loading="eager"
                  unoptimized={!neighbour.optimize}
                  className="pointer-events-none invisible"
                />
              ))
          : null}
      </div>

      {/* ------------------------------------------------------ Caption */}
      <div className="shrink-0 border-t border-line-subtle px-4 py-3 sm:px-6">
        <p className="text-sm text-ink-200">{item.alt}</p>
        <PhotoCredit credit={item.credit} tone="bright" className="mt-1" />
        <p className="mt-1 hidden text-micro text-ink-600 md:block">
          Scroll or double-click to zoom · drag to pan · ← → to browse · Esc to close
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        Photograph {index + 1} of {count}: {item.alt}
      </p>
    </Dialog>
  );
}

type View = { scale: number; x: number; y: number };
type Pt = { x: number; y: number };
type Gesture =
  | { kind: "pinch"; startDistance: number; startMid: Pt; startView: View; moved: true }
  | {
      kind: "pan" | "swipe";
      startX: number;
      startY: number;
      startView: View;
      moved: boolean;
    };

const IDENTITY: View = { scale: 1, x: 0, y: 0 };
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;
const SWIPE_DISTANCE = 60;

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
