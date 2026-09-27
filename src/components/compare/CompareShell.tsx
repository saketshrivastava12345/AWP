"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Eraser } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { CompareCombobox } from "./CompareCombobox";
import { CompareLink, useCompareState } from "./CompareState";
import { CopyLinkButton } from "./CopyLinkButton";

const subscribeNothing = () => () => {};

/**
 * The interactive frame around a comparison: the toolbar (add a car,
 * differences only, copy link, clear) and the bar entrance.
 *
 * The table and cards inside are server-rendered and passed in as children.
 * "Differences only" works by setting `data-diff` on this element; rows that
 * do not differ carry `group-data-[diff=on]/cmp:hidden`, so toggling is a
 * single attribute change with no re-render of the table.
 */
export function CompareShell({
  options,
  truncated,
  anchor,
  carNames,
  counts,
  children,
}: {
  options: ComparePickerOption[];
  truncated: boolean;
  anchor: ComparePickerOption | null;
  carNames: string[];
  counts: { total: number; differing: number };
  children: ReactNode;
}) {
  const { diff, setDiff, href } = useCompareState();
  const ref = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  // True only while hydrating server HTML — i.e. when the table has already
  // been painted at full length before this code ran.
  const hydrating = useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => true,
  );
  const [paintedByServer] = useState(hydrating);

  // Bars grow in once, as each group reaches the viewport. Groups already on
  // screen when server HTML hydrates are left as painted (collapsing them
  // would flash); groups below the fold, and everything on a client-side
  // render, are collapsed before paint and revealed on intersection. New
  // groups (an Electric section appearing when an EV is added) get the same
  // treatment; groups that persist simply re-scale.
  const groupKey = carNames.join("|");
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onlyOffscreen = paintedByServer && firstRun.current;
    firstRun.current = false;

    const pending: HTMLElement[] = [];
    for (const element of root.querySelectorAll<HTMLElement>("[data-bar-group]")) {
      const state = element.dataset.bars;
      if (state === "shown") continue;
      if (state !== "armed") {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue; // the other layout
        if (onlyOffscreen && rect.top < window.innerHeight) {
          element.dataset.bars = "shown";
          continue;
        }
        element.dataset.bars = "armed";
      }
      pending.push(element);
    }
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.bars = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    // Observe on the next frame, so the collapsed state is painted first and
    // the reveal is a transition rather than a jump.
    const frame = window.requestAnimationFrame(() => {
      for (const element of pending) observer.observe(element);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paintedByServer, groupKey]);

  const hidden = counts.total - counts.differing;

  return (
    <div ref={ref} data-diff={diff ? "on" : "off"} className="group/cmp">
      <div className="flex flex-col gap-4 border-y border-line py-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={anchor}
          variant="compact"
          label="Add a car"
          className="w-full md:max-w-md lg:max-w-sm"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0">
            <Switch
              checked={diff}
              onChange={setDiff}
              label="Differences only"
              className="min-h-11"
            />
            <p aria-live="polite" className="tabular text-xs text-ink-500 lg:w-52">
              {diff
                ? counts.differing === counts.total
                  ? `Every row differs (${counts.total})`
                  : `${counts.differing} of ${counts.total} rows · ${hidden} identical hidden`
                : `${counts.total} rows · ${counts.differing} differ`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <CopyLinkButton href={href} />
            <CompareLink
              to={[]}
              className="inline-flex h-11 items-center gap-2 rounded-xs px-3 font-display text-micro tracking-button text-ink-300 uppercase transition-colors hover:bg-surface-2 hover:text-ink-50"
            >
              <Eraser className="size-3.5" aria-hidden="true" />
              Clear all
            </CompareLink>
          </div>
        </div>
      </div>

      {diff && counts.differing === 0 ? (
        <p className="mt-8 rounded-sm border border-dashed border-line px-5 py-8 text-center text-sm text-ink-400">
          These cars are identical in every catalogued figure.
        </p>
      ) : null}

      {children}

      <p aria-live="polite" className="sr-only">
        {`Comparing ${carNames.length} cars: ${carNames.join(", ")}.`}
      </p>
    </div>
  );
}
