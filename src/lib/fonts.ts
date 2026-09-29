import { Inter, Inter_Tight, JetBrains_Mono, Michroma } from "next/font/google";

/**
 * Brand face: wide and geometric. A logo treatment only — the AURIX
 * wordmark and, optionally, a model nameplate (`font-brand`). It ships a
 * single 400 weight, which is why weight is pinned rather than variable.
 */
export const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/**
 * Display face (`font-display`): a quiet, slightly condensed grotesk for
 * headings, key figures, navigation and buttons — the voice of a car maker's
 * product site. Three weights only: 300 for display sizes, 400 for headings,
 * 500 for small headings and buttons.
 */
export const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

/** Body face: highly readable at small sizes, variable weight. */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Spec tables and compare columns, where digits must align. */
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const fontVariables = [
  michroma.variable,
  interTight.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(" ");
