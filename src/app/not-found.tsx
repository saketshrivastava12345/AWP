import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SearchTrigger } from "@/components/layout/SearchTrigger";
import { PRIMARY_NAV, navIndex } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for is not in the AURIX catalogue.",
  robots: { index: false },
};

/**
 * 404. Keeps the visitor moving: search, the catalogue, and every primary
 * section with a line on what it holds.
 */
export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="relative isolate flex flex-1 flex-col overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] tech-grid"
      />
      {/* Oversized, cropped figure behind the copy. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute top-10 -right-6 -z-10 hidden font-display text-[16rem] leading-none text-white/[0.035] select-none sm:block lg:top-4 lg:right-8 lg:text-[22rem]"
      >
        404
      </p>

      <Container className="py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-hud text-gold-400">
            <span aria-hidden="true" className="size-1.5 bg-gold-500" />
            Error 404 · Not in the catalogue
          </p>

          <h1
            id="not-found-title"
            className="mt-6 font-display text-3xl leading-tight tracking-display text-ink-50 uppercase sm:text-5xl"
          >
            No such vehicle
          </h1>

          <p className="mt-6 max-w-lg text-sm leading-relaxed text-ink-300 sm:text-base">
            This address is not in the catalogue. The car, manufacturer or part may have
            been renamed, or the link may be mistyped. Search for it, or pick up from one
            of the sections below.
          </p>

          <SearchTrigger className="mt-10 max-w-md">
            Search cars, marques, parts…
          </SearchTrigger>

          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/cars">Browse all cars</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Return home
            </ButtonLink>
          </div>
        </div>

        <nav aria-label="Sections" className="mt-20 sm:mt-24">
          <h2 className="text-label">Continue to</h2>
          <ol className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {PRIMARY_NAV.map((link, index) => (
              <li key={link.href} className="flex bg-void">
                <Link
                  href={link.href}
                  className="group flex w-full flex-col gap-3 p-5 transition-colors duration-(--duration-fast) hover:bg-surface-1"
                >
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-micro text-ink-500 tabular-nums">
                      {navIndex(index)}
                    </span>
                    <ArrowRight
                      className="size-3.5 text-ink-500 transition-[color,translate] duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-gold-300"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-display text-sm tracking-hud text-ink-50 uppercase transition-colors duration-(--duration-fast) group-hover:text-gold-200 lg:text-xs">
                    {link.label}
                  </span>
                  {link.description ? (
                    <span className="text-xs leading-relaxed text-ink-400">
                      {link.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </Container>
    </section>
  );
}
