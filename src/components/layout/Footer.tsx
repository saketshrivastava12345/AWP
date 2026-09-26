import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { FOOTER_SECTIONS, SOCIAL_LINKS } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link
              href="/"
              className="font-display text-base tracking-[0.3em] text-ink-50"
            >
              AURIX
            </Link>
            <p className="mt-3 text-label">{siteConfig.tagline}</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-400">
              A global encyclopedia of automobiles — from country and marque down to the
              individual component.
            </p>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <Link
                    href={social.href}
                    className="text-xs text-ink-400 transition-colors duration-200 hover:text-gold-300"
                  >
                    {social.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-label">{section.title}</h2>
              <ul className="mt-5 space-y-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-300 transition-colors duration-200 hover:text-gold-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-line-subtle pt-8">
          {/* Required disclaimer — specifications genuinely do vary by market. */}
          <p className="max-w-3xl text-xs leading-relaxed text-ink-500">
            {siteConfig.disclaimer}
          </p>
          <p className="mt-4 text-xs text-ink-500">
            Built as a college mini project · B.Tech CSE, Pimpri Chinchwad University.
            Marque names and specifications belong to their respective manufacturers.
          </p>
        </div>
      </Container>
    </footer>
  );
}
