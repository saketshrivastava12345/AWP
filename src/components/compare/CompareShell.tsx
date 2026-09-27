"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { buttonClasses } from "@/components/ui/Button";
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

  // The table's sticky header row can wrap to two lines; publish its height
  // so the group titles beside the rows stick just below it.
  useEffect(() => {
    const root = ref.current;
    const head = root?.querySelector<HTMLElement>("[data-compare-head]");
    if (!root || !head || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--cmp-head-h", `${head.getBoundingClientRect().height}px`);
    });
    observer.observe(head);
    return () => observer.disconnect();
  }, [groupKey]);

  const hidden = counts.total - counts.differing;

  return (
    <div ref={ref} data-diff={diff ? "on" : "off"} className="group/cmp">
      <div className="relative flex flex-col gap-5 rounded-card p-5 hud-panel lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <span aria-hidden="true" className="hud-brackets -m-px" />
        <span
          aria-hidden="true"
          className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
        >
          Console // Comparison
        </span>
        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={anchor}
          variant="compact"
          label="Add a car"
          className="w-full md:max-w-md"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0">
            <Switch checked={diff} onChange={setDiff} label="Differences only" />
            <p aria-live="polite" className="text-caption tabular-nums lg:min-w-52">
              {diff
                ? counts.differing === counts.total
                  ? `Every row differs (${counts.total})`
                  : `${counts.differing} of ${counts.total} rows · ${hidden} identical hidden`
                : `${counts.total} rows · ${counts.differing} differ`}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <CopyLinkButton href={href} />
            <CompareLink
              to={[]}
              className={buttonClasses("link", "sm", "text-ink-300 hover:text-ink-50")}
            >
              Clear all
            </CompareLink>
          </div>
        </div>
      </div>

      {diff && counts.differing === 0 ? (
        <p className="mt-8 rounded-card px-5 py-8 text-center text-body-s text-ink-300 hud-panel">
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
