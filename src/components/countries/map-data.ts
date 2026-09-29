/**
 * Geography for the world map: country marker positions and the land mask.
 *
 * Bundled locally on purpose. Nothing is fetched from a third-party URL at
 * runtime, so there is nothing to break offline and no dependency on someone
 * else's CDN staying up.
 *
 * Markers are approximate centroids, which is all an equirectangular marker
 * map needs. The land mask draws coastlines only; no country outlines are
 * drawn, so no boundary data (and no boundary politics) is involved.
 */

export type LabelSide = "left" | "right" | "top" | "bottom";

export type CountryMarker = {
  slug: string;
  lat: number;
  lon: number;
  /** Which side of the marker its short label sits on, to keep Europe legible. */
  label?: LabelSide;
};

/**
 * Marker coordinates by country slug. A catalogued country without an entry
 * here simply has no marker: it still appears in the card grid.
 */
export const COUNTRY_MARKERS: readonly CountryMarker[] = [
  { slug: "india", lat: 22.0, lon: 79.0 },
  { slug: "germany", lat: 51.2, lon: 10.4, label: "right" },
  { slug: "italy", lat: 42.8, lon: 12.6, label: "right" },
  { slug: "japan", lat: 36.2, lon: 138.3 },
  { slug: "united-states", lat: 39.8, lon: -98.6 },
  { slug: "united-kingdom", lat: 54.0, lon: -2.0, label: "left" },
  { slug: "france", lat: 46.6, lon: 2.4, label: "left" },
  { slug: "south-korea", lat: 36.5, lon: 127.9, label: "top" },
  { slug: "sweden", lat: 60.1, lon: 15.0, label: "top" },
  { slug: "china", lat: 35.9, lon: 104.2, label: "left" },
];

/**
 * The land mask: Natural Earth 1:110m land polygons (public domain, via the
 * world-atlas TopoJSON package), rasterised onto a 2-degree equirectangular
 * grid between LAND_GRID.top and LAND_GRID.bottom. A cell counts as land when
 * at least 45% of it is.
 *
 * Encoding: one row per grid row, north to south, separated by "|". Each row
 * is a comma-separated list of runs of land cells, "start.length" in base 36.
 * About 1.7 KB, against roughly 55 KB for the source polygons.
 */
export const LAND_GRID = {
  /** Degrees per cell, in both directions. */
  step: 2,
  /** Latitude of the top and bottom edges. Antarctica and the Arctic ocean are cropped. */
  top: 80,
  bottom: -56,
} as const;

export const LAND_RUNS =
  "17.3,1b.5,1k.o,2o.6,3u.4|u.1,16.1,1a.5,1j.p,2q.1,3x.2|z.2,14.1,18.1,1b.3,1p.j,3a.2,3" +
  "p.d,4f.3|s.5,10.1,13.2,16.2,19.4,1e.2,1q.h,39.1,3m.o,4g.1|b.2,v.7,16.2,1a.8,1r.g,2u." +
  "2,39.1,3g.2,3j.r,4g.5,4m.2,4p.1|8.7,w.9,16.1,1a.1,1d.4,1k.8,24.m,31.3,35.3,39.1,3g.1" +
  ",3i.2|3.5,1d.4,1m.5,21.o,32.2,35.1,3i.1|0.1,5.1,1b.5,1k.2,1n.4,1z.7,2b.d,2t.2,2z.3|8" +
  ".10,1i.3,1t.4,2m.5,2t.26|7.10,1f.4,1u.3,2l.6,2t.1v,4q.6|9.4,l.m,1f.5,1l.1,2l.6,2u.1n" +
  ",4m.1,4q.1|b.1,n.m,1g.7,2f.2,2m.1,2o.2,2t.1m,4o.4|o.p,1f.a,2e.1,2g.1,2m.1,2s.1m,4o.3" +
  "|q.n,1f.b,2d.2,2g.2,2k.1x,4o.2|q.10,2f.3,2j.1x,4h.1|s.t,1p.2,2h.1z,4h.1|s.u,2h.1y|s." +
  "s,1l.2,2h.7,2p.8,31.5,38.16|s.r,2e.6,2n.2,2r.5,32.4,38.15,4g.2|s.q,2e.5,2p.1,2s.4,2x" +
  ".a,39.12,4g.1|s.p,2d.5,2s.2,2v.c,39.w,48.2,4g.1|t.n,2e.3,2l.2,2w.b,39.y,49.2,4e.2|u." +
  "m,2f.8,30.16,4c.4|v.j,2e.a,30.16,4b.1|w.h,2d.e,2s.1f|y.8,1d.1,2d.t,37.10|x.1,z.6,1d." +
  "1,2b.o,30.7,39.x|10.5,2b.o,31.7,39.1,3f.r|11.4,1d.1,2a.q,31.b,3g.o|11.4,19.1,1f.1,2a" +
  ".r,32.9,3h.9,3s.8,41.1|12.4,18.2,1h.2,2a.r,33.8,3i.6,3t.6,40.1|14.6,2a.r,33.6,3j.4,3" +
  "t.7,46.1|18.4,29.t,33.4,3j.3,3v.5,46.1|1a.2,2a.v,3j.3,3v.6|1b.1,1h.3,2a.u,36.2,3k.2," +
  "3y.2|1c.1,1g.8,2b.w,3k.1,3m.1,3v.1|1f.a,2c.v,3m.1,3w.1,48.1|1f.d,2d.2,2g.1,2l.l,3u.1" +
  ",3w.2,43.2|1f.e,2n.i,3v.1,3x.1,42.3|1e.f,2n.h,3v.3,41.4|1e.h,2n.g,3w.2,41.4,46.1,4c." +
  "1|1e.k,2n.f,3x.2,42.2,46.1,4d.4|1d.n,2o.e,3y.1,4f.4|1e.n,2o.e,3z.3,4f.5|1f.l,2p.d,4g" +
  ".1,4j.1|1f.l,2p.d|1g.j,2o.e,36.1,4b.3,4h.1|1g.j,2o.e,36.1,49.5,4h.2|1i.g,2o.d,34.2,4" +
  "7.8,4g.3|1j.f,2o.c,34.3,47.c|1j.f,2p.b,34.2,44.h|1j.d,2p.b,34.2,43.i|1j.b,2p.a,34.1," +
  "43.j|1j.b,2q.8,43.k|1i.b,2q.8,43.k|1i.b,2r.6,44.j|1i.a,2r.5,44.4,4d.9|1i.8,44.1,4f.6" +
  "|1h.9,4g.5,4x.1|1h.6,4x.2|1h.6,4j.1,4w.1|1h.5,4j.1,4v.2|1h.4,4u.2|1h.4|1g.4|1g.4|1h." +
  "3|1i.2";
