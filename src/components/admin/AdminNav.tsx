"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  CarFront,
  Coins,
  FileSpreadsheet,
  Gauge,
  Images,
  Layers,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const SECTIONS: { title: string; links: NavLink[] }[] = [
  {
    title: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: Gauge, exact: true }],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/vehicles", label: "Vehicles", icon: CarFront },
      { href: "/admin/models", label: "Models", icon: Layers },
      { href: "/admin/media", label: "Media", icon: Images },
    ],
  },
  {
    title: "Pricing",
    links: [
      { href: "/admin/prices", label: "Prices", icon: Coins, exact: true },
      { href: "/admin/prices/import", label: "CSV import", icon: FileSpreadsheet },
      { href: "/admin/markets", label: "Markets", icon: MapPinned },
    ],
  },
  {
    title: "Quality",
    links: [{ href: "/admin/sources", label: "Data sources", icon: ShieldCheck }],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The admin's own navigation: a sticky sidebar on wide screens and a
 * horizontally scrolling strip on phones (so it never pushes content down).
 */
export function AdminNav() {
  const pathname = usePathname();
  const links = SECTIONS.flatMap((section) => section.links);
  // "Prices" is exact so that CSV import highlights on its own, but a
  // vehicle's price page still belongs to Vehicles.
  return (
    <>
      <nav aria-label="Admin" className="hidden lg:block">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="mb-1.5 px-3 text-caption">{section.title}</p>
            <ul className="flex flex-col gap-px">
              {section.links.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-control px-3 text-body-s transition-colors duration-(--duration-fast)",
                        active
                          ? "bg-surface-2 text-ink-50 shadow-[inset_2px_0_0_0_var(--color-gold-500)]"
                          : "text-ink-300 hover:bg-surface-2/60 hover:text-ink-50",
                      )}
                    >
                      <Icon
                        className="size-4 shrink-0"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <nav
        aria-label="Admin"
        className="-mx-5 border-b border-line-subtle sm:-mx-8 lg:hidden"
      >
        <ul className="no-scrollbar flex gap-6 overflow-x-auto px-5 sm:px-8">
          {links.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px flex min-h-12 items-center border-b-2 text-body-s whitespace-nowrap transition-colors duration-(--duration-fast)",
                    active
                      ? "border-gold-500 text-ink-50"
                      : "border-transparent text-ink-300 hover:text-ink-50",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
