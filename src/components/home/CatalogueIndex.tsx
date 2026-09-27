import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CACHE_SECONDS } from "@/lib/cache-tags";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CountKey, HomeCounts } from "@/lib/queries/home";
import { Container } from "@/components/ui/Container";

/**
 * The catalogue's hierarchy with a live count at every level — the site's
 * structure and its size in one line, each level a way in.
 */

const LEVELS: { key: CountKey; label: string; href: string }[] = [
  { key: "countries", label: "Countries", href: "/countries" },
  { key: "manufacturers", label: "Manufacturers", href: "/manufacturers" },
  { key: "models", label: "Models", href: "/cars" },
  { key: "variants", label: "Variants", href: "/cars" },
  { key: "parts", label: "Parts", href: "/parts" },
];

/** "once an hour", "once every 6 hours", "once every 10 minutes". */
function refreshLabel(seconds: number): string {
  if (seconds === 3600) return "once an hour";
  if (seconds % 3600 === 0) return `once every ${seconds / 3600} hours`;
  return `once every ${Math.round(seconds / 60)} minutes`;
}

export function CatalogueIndex({ counts }: { counts: HomeCounts }) {
  const known = LEVELS.filter(({ key }) => counts[key] !== null).length;

  return (
    <section
      aria-labelledby="index-heading"
      className="border-t border-line bg-surface-1/40"
    >
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-label">The catalogue, live</p>
            <h2
              id="index-heading"
              className="mt-3 font-display text-xl tracking-[0.06em] text-ink-50 sm:text-2xl"
            >
              From nation to nut and bolt
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-ink-400 sm:text-right">
            Exact counts from the catalogue database, re-read at most{" "}
            {refreshLabel(CACHE_SECONDS.catalogue)}. A model counts once at least one of
            its variants is published.
          </p>
        </div>

        {known === 0 ? (
          <p className="mt-10 border border-dashed border-line px-6 py-8 text-sm text-ink-400">
            The catalogue could not be counted just now. Every section below still links
            to its full index.
          </p>
        ) : (
          <ol className="mt-10 grid grid-cols-2 border-t border-l border-line sm:grid-cols-3 lg:grid-cols-5">
            {LEVELS.map((level, index) => {
              const value = counts[level.key];
              return (
                <li
                  key={level.key}
                  className={cn(
                    "relative border-r border-b border-line",
                    // Five cells in two columns: the last spans the row.
                    index === LEVELS.length - 1 && "max-sm:col-span-2",
                  )}
                >
                  <Link
                    href={level.href}
                    className="group flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:bg-surface-2/60 sm:p-6"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="tabular font-mono text-micro text-ink-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {index < LEVELS.length - 1 ? (
                        <ChevronRight
                          className="size-3.5 text-ink-600 transition-colors group-hover:text-gold-400"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span>
                      <span className="tabular block font-display text-3xl tracking-[0.02em] text-ink-50 sm:text-4xl">
                        {value === null ? (
                          <>
                            <span aria-hidden="true" className="text-ink-600">
                              —
                            </span>
                            <span className="sr-only">Not available</span>
                          </>
                        ) : (
                          formatNumber(value)
                        )}
                      </span>
                      <span className="mt-2 block text-label text-nano transition-colors group-hover:text-gold-300">
                        {level.label}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Container>
    </section>
  );
}
