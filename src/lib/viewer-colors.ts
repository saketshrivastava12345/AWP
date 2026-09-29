/**
 * Colours used inside the WebGL scenes.
 *
 * A shader cannot read a CSS custom property, so the 3D code needs literal
 * values. They mirror the design tokens in `src/app/globals.css` and live in
 * this one module, so a change to the palette has exactly one other place to
 * visit (search for the token name in the comment).
 *
 * Plain data with no three.js import: DOM components can use it too.
 */
export const VIEWER_COLORS = {
  /** --color-void: the page ground and the studio backdrop. */
  void: "#06060a",
  /** --color-surface-1 */
  surface1: "#0c0c11",
  /** --color-surface-2 */
  surface2: "#14141b",
  /** --color-gold-500: the single accent. */
  gold: "#c8a34a",
  /** --color-gold-300 */
  goldLight: "#e8d19a",
  /** --color-gold-700 */
  goldDeep: "#7e6323",
  /** --color-gold-800 */
  goldDarkest: "#55431a",
  /** --color-ink-100 */
  ink: "#e8e8ec",
  /** --color-signal-electric */
  electric: "#8fb3bf",
} as const;

export const VOID = VIEWER_COLORS.void;
export const GOLD = VIEWER_COLORS.gold;
