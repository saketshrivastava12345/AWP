"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ChevronRight } from "lucide-react";
import type { HistoryPoint } from "@/lib/pricing/engine";
import { nearestPointIndex, stepChart, type PlottedPoint } from "@/lib/pricing/chart";
import { formatDate, formatPrice, formatPriceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The recorded price over time for the market scope and figure type on show.
 *
 * Drawn only when there are at least two observations — one point is not a
 * history, and a chart of it would imply a trend that does not exist. The
 * shape is a step (a price holds until it is replaced). One series, so no
 * legend: the heading names it. Every value is also in the table view, so
 * the tooltip never gates information.
 *
 * Marks are drawn in an SVG stretched to the plot box (non-scaling strokes
 * keep the line 2px at any width); markers, labels and the tooltip are HTML
 * positioned in percentages, so text stays crisp on every screen.
 */
export function PriceHistory({
  points,
  currency,
  title,
  today,
}: {
  points: readonly HistoryPoint[];
  currency: string;
  /** "On-road price · Mumbai" */
  title: string;
  today: string | null;
}) {
  const headingId = useId();
  const chart = useMemo(() => stepChart(points, today), [points, today]);

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3
          id={headingId}
          className="font-display text-xs tracking-[0.18em] text-ink-50 uppercase"
        >
          Price history
        </h3>
        <p className="text-xs text-ink-400">{title}</p>
      </div>

      {chart ? (
        <>
          <StepChartView chart={chart} currency={currency} title={title} />
          <HistoryTable points={chart.points} currency={currency} />
        </>
      ) : (
        <p className="mt-4 border-y border-line-subtle py-4 text-sm leading-relaxed text-ink-400">
          {points.length === 1 ? (
            <>
              One observation so far ({formatDate(points[0]!.date)}). History will appear
              once more observations are recorded for this market.
            </>
          ) : (
            "History will appear once more observations are recorded for this market."
          )}
        </p>
      )}
    </section>
  );
}

function tickLabels(values: readonly number[], currency: string): string[] {
  const compact = values.map((value) => formatPriceCompact(value, currency));
  // Close ticks can round to the same short form; fall back to full figures.
  return new Set(compact).size === compact.length
    ? compact
    : values.map((value) => formatPrice(value, currency));
}

function changeText(point: PlottedPoint, currency: string): string {
  if (point.previous === null) return "First recorded figure";
  const delta = point.amount - point.previous;
  if (delta === 0) return "No change from previous";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatPrice(Math.abs(delta), currency)} from previous`;
}

function pointLabel(point: PlottedPoint, currency: string): string {
  return `${formatDate(point.date)}: ${formatPrice(point.amount, currency)}. ${changeText(point, currency)}.`;
}

function StepChartView({
  chart,
  currency,
  title,
}: {
  chart: NonNullable<ReturnType<typeof stepChart>>;
  currency: string;
  title: string;
}) {
  const { points, ticks } = chart;
  const plotRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Which point shows its readout (hover or focus), and which one holds the
  // chart's single tab stop (roving tabindex).
  const [active, setActive] = useState<number | null>(null);
  const [tabStopState, setTabStop] = useState(points.length - 1);
  const tabStop = Math.min(tabStopState, points.length - 1);
  const labels = tickLabels(
    ticks.map((tick) => tick.value),
    currency,
  );
  const last = points[points.length - 1]!;
  const current = active !== null ? (points[active] ?? null) : null;

  const pointerToIndex = (event: PointerEvent<HTMLDivElement>) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    const x = ((event.clientX - box.left) / box.width) * 100;
    return nearestPointIndex(points, x);
  };

  const focusPoint = (index: number) => {
    const clamped = Math.max(0, Math.min(points.length - 1, index));
    setTabStop(clamped);
    setActive(clamped);
    pointRefs.current[clamped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: points.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    focusPoint(target);
  };

  return (
    <figure className="mt-5">
      <figcaption className="sr-only">
        Step chart of {title}, {points.length} recorded figures from{" "}
        {formatDate(points[0]!.date)} to {formatDate(last.date)}. Use the arrow keys to
        move between figures; the same values are in the table below.
      </figcaption>
      <div className="flex">
        {/* Y axis: round-number ticks in the muted text colour. */}
        <div className="relative w-[4.5rem] shrink-0" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span
              key={tick.value}
              className="tabular absolute right-3 -translate-y-1/2 font-mono text-micro whitespace-nowrap text-ink-500"
              style={{ top: `${tick.y}%` }}
            >
              {labels[index]}
            </span>
          ))}
        </div>

        <div
          ref={plotRef}
          className="relative h-44 min-w-0 flex-1 touch-pan-y sm:h-52"
          onPointerMove={(event) => {
            if (event.pointerType === "mouse") setActive(pointerToIndex(event));
          }}
          onPointerDown={(event) => setActive(pointerToIndex(event))}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden="true"
          >
            {ticks.map((tick) => (
              <line
                key={tick.value}
                x1={0}
                x2={100}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--color-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={chart.path}
              fill="none"
              stroke="var(--color-gold-600)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {current ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-line-strong"
              style={{ left: `${current.x}%` }}
            />
          ) : null}

          {points.map((point, index) => (
            <span
              key={point.id}
              ref={(element) => {
                pointRefs.current[index] = element;
              }}
              role="img"
              tabIndex={index === tabStop ? 0 : -1}
              aria-label={pointLabel(point, currency)}
              onFocus={() => {
                setTabStop(index);
                setActive(index);
              }}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="group/point absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-offset-0"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <span
                className={cn(
                  "block size-2.5 rounded-full bg-gold-600 ring-2 ring-surface-1 transition-transform duration-(--duration-fast)",
                  active === index && "scale-125 bg-gold-500",
                )}
              />
            </span>
          ))}

          {/* Direct label on the latest figure only; the rest live in the
              tooltip and the table. */}
          {active === null ? (
            <span
              aria-hidden="true"
              className={cn(
                "tabular pointer-events-none absolute -translate-y-[170%] font-mono text-micro whitespace-nowrap text-ink-200",
                last.x > 60 ? "-translate-x-full" : "translate-x-2",
              )}
              style={{ left: `${last.x}%`, top: `${last.y}%` }}
            >
              {formatPriceCompact(last.amount, currency)}
            </span>
          ) : null}

          {current ? <Readout point={current} currency={currency} /> : null}
        </div>
      </div>

      {/* X axis: the first observation and the end of the line. */}
      <div
        className="relative mt-2 ml-[4.5rem] h-4 text-micro text-ink-500"
        aria-hidden="true"
      >
        <span className="tabular absolute left-0 font-mono whitespace-nowrap">
          {formatDate(chart.start.date)}
        </span>
        <span className="tabular absolute right-0 font-mono whitespace-nowrap">
          {chart.end.isToday ? "Today" : formatDate(chart.end.date)}
        </span>
      </div>
    </figure>
  );
}

function Readout({ point, currency }: { point: PlottedPoint; currency: string }) {
  const align =
    point.x > 70
      ? "-translate-x-full"
      : point.x < 30
        ? "translate-x-0"
        : "-translate-x-1/2";
  const below = point.y < 38;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-(--z-raised) w-max max-w-[15rem] rounded-sm border border-line-strong",
        "bg-surface-2/95 px-3 py-2 shadow-lg backdrop-blur-sm",
        align,
        below ? "translate-y-4" : "-translate-y-[calc(100%+1rem)]",
      )}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <p className="tabular font-mono text-sm text-ink-50">
        {formatPrice(point.amount, currency)}
      </p>
      <p className="mt-0.5 text-xs text-ink-400">
        {point.previous === null ? "In force from " : "Changed "}
        {formatDate(point.date)}
      </p>
      {point.previous !== null ? (
        <p className="mt-0.5 text-xs text-ink-300">{changeText(point, currency)}</p>
      ) : null}
    </div>
  );
}

function HistoryTable({
  points,
  currency,
}: {
  points: readonly PlottedPoint[];
  currency: string;
}) {
  const hasEndDates = points.some((point) => point.until !== null);
  return (
    <details className="group/table mt-4 border-t border-line-subtle">
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 font-display text-[10px] tracking-button text-ink-300 uppercase",
          "transition-colors hover:text-ink-50 [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          className="size-3.5 transition-transform duration-(--duration-fast) group-open/table:rotate-90"
          aria-hidden="true"
        />
        View as table
      </summary>
      <div className="overflow-x-auto pb-2">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Recorded prices, oldest first</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pr-4 text-xs font-normal text-ink-400">
                In force from
              </th>
              {hasEndDates ? (
                <th scope="col" className="py-2 pr-4 text-xs font-normal text-ink-400">
                  Until
                </th>
              ) : null}
              <th
                scope="col"
                className="py-2 pr-4 text-right text-xs font-normal text-ink-400"
              >
                Price
              </th>
              <th
                scope="col"
                className="py-2 text-right text-xs font-normal text-ink-400"
              >
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.id} className="border-b border-line-subtle last:border-b-0">
                <td className="tabular py-2.5 pr-4 font-mono whitespace-nowrap text-ink-200">
                  {formatDate(point.date)}
                </td>
                {hasEndDates ? (
                  <td className="tabular py-2.5 pr-4 font-mono whitespace-nowrap text-ink-300">
                    {point.until ? formatDate(point.until) : "—"}
                  </td>
                ) : null}
                <td className="tabular py-2.5 pr-4 text-right font-mono whitespace-nowrap text-ink-100">
                  {formatPrice(point.amount, currency)}
                </td>
                <td className="tabular py-2.5 text-right font-mono whitespace-nowrap text-ink-300">
                  {point.previous === null
                    ? "—"
                    : point.amount === point.previous
                      ? "No change"
                      : `${point.amount > point.previous ? "+" : "−"}${formatPrice(
                          Math.abs(point.amount - point.previous),
                          currency,
                        )}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
