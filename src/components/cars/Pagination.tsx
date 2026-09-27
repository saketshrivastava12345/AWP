import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Page numbers to render: always the first and last, the current page and its
 * neighbours, with gaps elided. Keeps the control a fixed width regardless of
 * how many pages there are.
 */
export function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("gap");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("gap");
  items.push(total);

  return items;
}

const CELL =
  "tabular flex h-11 min-w-11 items-center justify-center rounded-control border px-3 font-mono text-xs tracking-hud " +
  "transition-[color,border-color,box-shadow,background-color] duration-(--duration-fast) ease-standard";

/**
 * Server-side pagination, HUD style: mono cells, the current page a lit
 * cyan plate. Every control is a real link, so pages are crawlable,
 * shareable and work without JavaScript. On phones the numbers collapse to
 * "page x of y" between the arrows.
 */
export function Pagination({
  page,
  pageCount,
  href,
  className,
}: {
  page: number;
  pageCount: number;
  /** URL of a page (1-based). */
  href: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const arrow = (direction: "prev" | "next") => {
    const target = direction === "prev" ? page - 1 : page + 1;
    const enabled = target >= 1 && target <= pageCount;
    const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
    const label = direction === "prev" ? "Previous page" : "Next page";
    return enabled ? (
      <Link
        href={href(target)}
        rel={direction}
        aria-label={label}
        className={cn(
          CELL,
          "border-line-strong text-ink-200 hover:border-cyan-400 hover:text-cyan-100 hover:shadow-[0_0_14px_-4px_var(--color-cyan-400)]",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </Link>
    ) : (
      <span aria-hidden="true" className={cn(CELL, "border-line-subtle text-ink-600")}>
        <Icon className="size-4" />
      </span>
    );
  };

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1.5", className)}>
      {arrow("prev")}

      <p className="tabular px-3 font-mono text-xs tracking-hud text-ink-300 uppercase sm:hidden">
        Page {page} <span className="text-ink-400">of</span> {pageCount}
      </p>

      <ul className="hidden items-center gap-1.5 sm:flex">
        {pageItems(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 font-mono text-xs text-ink-400"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={href(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  CELL,
                  "tabular",
                  item === page
                    ? "border-cyan-300 bg-cyan-400/12 text-cyan-100 shadow-[0_0_16px_-4px_oklch(0.8_0.14_210/60%)]"
                    : "border-transparent text-ink-300 hover:border-line-strong hover:text-ink-50",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ul>

      {arrow("next")}
    </nav>
  );
}
