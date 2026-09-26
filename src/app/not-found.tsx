import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { PRIMARY_NAV } from "@/lib/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist.",
};

export default function NotFound() {
  return (
    <Container className="grain flex flex-1 flex-col justify-center py-28">
      <div className="relative z-10 max-w-2xl">
        <p className="gold-gradient-text font-display text-6xl tracking-[0.08em] sm:text-8xl">
          404
        </p>

        <h1 className="mt-8 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          NO SUCH VEHICLE
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink-300 sm:text-base">
          This page is not in the catalogue. The car, manufacturer or part you followed a
          link to may have been renamed, or the address may be mistyped.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/cars">Browse the collection</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Return home
          </ButtonLink>
        </div>

        <div className="mt-16 border-t border-line pt-8">
          <p className="mb-5 text-label">Or continue to</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink-300 transition-colors duration-200 hover:text-gold-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
