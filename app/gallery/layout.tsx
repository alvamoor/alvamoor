import type { Metadata, Viewport } from "next";

import { backdrop, sans } from "@/app/fonts";
import "@/app/globals.css";

// A root layout of its own — /gallery is outside [locale] and there is no
// app/layout.tsx above either. page.module.css reads --font-backdrop for the
// watermark and the globals custom properties, so both fonts and globals.css are
// applied here.
//
// Single-language: the scene has almost no text, and its back link reads the
// NEXT_LOCALE cookie to decide which language to return to.
export const metadata: Metadata = {
  metadataBase: new URL("https://alvamoor.com"),
};

export const viewport: Viewport = {
  // The scene's own background, not the site's light tint — the browser chrome
  // frames a night sky here. This is the kind of per-surface difference a shared
  // root layout could not express.
  themeColor: "#06090f",
  width: "device-width",
  initialScale: 1,
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${backdrop.variable}`}>
      <body>{children}</body>
    </html>
  );
}
