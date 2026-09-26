import { Inter, JetBrains_Mono, Michroma } from "next/font/google";

/**
 * Display face: wide, technical, geometric. Used for headlines, the AURIX
 * wordmark, section labels and large numeric stats. Michroma ships a single
 * 400 weight, which is why weight is pinned rather than variable.
 */
export const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
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
  inter.variable,
  jetbrainsMono.variable,
].join(" ");
