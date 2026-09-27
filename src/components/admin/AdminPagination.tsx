import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Numbered pagination that keeps the current filters in the URL. */
export function AdminPagination({
  basePath,
  params,
  page,
  pageCount,
}: {
  basePath: string;
  params: Record<string, string>;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(([key, value]) => value && key !== "page"),
    );
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // First, last, and a window around the current page.
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const cell =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm px-2 font-mono text-xs tabular transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-ink-500">
        Page {page} of {pageCount}
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className={cn(cell, "text-ink-300 hover:bg-surface-2")}
              rel="prev"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Previous page</span>
            </Link>
          ) : (
            <span className={cn(cell, "text-ink-600")} aria-hidden="true">
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>
        {pages.map((value, index) => (
          <li key={value} className="flex items-center gap-1">
            {index > 0 && value - (pages[index - 1] ?? value) > 1 ? (
              <span className="px-1 text-ink-600" aria-hidden="true">
                …
              </span>
            ) : null}
            <Link
              href={href(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(
                cell,
                value === page
                  ? "border border-gold-600 text-gold-300"
                  : "text-ink-300 hover:bg-surface-2",
              )}
            >
              {value}
            </Link>
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link
              href={href(page + 1)}
              className={cn(cell, "text-ink-300 hover:bg-surface-2")}
              rel="next"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
              <span className="sr-only">Next page</span>
            </Link>
          ) : (
            <span className={cn(cell, "text-ink-600")} aria-hidden="true">
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
