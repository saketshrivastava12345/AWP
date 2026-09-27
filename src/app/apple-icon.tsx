import { ImageResponse } from "next/og";
import {
  BRAND_COLORS,
  MARK_PATHS,
  MARK_STROKES,
  MARK_VIEWBOX,
} from "@/components/layout/brand-mark";

/*
 * The home-screen icon for iOS. Generated rather than committed as a PNG so
 * it can never drift from the mark in brand-mark.ts. iOS rounds the corners
 * itself, so the ground is full-bleed. No text, so no font is loaded — the
 * build never touches the network for it.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_COLORS.void,
        backgroundImage: `radial-gradient(circle at 50% 38%, ${BRAND_COLORS.surface2} 0%, ${BRAND_COLORS.void} 72%)`,
      }}
    >
      <svg width="112" height="112" viewBox={MARK_VIEWBOX} fill="none">
        <defs>
          <linearGradient
            id="gold"
            x1="16"
            y1="5"
            x2="16"
            y2="27"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={BRAND_COLORS.gold200} />
            <stop offset="0.55" stopColor={BRAND_COLORS.gold500} />
            <stop offset="1" stopColor={BRAND_COLORS.gold600} />
          </linearGradient>
        </defs>
        <path
          d={MARK_PATHS.chevron}
          stroke="url(#gold)"
          strokeWidth={MARK_STROKES.chevron * 0.8}
          strokeLinejoin="miter"
          strokeMiterlimit={10}
        />
        <path
          d={MARK_PATHS.bar}
          stroke="url(#gold)"
          strokeWidth={MARK_STROKES.bar * 0.8}
        />
      </svg>
    </div>,
    size,
  );
}
