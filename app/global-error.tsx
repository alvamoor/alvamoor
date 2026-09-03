"use client";

import { useEffect } from "react";

/**
 * The last boundary: an error thrown by a *root layout* itself, which ./[locale]/
 * error.tsx cannot catch because it renders inside the layout that failed.
 *
 * Everything here is self-contained, and that is forced rather than chosen. This
 * component replaces the root layout, so it must supply its own <html> and <body>,
 * and it cannot assume anything the layout sets up: no fonts, no palette custom
 * properties, no IntlProvider — which is why the styles are inline and the copy is
 * hard-coded rather than translated. Reaching for useTranslations here would throw
 * inside the error handler, replacing a readable page with a blank one.
 *
 * For the same reason there is no locale to pick from, so it says it twice. Two
 * short lines is a fair price for not guessing wrong at the one moment the site has
 * already failed once.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("page error", error.digest ?? "(no digest)", error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#f4f2ef",
          color: "#1a1a1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif",
          fontSize: "0.9375rem",
          lineHeight: 1.7,
        }}
      >
        <main style={{ maxWidth: "34ch" }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            Something went wrong on our end. Reloading usually helps.
          </p>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.7 }}>
            Auf unserer Seite ist etwas schiefgelaufen. Neu laden hilft meist.
          </p>
          <a
            href="/en/works/paper"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            back to the works
          </a>
        </main>
      </body>
    </html>
  );
}
