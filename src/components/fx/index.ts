/**
 * The FX motion kit. Everything here except FxRuntime is a server component
 * that renders data attributes / classes; FxRuntime (mounted once in the
 * root layout) animates them. See scratchpad FX-CONTRACT.md for usage.
 */
export { Reveal, type RevealVariant } from "./Reveal";
export { ScrambleText } from "./ScrambleText";
export { CountUp } from "./CountUp";
export { TiltCard } from "./TiltCard";
export { Magnetic } from "./Magnetic";
export { Parallax } from "./Parallax";
export { Marquee } from "./Marquee";
export {
  GridBackground,
  Scanlines,
  GlowOrbs,
  Spotlight,
  CursorGlow,
} from "./Backgrounds";
export { HudFrame } from "./HudFrame";
