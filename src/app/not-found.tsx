import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SearchTrigger } from "@/components/layout/SearchTrigger";
import { PRIMARY_NAV } from "@/lib/navigation";

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
    <section aria-labelledby="not-found-title" className="flex flex-1 flex-col">
      <Container className="py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-eyebrow">Error 404</p>

          <h1 id="not-found-title" className="mt-4 text-h1">
            This page isn’t in the catalogue.
          </h1>

          <p className="mt-6 max-w-[60ch] text-lead">
            The car, brand or part may have been renamed, or the link may be mistyped.
            Search for it, or pick up from one of the sections below.
          </p>

          <SearchTrigger className="mt-10 max-w-md">
            Search cars, brands, parts…
          </SearchTrigger>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/cars">Browse all cars</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Return home
            </ButtonLink>
          </div>
        </div>

        <nav aria-labelledby="not-found-continue" className="mt-20 max-w-2xl sm:mt-24">
          <h2 id="not-found-continue" className="text-eyebrow">
            Continue to
          </h2>
          <ul className="mt-4 border-t border-line-subtle">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href} className="border-b border-line-subtle">
                <Link
                  href={link.href}
                  className="group flex min-h-16 items-center gap-4 py-3 transition-colors duration-(--duration-fast)"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-h4 text-ink-100 transition-colors duration-(--duration-fast) group-hover:text-ink-50">
                      {link.label}
                    </span>
                    {link.description ? (
                      <span className="block text-body-s text-ink-400">
                        {link.description}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="size-[18px] shrink-0 text-ink-400 transition-[color,translate] duration-(--duration-base) group-hover:translate-x-1 group-hover:text-ink-50"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
