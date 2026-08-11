import type { Metadata, Viewport } from "next";

import { sans } from "@/app/fonts";
import "@/app/globals.css";

// A root layout of its own — /showroom sits outside [locale] and there is no
// app/layout.tsx above either of them. It replaces app/gallery/layout.tsx, which
// existed for the same reason.
//
// Single-language, inherited from the route it replaces: the showroom is a canvas
// with a back link and a line of dimensions, and it is reached from a work's page
// rather than navigated to. The one wart is that a German visitor reads the English
// title in the overlay. Putting the route under [locale] would fix that and cost
// the site shell wrapping a full-bleed canvas.
//
// Only --font-sans is applied: nothing here draws the display face, unlike the
// night scene's viewport-sized watermark, which is gone.
export const metadata: Metadata = {
  metadataBase: new URL("https://alvamoor.com"),
};

export const viewport: Viewport = {
  // The wall colour, so the browser chrome frames the room rather than announcing
  // a different surface. The night scene set #06090f here; there is no night any
  // more.
  themeColor: "#e8e4dc",
  width: "device-width",
  initialScale: 1,
};

export default function ShowroomLayout({
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
