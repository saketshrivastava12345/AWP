import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CountKey, HomeCounts } from "@/lib/queries/home";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";
import { Container } from "@/components/ui/Container";
import { CountUp, GridBackground, Marquee, Reveal } from "@/components/fx";
import { stripOrder } from "./home-data";

/**
 * The telemetry strip under the hero: the catalogue's exact row counts as
 * glowing HUD figures that count up into place, and a ticker of every brand
 * with published cars.
 *
 * Every number is the count the query returned (CountUp renders the final
 * value on the server and never rests on any other). A count that could not
 * be read is an em dash read out as "Not available" — never a zero. The
 * ticker is fed from the same manufacturer rows the brands section shows,
 * so nothing here is written by hand.
 */

const FIGURES: readonly { key: CountKey; label: string }[] = [
  { key: "variants", label: "Cars" },
  { key: "manufacturers", label: "Brands" },
  { key: "countries", label: "Countries" },
  { key: "models", label: "Models" },
  { key: "parts", label: "Components" },
];

export function HomeTelemetry({
  counts,
  manufacturers,
}: {
  counts: HomeCounts;
  manufacturers: ManufacturerListItem[];
}) {
  const makers = stripOrder(manufacturers);

  return (
    <section
      aria-labelledby="telemetry-heading"
      className="relative isolate border-y border-line-subtle bg-surface-1/40"
    >
      <GridBackground size={40} />
      <Container className="pt-7 pb-6 lg:pt-9 lg:pb-8">
        <h2 id="telemetry-heading" className="sr-only">
          The catalogue in numbers
        </h2>

        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-4 hud-label"
        >
          <span className="flex items-center gap-3">
            <span className="size-1.5 animate-pulse-glow rounded-full bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]" />
            SYS.02 // Catalogue index
          </span>
          <span className="hidden sm:inline">Figures as published</span>
        </div>

        <Reveal
          as="dl"
          stagger
          className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8"
        >
          {FIGURES.map((figure) => {
            const value = counts[figure.key];
            return (
              <div
                key={figure.key}
                className="flex min-w-0 flex-col-reverse gap-2 border-l border-line pl-4 lg:pl-5"
              >
                <dt className="text-hud">{figure.label}</dt>
                <dd
                  className={cn(
                    "text-figure-xl",
                    value === null ? "text-ink-400" : "text-ink-50 glow-text",
                  )}
                >
                  {value === null ? (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">Not available</span>
                    </>
                  ) : (
                    <CountUp value={formatNumber(value)} />
                  )}
                </dd>
              </div>
            );
          })}
        </Reveal>
      </Container>

      {makers.length > 0 ? (
        <div className="border-t border-line-subtle">
          <Marquee label="the brands ticker" speed={60} gap="2.75rem" className="py-2">
            {makers.map((maker) => (
              <Link
                key={maker.id}
                href={`/manufacturers/${maker.slug}`}
                className="flex min-h-11 items-center gap-2.5 fx-link font-hud text-[11px] tracking-wide-hud whitespace-nowrap text-ink-200 uppercase transition-colors duration-(--duration-fast) hover:text-cyan-200 focus-visible:text-cyan-200"
              >
                <span
                  aria-hidden="true"
                  className="size-1 shrink-0 rounded-full bg-cyan-400/80"
                />
                {maker.name}
                <span className="font-mono text-[10px] tracking-hud text-ink-500">
                  {formatNumber(maker.variant_count)}
                </span>
              </Link>
            ))}
          </Marquee>
        </div>
      ) : null}
    </section>
  );
}
