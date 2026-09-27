import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FOOTER_SECTIONS, type NavLink } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { Wordmark } from "./BrandMark";
import { SearchTrigger } from "./SearchTrigger";

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
    "inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-300 transition-colors duration-(--duration-fast) hover:text-gold-300 sm:min-h-8";
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
        <ArrowUpRight className="size-3.5 text-ink-500" aria-hidden="true" />
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

export async function Footer() {
  const year = await copyrightYear();

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <Container className="relative py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div className="max-w-sm sm:col-span-3 lg:col-span-1">
            <Wordmark />
            <p className="mt-4 text-label">{siteConfig.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              An encyclopedia of the automobile, from country and marque down to the
              individual component. Every figure is a published one — where it is not
              known, it says so.
            </p>
            <SearchTrigger className="mt-7" />
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-label">{section.title}</h2>
              <ul className="mt-3 sm:mt-4 sm:space-y-1.5">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}`}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <div className="relative border-t border-line-subtle">
        <Container className="flex flex-col gap-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-3xl space-y-2">
            {/* Required disclaimer — specifications genuinely do vary by market. */}
            <p className="text-xs leading-relaxed text-ink-500">
              {siteConfig.disclaimer}
            </p>
            <p className="text-xs leading-relaxed text-ink-500">
              Marque names, model names and specifications belong to their respective
              manufacturers. Built as a college mini project · B.Tech CSE, Pimpri
              Chinchwad University.
            </p>
          </div>
          <p className="shrink-0 font-mono text-micro tracking-hud text-ink-500 uppercase">
            © {year} {siteConfig.name}
          </p>
        </Container>
      </div>

      {/* Oversized watermark wordmark, cropped by the page edge. */}
      <div aria-hidden="true" className="pointer-events-none relative -mt-2 select-none">
        <p className="bg-linear-to-b from-white/[0.06] to-transparent bg-clip-text text-center font-display text-[19vw] leading-[0.78] tracking-[0.04em] text-transparent 2xl:text-[17rem]">
          AURIX
        </p>
      </div>
    </footer>
  );
}
