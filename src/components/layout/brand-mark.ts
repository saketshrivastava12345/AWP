/**
 * The AURIX mark's geometry, in one plain module (no React, no next/link) so
 * the navbar, the loading screen and the generated images — the favicon
 * (src/app/icon.svg mirrors these numbers), the Apple touch icon and the
 * social card — all draw exactly the same shape.
 *
 * A wide "A" drawn as an open chevron with a floating crossbar: the
 * silhouette of a roofline over a horizon, in a 32-unit box.
 */
export const MARK_VIEWBOX = "0 0 32 32";

export const MARK_PATHS = {
  chevron: "M5 26.5 16 5.5l11 21",
  bar: "M11.2 20h9.6",
} as const;

export const MARK_STROKES = {
  chevron: 3,
  bar: 2.2,
} as const;

/** Raw colours for contexts without the stylesheet (next/og images). */
export const BRAND_COLORS = {
  void: "#06060a",
  surface1: "#0c0c11",
  surface2: "#14141b",
  gold200: "#f2e4c0",
  gold400: "#d9bc72",
  gold500: "#c8a34a",
  gold600: "#a88534",
  gold700: "#7e6323",
  gold800: "#55431a",
  ink50: "#f7f7f8",
  ink300: "#a1a1ae",
  ink400: "#8a8a96",
  ink500: "#83838e",
} as const;
