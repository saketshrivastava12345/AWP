"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 *
 * This replaces the entire document, so it must render its own <html> and
 * <body> and cannot rely on the app's providers, fonts or stylesheet — hence
 * the inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#06060a",
          color: "#e8e8ec",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p
            style={{
              fontSize: "0.625rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7c7c8a",
              margin: 0,
            }}
          >
            AURIX
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              letterSpacing: "0.06em",
              margin: "1.25rem 0 0",
            }}
          >
            The application failed to start
          </h1>
          <p style={{ color: "#a1a1ae", lineHeight: 1.7, marginTop: "1rem" }}>
            An unrecoverable error occurred while loading the page.
            {error.digest ? ` Reference: ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#c8a34a",
              color: "#06060a",
              border: "none",
              borderRadius: "2px",
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
