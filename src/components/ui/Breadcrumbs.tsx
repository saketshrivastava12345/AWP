import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumb trail. Rendered as an ordered list inside a labelled nav, which
 * is what assistive technology expects; the final item is the current page and
 * carries aria-current rather than a link.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-caption">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-6 items-center text-ink-400 transition-colors duration-(--duration-fast) hover:text-ink-50"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-ink-200" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3 text-ink-500" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
