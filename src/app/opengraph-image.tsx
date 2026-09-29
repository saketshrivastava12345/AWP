import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";
import {
  BRAND_COLORS,
  MARK_PATHS,
  MARK_STROKES,
  MARK_VIEWBOX,
} from "@/components/layout/brand-mark";

/*
 * The default social card for every page that does not supply its own.
 *
 * Deliberately self-contained so the build never needs the network: the text
 * uses next/og's bundled default face (no remote font fetch) and only plain
 * Latin characters, because a glyph missing from that face would make the
 * renderer go looking for a fallback font online. Separators and the mark are
 * drawn, not typed. It states what AURIX is and asserts no figures.
 */

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRID = 48;
const HIERARCHY = [
  "Country",
  "Manufacturer",
  "Model",
  "Variant",
  "Specifications",
  "Parts",
];

/** Opacity of a grid line at `t` (0–1 across the card), brightest at `focus`. */
function gridAlpha(t: number, focus: number): number {
  const falloff = Math.max(0, 1 - Math.abs(t - focus) / 0.75);
  return Math.round((0.015 + 0.075 * falloff * falloff) * 1000) / 1000;
}

function Mark({ px, opacity = 1 }: { px: number; opacity?: number }) {
  return (
    <svg width={px} height={px} viewBox={MARK_VIEWBOX} fill="none" style={{ opacity }}>
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
        strokeWidth={MARK_STROKES.chevron}
        strokeLinejoin="miter"
        strokeMiterlimit={10}
      />
      <path d={MARK_PATHS.bar} stroke="url(#gold)" strokeWidth={MARK_STROKES.bar} />
    </svg>
  );
}

/** One of the four gold brackets framing the card, like the site's HUD panels. */
function Corner({ top, left }: { top: boolean; left: boolean }) {
  // Only the keys that apply: the renderer expands shorthands such as
  // borderTop itself and cannot take an undefined value for one.
  const edge = `2px solid ${BRAND_COLORS.gold700}`;
  const style: Record<string, string | number> = {
    position: "absolute",
    width: 30,
    height: 30,
    [top ? "top" : "bottom"]: 36,
    [left ? "left" : "right"]: 36,
    [top ? "borderTop" : "borderBottom"]: edge,
    [left ? "borderLeft" : "borderRight"]: edge,
  };
  return <div style={style} />;
}

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "84px 96px 80px",
        backgroundColor: BRAND_COLORS.void,
        color: BRAND_COLORS.ink50,
      }}
    >
      {/* Technical grid, one hairline per line (the renderer neither tiles
          gradient backgrounds nor honours transparent stops in a radial
          mask reliably). Each line fades along its length and with its
          distance from the right-hand focus, which reads as a vignette. */}
      {Array.from({ length: Math.floor(size.width / GRID) }, (_, index) => {
        const x = (index + 1) * GRID;
        const a = gridAlpha(x / size.width, 0.72);
        return (
          <div
            key={`c${index}`}
            style={{
              position: "absolute",
              top: 0,
              left: x,
              width: 1,
              height: size.height,
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${a}) 45%, rgba(255,255,255,0) 100%)`,
            }}
          />
        );
      })}
      {Array.from({ length: Math.floor(size.height / GRID) }, (_, index) => {
        const y = (index + 1) * GRID;
        const a = gridAlpha(y / size.height, 0.45);
        return (
          <div
            key={`r${index}`}
            style={{
              position: "absolute",
              left: 0,
              top: y,
              width: size.width,
              height: 1,
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${a * 0.5}) 35%, rgba(255,255,255,${a}) 72%, rgba(255,255,255,0) 100%)`,
            }}
          />
        );
      })}

      {/* The mark, oversized and faint, bleeding off the right edge. */}
      <div style={{ position: "absolute", top: 40, right: -70, display: "flex" }}>
        <Mark px={560} opacity={0.07} />
      </div>

      <Corner top left />
      <Corner top left={false} />
      <Corner top={false} left />
      <Corner top={false} left={false} />

      {/* Top line: the project's own label, in the site's HUD manner. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 17,
          letterSpacing: 5,
          color: BRAND_COLORS.ink400,
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 10, height: 10, backgroundColor: BRAND_COLORS.gold500 }} />
        <div style={{ marginLeft: 18 }}>Automotive encyclopedia</div>
      </div>

      {/* Wordmark, hairline, tagline. */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Mark px={104} />
          <div
            style={{
              marginLeft: 40,
              fontSize: 132,
              lineHeight: 1,
              letterSpacing: 40,
              color: BRAND_COLORS.ink50,
            }}
          >
            AURIX
          </div>
        </div>

        <div
          style={{
            marginTop: 44,
            width: 640,
            height: 2,
            backgroundImage: `linear-gradient(90deg, ${BRAND_COLORS.gold500} 0%, ${BRAND_COLORS.gold700} 55%, rgba(6,6,10,0) 100%)`,
          }}
        />

        <div
          style={{
            marginTop: 30,
            fontSize: 28,
            letterSpacing: 9,
            color: BRAND_COLORS.gold400,
            textTransform: "uppercase",
          }}
        >
          {siteConfig.tagline}
        </div>
      </div>

      {/* The content hierarchy, which is what the site actually organises. */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        {HIERARCHY.map((level, index) => (
          <div key={level} style={{ display: "flex", alignItems: "center" }}>
            {index > 0 ? (
              <div
                style={{
                  width: 16,
                  height: 1,
                  margin: "0 12px",
                  backgroundColor: BRAND_COLORS.gold700,
                }}
              />
            ) : null}
            <div
              style={{
                fontSize: 15,
                letterSpacing: 3,
                color: BRAND_COLORS.ink300,
                textTransform: "uppercase",
              }}
            >
              {level}
            </div>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
