import type { Metadata, Viewport } from "next";

import { sans } from "@/app/fonts";
import "@/app/globals.css";

// A root layout of its own, because /admin sits outside [locale] and there is no
// app/layout.tsx above either of them. Keeping it separate is what stops the
// public site's chrome, its translations, and — before this — its dynamic
// rendering from reaching an internal tool that needs none of them.
//
// Single-language on purpose: the artist is the only user, and the UI is English.
// admin.module.css names no font variable, so only --font-sans is applied here;
// the display face the site watermark uses is not loaded.
export const metadata: Metadata = {
  metadataBase: new URL("https://alvamoor.com"),
  title: "Works admin",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
