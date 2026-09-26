export type NavLink = {
  href: string;
  label: string;
  /** Shown in the mobile menu under the label. */
  description?: string;
};

/** Primary navigation, used by both the navbar and the mobile menu. */
export const PRIMARY_NAV: readonly NavLink[] = [
  { href: "/cars", label: "Cars", description: "Browse the full collection" },
  {
    href: "/manufacturers",
    label: "Manufacturers",
    description: "Marques and their history",
  },
  { href: "/countries", label: "Countries", description: "Automotive nations" },
  { href: "/parts", label: "Parts", description: "Anatomy of the machine" },
  { href: "/compare", label: "Compare", description: "Two to four cars, side by side" },
  { href: "/about", label: "About", description: "About this project" },
] as const;

export const FOOTER_SECTIONS: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/cars", label: "Car Collection" },
      { href: "/manufacturers", label: "Manufacturers" },
      { href: "/countries", label: "Countries" },
      { href: "/parts", label: "Parts Encyclopedia" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/compare", label: "Compare Cars" },
      { href: "/favorites", label: "Saved Cars" },
      { href: "/cars?fuel=electric", label: "Electric Vehicles" },
      { href: "/cars?category=hypercar", label: "Hypercars" },
    ],
  },
  {
    title: "Technology",
    links: [
      { href: "/about#stack", label: "Next.js & React" },
      { href: "/about#stack", label: "React Three Fiber" },
      { href: "/about#stack", label: "Supabase & Postgres" },
      { href: "/about#stack", label: "GSAP" },
    ],
  },
] as const;

/**
 * Social links are placeholders. They point at the About page rather than at
 * invented profile URLs, so nothing in the footer promises a destination that
 * does not exist.
 */
export const SOCIAL_LINKS: readonly { label: string; href: string }[] = [
  { label: "GitHub", href: "/about" },
  { label: "LinkedIn", href: "/about" },
  { label: "Contact", href: "/about" },
] as const;

/** True when `pathname` is `href` or a descendant of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
