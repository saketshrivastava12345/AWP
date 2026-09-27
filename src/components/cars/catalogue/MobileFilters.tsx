"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { FilterPanel, type FilterPanelModel } from "@/components/cars/FilterRail";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";

const noop = () => () => {};

/**
 * The phone and tablet way in to the filters: a "Filters (n)" control that
 * opens the same filter form in a bottom sheet, staged behind "Show results".
 *
 * Without JavaScript it is a plain link to the filter section, which the
 * page reveals with :target — so the filters are reachable either way.
 */
export function MobileFilters({
  model,
  count,
  className,
}: {
  model: FilterPanelModel;
  /** Active filters — the same number as the chips on the page. */
  count: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <>
      <a
        href="#catalogue-filters"
        role={hydrated ? "button" : undefined}
        aria-haspopup={hydrated ? "dialog" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        // Announced as a button once hydrated, so Space must open it too (an
        // anchor alone activates only on Enter).
        onKeyDown={
          hydrated
            ? (event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  setOpen(true);
                }
              }
            : undefined
        }
        className={buttonClasses(
          "secondary",
          "sm",
          cn("h-11 gap-2.5 px-4", count > 0 && "border-ink-400", className),
        )}
      >
        <SlidersHorizontal aria-hidden="true" />
        Filters
        {count > 0 ? (
          <span className="tabular grid h-5 min-w-5 place-items-center rounded-pill bg-ink-50 px-1.5 text-xs leading-none font-medium text-void">
            {count}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </a>

      {/* Portalled to <body>: the trigger lives in a sticky, backdrop-blurred
          toolbar, and a backdrop-filter makes an element the containing block
          of its fixed descendants — the sheet would open inside the toolbar. */}
      {hydrated
        ? createPortal(
            <Sheet
              open={open}
              onClose={close}
              title="Filters"
              side="bottom"
              description={
                count > 0
                  ? `${count} active. Changes apply when you show results.`
                  : "Changes apply when you show results."
              }
            >
              <FilterPanel model={model} mode="staged" onApplied={close} />
            </Sheet>,
            document.body,
          )
        : null}
    </>
  );
}
