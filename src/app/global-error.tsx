"use client";

import { MARK_PATHS, MARK_STROKES, MARK_VIEWBOX } from "@/components/layout/brand-mark";

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 *
 * It replaces the entire document, so it renders its own <html> and <body>
 * and relies on nothing the layout provides — no stylesheet, no webfonts, no
 * providers. Hence inline styles, system fonts and a plain <a> home. Colours
 * are the design tokens' values (void, ink, gold).
 */

const COLORS = {
  void: "#06060a",
  line: "rgba(255,255,255,0.1)",
  lineStrong: "rgba(255,255,255,0.18)",
  gold: "#c8a34a",
  ink50: "#f7f7f8",
  ink300: "#a1a1ae",
  ink400: "#8a8a96",
} as const;

const eyebrow = {
  fontSize: "0.75rem",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

const button = {
  display: "inline-flex",
  alignItems: "center",
  height: "3rem",
  padding: "0 1.5rem",
  borderRadius: "4px",
  fontFamily: "inherit",
  fontSize: "0.9375rem",
  fontWeight: 500,
  textDecoration: "none",
  cursor: "pointer",
} as const;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>AURIX — Something went wrong</title>
        <meta name="theme-color" content={COLORS.void} />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.void,
          color: COLORS.ink50,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "1.5rem",
          boxSizing: "border-box",
          colorScheme: "dark",
        }}
      >
        <main style={{ width: "100%", maxWidth: "34rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <svg
              width="20"
              height="20"
              viewBox={MARK_VIEWBOX}
              fill="none"
              aria-hidden="true"
            >
              <path
                d={MARK_PATHS.chevron}
                stroke={COLORS.gold}
                strokeWidth={MARK_STROKES.chevron}
                strokeMiterlimit={10}
              />
              <path
                d={MARK_PATHS.bar}
                stroke={COLORS.gold}
                strokeWidth={MARK_STROKES.bar}
              />
            </svg>
            <span style={{ fontSize: "1rem", letterSpacing: "0.24em" }}>AURIX</span>
          </div>

          <p style={{ ...eyebrow, color: COLORS.ink400, margin: "3rem 0 0" }}>
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 6vw, 2.75rem)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "1rem 0 0",
            }}
          >
            AURIX could not start.
          </h1>
          <p
            style={{
              color: COLORS.ink300,
              fontSize: "1.0625rem",
              lineHeight: 1.55,
              margin: "1.25rem 0 0",
            }}
          >
            An unexpected error stopped the application from loading. Trying again usually
            resolves it.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "2rem",
            }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                ...button,
                border: "none",
                backgroundColor: COLORS.gold,
                color: COLORS.void,
              }}
            >
              Try again
            </button>
            {/* A plain anchor on purpose: this screen means the app itself
                failed, so a full document load is the reliable way home. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                ...button,
                border: `1px solid ${COLORS.lineStrong}`,
                color: COLORS.ink50,
              }}
            >
              Return home
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                fontSize: "0.8125rem",
                color: COLORS.ink400,
                borderTop: `1px solid ${COLORS.line}`,
                margin: "3rem 0 0",
                paddingTop: "1.25rem",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
