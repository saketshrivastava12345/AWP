import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildQueryString, type RawSearchParams } from "@/lib/search-params";

/**
 * Page numbers to render: always the first and last, the current page and its
 * neighbours, with gaps elided. Keeps the control a fixed width regardless of
 * how many pages there are.
 */
function pageItems(current: number, total: number): (number | "gap")[] {
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

/**
 * Server-side pagination. Every control is a real link, so pages are
 * crawlable, shareable and work without JavaScript.
 */
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: RawSearchParams;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) =>
    `${basePath}${buildQueryString(searchParams, { page: target === 1 ? undefined : target })}`;

  const linkClasses =
    "font-display flex h-9 min-w-9 items-center justify-center border px-3 " +
    "text-[10px] tracking-[0.14em] uppercase transition-colors duration-200";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(
            linkClasses,
            "border-line text-ink-300 hover:border-gold-700 hover:text-gold-300",
          )}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(linkClasses, "border-line-subtle text-ink-600")}
        >
          <ChevronLeft className="size-3.5" />
        </span>
      )}

      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 font-mono text-xs text-ink-600"
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              linkClasses,
              "tabular",
              item === page
                ? "border-gold-500 bg-gold-800/15 text-gold-300"
                : "border-line text-ink-300 hover:border-gold-700 hover:text-gold-300",
            )}
          >
            {item}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(
            linkClasses,
            "border-line text-ink-300 hover:border-gold-700 hover:text-gold-300",
          )}
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(linkClasses, "border-line-subtle text-ink-600")}
        >
          <ChevronRight className="size-3.5" />
        </span>
      )}
    </nav>
  );
}
