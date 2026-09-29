import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scale, so without this it
 * misreads the design system's own tokens: `text-micro` looks like a text
 * COLOUR and is silently dropped when a colour follows it (a small primary
 * Button lost its dark label that way), and `tracking-hud` never displaced
 * `tracking-button`. Registering the tokens makes merging behave the way the
 * classes read.
 */
const twMerge = extendTailwindMerge<"type-preset" | "text-glow" | "text-fill">({
  extend: {
    theme: {
      text: ["micro", "nano"],
      tracking: ["display", "label", "button", "hud", "wide-hud"],
      shadow: ["glow-cyan", "glow-gold", "glow-violet"],
      font: ["brand", "hud", "display", "sans", "mono"],
      ease: ["cinematic", "metal", "standard", "exit", "spring"],
      radius: ["control", "card", "pill"],
    },
    classGroups: {
      // Composite typography utilities from globals.css. Their own group, so
      // a following colour class adjusts them instead of deleting them, and
      // a later preset replaces an earlier one.
      "type-preset": [
        "text-label",
        "text-hud",
        "text-display-xl",
        "text-display-l",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-lead",
        "text-body",
        "text-body-s",
        "text-caption",
        "text-eyebrow",
        "text-figure-xl",
        "text-figure",
        "text-data",
      ],
      // FX utilities that set text-shadow / a gradient fill. Their own
      // groups (and deliberately not prefixed text-*), so a text colour
      // class never deletes them and vice versa.
      "text-glow": ["glow-text", "glow-text-cyan", "glow-text-gold"],
      "text-fill": ["gradient-text", "gradient-text-aurora", "gold-gradient-text"],
      // Box glows are shadows: a later shadow-* replaces them.
      shadow: ["glow-cyan", "glow-gold", "glow-violet", "shadow-overlay"],
    },
    conflictingClassGroups: {
      // A preset sets family, size, leading, weight and tracking, so one
      // passed through `className` replaces a component's default size
      // classes rather than losing to them in the stylesheet.
      "type-preset": ["font-size", "leading", "tracking", "font-weight", "font-family"],
    },
  },
});

/**
 * Merge class names, with later Tailwind utilities beating earlier conflicting
 * ones. Lets a component define sensible defaults that a caller can override
 * through `className` without fighting specificity.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
