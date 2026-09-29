/**
 * Offscreen text measurement shared by the two inputs. One canvas for the
 * whole page: a 2D context is cheap to keep and expensive to create per
 * keystroke. Browser-only — every caller runs inside an effect.
 */

let context: CanvasRenderingContext2D | null | undefined;

export function getMeasureContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  if (typeof document === "undefined") return null;
  context = document.createElement("canvas").getContext("2d");
  return context;
}

/**
 * The CSS `font` shorthand matching an element's computed style, at an
 * optional different size. Chromium fills the `font` computed property
 * itself; the composed form is the fallback for browsers that leave it
 * empty.
 */
export function fontShorthand(style: CSSStyleDeclaration, sizePx?: number): string {
  if (sizePx === undefined && style.font) return style.font;
  const size = (sizePx ?? parseFloat(style.fontSize)) || 16;
  return `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
}

/** Computed letter-spacing in px (0 for "normal"). */
export function letterSpacingPx(style: CSSStyleDeclaration): number {
  const parsed = parseFloat(style.letterSpacing);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The width of `text` drawn in `font`, with `letterSpacing` px added after
 * each character the way the browser does. Returns 0 when there is no
 * canvas (never in a real browser).
 */
export function measureTextWidth(text: string, font: string, letterSpacing = 0): number {
  if (text === "") return 0;
  const ctx = getMeasureContext();
  if (!ctx) return 0;
  ctx.font = font;
  ctx.letterSpacing = "0px";
  const width = ctx.measureText(text).width;
  return width + letterSpacing * Array.from(text).length;
}
