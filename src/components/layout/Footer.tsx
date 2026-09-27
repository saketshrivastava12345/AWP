import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FOOTER_SECTIONS, type NavLink } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { Wordmark } from "./BrandMark";

/**
 * The year for the copyright line. Reading the clock during prerendering is
 * not allowed under Cache Components (every render would differ), so the
 * value is cached and simply refreshed daily.
 */
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

function FooterLink({ link }: { link: NavLink }) {
  const className =
    "inline-flex min-h-11 items-center gap-1.5 text-body-s text-ink-300 transition-colors duration-(--duration-fast) hover:text-ink-50 lg:min-h-9";
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
        <ArrowUpRight className="size-3.5 text-ink-400" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

/**
 * Four columns from lg — the brand and a line on what AURIX is, then
 * Explore, Tools and Project — over one legal paragraph. Search lives in the
 * command palette, so the footer no longer carries a search field.
 */
export async function Footer() {
  const year = await copyrightYear();

  return (
    <footer className="mt-24 border-t border-line-subtle">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="col-span-2 max-w-sm sm:col-span-3 lg:col-span-1">
            <Wordmark />
            <p className="mt-4 text-body-s text-ink-300">
              An encyclopedia of the automobile, from country and brand down to the
              individual component. Every figure is a published one — where it is not
              known, it says so.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-eyebrow">{section.title}</h2>
              <ul className="mt-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}`}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-line-subtle pt-8 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          {/* Required disclaimer — specifications genuinely do vary by market. */}
          <p className="max-w-3xl text-caption">
            {siteConfig.disclaimer} Brand names, model names and specifications belong to
            their respective manufacturers. Built as a college mini project · B.Tech CSE,
            Pimpri Chinchwad University.
          </p>
          <p className="shrink-0 text-caption">
            © {year} {siteConfig.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
