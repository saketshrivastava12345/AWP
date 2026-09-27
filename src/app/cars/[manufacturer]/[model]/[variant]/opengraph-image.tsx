import { ImageResponse } from "next/og";
import { getVariantDetail } from "@/lib/queries/cars";
import { primaryPhoto } from "@/lib/detail/viewer";
import { formatFigure, toFinite } from "@/lib/detail/figures";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { BRAND_COLORS } from "@/components/layout/brand-mark";
import { distinctVariantName } from "@/lib/format";
import { PLACEHOLDER_PARAM } from "@/lib/static-params";
import { powertrainKind, type VariantDetail } from "@/types/domain";

/*
 * The social card for a car without a catalogued photograph. A car WITH one
 * uses the photograph itself (generateMetadata), so generateImageMetadata
 * returns no card for it and nothing here overrides the photo.
 *
 * Self-contained so the build never needs the network: next/og's bundled
 * default face only, and text folded to plain ASCII, because a glyph missing
 * from that face ("é" in "Coupé", an en dash) would send the renderer looking
 * for a fallback font online. The car is the body-style drawing the site uses
 * wherever a photograph is missing, labelled as such, and the figures are the
 * published ones — an unpublished figure is simply not printed.
 */

type Params = { manufacturer: string; model: string; variant: string };

const SIZE = { width: 1200, height: 630 };
const CONTENT_TYPE = "image/png";
const CARD_ID = "card";

/** Plain ASCII: accents dropped, dashes straightened, anything else removed. */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

async function load(params: Params): Promise<VariantDetail | null> {
  const { manufacturer, model, variant } = params;
  if ([manufacturer, model, variant].includes(PLACEHOLDER_PARAM)) return null;
  return getVariantDetail(manufacturer, model, variant);
}

export async function generateImageMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const detail = await load(await params);
  if (!detail || primaryPhoto(detail)) return [];
  const name = [
    detail.manufacturer.name,
    detail.model.name,
    distinctVariantName(detail.model.name, detail.variant.name),
  ]
    .filter(Boolean)
    .join(" ");
  return [
    {
      id: CARD_ID,
      size: SIZE,
      contentType: CONTENT_TYPE,
      alt: `${name}: body-style drawing and published figures, AURIX`,
    },
  ];
}

function figuresOf(detail: VariantDetail): { value: string; label: string }[] {
  const p = detail.performance;
  const entries: ({ value: string; label: string } | null)[] = [
    toFinite(p?.power_hp) === null
      ? null
      : { value: `${formatFigure(toFinite(p?.power_hp) ?? 0)} HP`, label: "Power" },
    toFinite(p?.zero_to_100_s) === null
      ? null
      : {
          value: `${formatFigure(toFinite(p?.zero_to_100_s) ?? 0, 1)} S`,
          label: "0-100 km/h",
        },
    toFinite(p?.top_speed_kmh) === null
      ? null
      : {
          value: `${formatFigure(toFinite(p?.top_speed_kmh) ?? 0)} KM/H`,
          label: "Top speed",
        },
    toFinite(detail.ev?.range_km) === null
      ? null
      : {
          value: `${formatFigure(toFinite(detail.ev?.range_km) ?? 0)} KM`,
          label: detail.ev?.range_standard
            ? `Range (${detail.ev.range_standard.toUpperCase()})`
            : "Range",
        },
  ];
  return entries.filter(
    (entry): entry is { value: string; label: string } => entry !== null,
  );
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<Params>;
  id: Promise<string | number>;
}) {
  const detail = await load(await params);

  const maker = plain(detail?.manufacturer.name ?? "AURIX");
  const model = plain(detail?.model.name ?? "Car not found");
  const variant = detail
    ? plain(distinctVariantName(detail.model.name, detail.variant.name) ?? "")
    : "";
  const figures = detail ? figuresOf(detail).slice(0, 3) : [];
  const shape = carSilhouette(
    detail?.model.body_type ?? null,
    powertrainKind(detail?.variant.fuel_type ?? null),
    detail?.model.engine_position ?? null,
  );
  const modelSize = model.length > 14 ? 72 : model.length > 9 ? 88 : 108;
  // Drawn at the viewBox's own aspect: the renderer stretches an SVG to its box.
  const [, , boxWidth = 1, boxHeight = 1] = shape.viewBox.split(/\s+/).map(Number);
  const drawingWidth = 620;
  const drawingHeight = Math.round((drawingWidth * boxHeight) / Math.max(1, boxWidth));

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 80px 60px",
        backgroundColor: BRAND_COLORS.void,
        color: BRAND_COLORS.ink50,
      }}
    >
      {/* The body-style drawing, large and quiet, on the right. */}
      <div
        style={{
          position: "absolute",
          right: -30,
          bottom: 140,
          width: drawingWidth,
          height: drawingHeight,
          display: "flex",
        }}
      >
        <svg
          width={drawingWidth}
          height={drawingHeight}
          viewBox={shape.viewBox}
          fill="none"
        >
          <path
            d={shape.body}
            fill={BRAND_COLORS.surface2}
            stroke={BRAND_COLORS.ink500}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {shape.glass ? <path d={shape.glass} fill={BRAND_COLORS.void} /> : null}
          {shape.wheels.map((wheel) => (
            <circle
              key={wheel.cx}
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              fill={BRAND_COLORS.void}
              stroke={BRAND_COLORS.ink500}
              strokeWidth={2}
            />
          ))}
          {shape.wheels.map((wheel) => (
            <circle
              key={`hub${wheel.cx}`}
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              stroke={BRAND_COLORS.gold700}
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>

      {/* Top line: the site's HUD label. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 16,
          letterSpacing: 5,
          color: BRAND_COLORS.ink400,
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 10, height: 10, backgroundColor: BRAND_COLORS.gold500 }} />
        <div style={{ marginLeft: 16 }}>AURIX</div>
        <div
          style={{
            width: 28,
            height: 1,
            margin: "0 16px",
            backgroundColor: BRAND_COLORS.gold700,
          }}
        />
        <div>Specifications, performance and price</div>
      </div>

      {/* Name. */}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            color: BRAND_COLORS.ink300,
            textTransform: "uppercase",
          }}
        >
          {maker}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: modelSize,
            lineHeight: 1,
            letterSpacing: 2,
            color: BRAND_COLORS.ink50,
          }}
        >
          {model}
        </div>
        {variant ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 40,
              letterSpacing: 4,
              color: BRAND_COLORS.gold400,
            }}
          >
            {variant}
          </div>
        ) : null}
      </div>

      {/* Published figures, and what the drawing is. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex" }}>
          {figures.map((figure, index) => (
            <div
              key={figure.label}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingLeft: index === 0 ? 0 : 36,
                marginLeft: index === 0 ? 0 : 36,
                borderLeft: index === 0 ? "none" : `1px solid ${BRAND_COLORS.gold800}`,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: 4,
                  color: BRAND_COLORS.ink400,
                  textTransform: "uppercase",
                }}
              >
                {plain(figure.label)}
              </div>
              <div style={{ marginTop: 10, fontSize: 38, color: BRAND_COLORS.ink50 }}>
                {plain(figure.value)}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 4,
            color: BRAND_COLORS.ink500,
            textTransform: "uppercase",
          }}
        >
          Body-style drawing
        </div>
      </div>
    </div>,
    SIZE,
  );
}
