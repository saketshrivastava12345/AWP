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
const twMerge = extendTailwindMerge<"type-preset">({
  extend: {
    theme: {
      text: ["micro", "nano"],
      tracking: ["display", "label", "button", "hud"],
      ease: ["cinematic", "metal"],
    },
    classGroups: {
      // Composite typography utilities from globals.css. Their own group, so
      // a following colour class adjusts them instead of deleting them.
      "type-preset": ["text-label", "text-hud"],
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
