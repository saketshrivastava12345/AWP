import { siteConfig } from "./site-config";

export type NavLink = {
  href: string;
  label: string;
  /** One line under the label in the mobile menu and on the 404 page. */
  description?: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
};

/**
 * Primary navigation: the five ways into the catalogue. Shared by the desktop
 * bar, the mobile menu and the 404 page so they can never disagree. About is
 * deliberately not here — it is a project page, not a way into the data — and
 * lives in the footer instead.
 */
export const PRIMARY_NAV: readonly NavLink[] = [
  {
    href: "/cars",
    label: "Cars",
    description: "Every variant, filterable by specification",
  },
  {
    // Presented as "Brands", as car makers' own sites say; the route keeps
    // its name so every existing link still works.
    href: "/manufacturers",
    label: "Brands",
    description: "The makers and the models they build",
  },
  { href: "/countries", label: "Countries", description: "Where each car comes from" },
  { href: "/parts", label: "Parts", description: "The components inside the machine" },
  { href: "/compare", label: "Compare", description: "Up to four cars, side by side" },
];

/** Secondary links shown under the primary list in the mobile menu. */
export const SECONDARY_NAV: readonly NavLink[] = [
  { href: "/about", label: "About the project" },
  { href: siteConfig.repository, label: "Source code", external: true },
];

export type FooterSection = { title: string; links: readonly NavLink[] };

export const FOOTER_SECTIONS: readonly FooterSection[] = [
  {
    title: "Explore",
    links: [
      { href: "/cars", label: "All cars" },
      { href: "/manufacturers", label: "Brands" },
      { href: "/countries", label: "Countries" },
      { href: "/parts", label: "Parts encyclopedia" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/compare", label: "Compare cars" },
      { href: "/favorites", label: "Saved cars" },
      { href: "/cars?fuel=electric", label: "Electric vehicles" },
      { href: "/cars?category=hypercar", label: "Hypercars" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About AURIX" },
      { href: "/about#principles", label: "Data principles" },
      { href: "/about#stack", label: "Technology stack" },
      { href: siteConfig.repository, label: "Source on GitHub", external: true },
    ],
  },
];

/** True when `pathname` is `href` or a descendant of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The primary nav entry the current page belongs to, if any. */
export function activeNavHref(pathname: string): string | null {
  return PRIMARY_NAV.find((link) => isActivePath(pathname, link.href))?.href ?? null;
}

/**
 * Two-digit index: "01". No longer shown in the menu or on the 404 page
 * (numbered labels were part of the old HUD styling); kept for any caller
 * with genuinely ordered content.
 */
export function navIndex(position: number): string {
  return String(position + 1).padStart(2, "0");
}
