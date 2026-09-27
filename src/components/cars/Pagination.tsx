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
  "flex h-11 min-w-11 items-center justify-center rounded-xs border px-3 font-display text-micro " +
  "tracking-hud uppercase transition-colors duration-(--duration-fast) sm:h-10 sm:min-w-10";

/**
 * Server-side pagination. Every control is a real link, so pages are
 * crawlable, shareable and work without JavaScript. On phones the numbers
 * collapse to "page x of y" between the arrows.
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
          "border-line text-ink-300 hover:border-gold-600 hover:text-gold-300",
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

      <p className="tabular px-3 font-mono text-xs text-ink-300 sm:hidden">
        <span className="sr-only">Page </span>
        {page} <span className="text-ink-500">/</span> {pageCount}
      </p>

      <ul className="hidden items-center gap-1.5 sm:flex">
        {pageItems(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 font-mono text-xs text-ink-600"
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
                    ? "border-gold-500 bg-gold-800/15 text-gold-300"
                    : "border-line text-ink-300 hover:border-gold-600 hover:text-gold-300",
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
