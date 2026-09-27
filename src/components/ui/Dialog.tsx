"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

export type DialogPlacement = "center" | "right" | "left" | "bottom" | "full";

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

type DialogLayer = "modal" | "palette";

/**
 * Open dialogs in the order they opened. The topmost is the most recently
 * opened one on the highest layer — not the last one in the DOM, which
 * depends on where each dialog happens to be rendered in the tree.
 */
const openDialogs: { panel: HTMLElement; layer: DialogLayer }[] = [];

function isTopmost(panel: HTMLElement): boolean {
  const onPalette = openDialogs.filter((entry) => entry.layer === "palette");
  const candidates = onPalette.length > 0 ? onPalette : openDialogs;
  return candidates[candidates.length - 1]?.panel === panel;
}

/**
 * The one modal primitive. Sheets, the lightbox, the mobile menu and the admin
 * confirmations are all built on it, so they share the behaviour a hand-rolled
 * modal usually gets wrong:
 *
 *   - Escape closes it (only the topmost dialog handles the key)
 *   - focus moves in on open and returns to the trigger on close
 *   - Tab and Shift+Tab stay inside
 *   - the page behind cannot scroll
 *   - it is labelled by its visible title
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  hideTitle = false,
  placement = "center",
  size = "md",
  initialFocusRef,
  className,
  bodyClassName,
  headerAction,
  layer = "modal",
  children,
}: {
  open: boolean;
  /** Must be stable (useCallback) — it is an effect dependency. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Keep the title for screen readers but do not show the header bar. */
  hideTitle?: boolean;
  placement?: DialogPlacement;
  size?: "sm" | "md" | "lg" | "xl";
  /** Element to focus on open. Defaults to the panel itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  /** Extra control rendered in the header, before the close button. */
  headerAction?: ReactNode;
  /** The search palette sits above ordinary modals. */
  layer?: DialogLayer;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const entry = { panel, layer };
    openDialogs.push(entry);
    (initialFocusRef?.current ?? panel).focus({ preventScroll: true });

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      // Only the topmost dialog reacts.
      if (!isTopmost(panel)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openDialogs.indexOf(entry);
      if (index !== -1) openDialogs.splice(index, 1);
      // Restore only if focus is still inside (or lost), never steal it back
      // from something the user moved to deliberately.
      if (
        restoreTo &&
        (!document.activeElement ||
          panel.contains(document.activeElement) ||
          document.activeElement === document.body)
      ) {
        restoreTo.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, initialFocusRef, layer]);

  if (!open) return null;

  const placementClasses: Record<DialogPlacement, string> = {
    center: cn(
      "left-1/2 top-[max(1rem,8vh)] w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border",
      "max-h-[calc(100dvh-max(2rem,16vh))] animate-panel-in",
      size === "sm" && "max-w-sm",
      size === "md" && "max-w-lg",
      size === "lg" && "max-w-2xl",
      size === "xl" && "max-w-5xl",
    ),
    right: cn(
      "inset-y-0 right-0 w-full border-l animate-panel-in-right",
      size === "sm"
        ? "max-w-sm"
        : size === "lg" || size === "xl"
          ? "max-w-xl"
          : "max-w-md",
    ),
    left: cn(
      "inset-y-0 left-0 w-full border-r animate-panel-in-left",
      size === "sm" ? "max-w-xs" : "max-w-sm",
    ),
    bottom:
      "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl border-t animate-panel-in-bottom",
    full: "inset-0 animate-overlay-in",
  };

  // Portalled to <body>: rendered in place, a dialog inside any ancestor with
  // a transform, filter or backdrop-filter is positioned against that ancestor
  // instead of the viewport (a sticky toolbar with backdrop blur, a card).
  return createPortal(
    <div
      className={cn(
        "fixed inset-0",
        layer === "palette" ? "z-(--z-palette)" : "z-(--z-modal)",
      )}
      role="presentation"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-overlay-in cursor-default bg-void/80 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        data-aurix-dialog=""
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col border-line bg-surface-1 shadow-overlay",
          "focus-visible:outline-none",
          placementClasses[placement],
          className,
        )}
      >
        {hideTitle ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-h4">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="mt-1 text-body-s text-ink-400">
                  {description}
                </div>
              ) : null}
            </div>
            <div className="-mt-1 -mr-2 flex shrink-0 items-center gap-1">
              {headerAction}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-11 place-items-center rounded-pill text-ink-300 transition-colors duration-(--duration-fast) hover:bg-white/6 hover:text-ink-50"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
            bodyClassName,
          )}
        >
          {hideTitle && description ? (
            <div id={descriptionId} className="sr-only">
              {description}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
