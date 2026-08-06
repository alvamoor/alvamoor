import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";

import "./globals.css";
import { TILE_TINTS } from "./lib/palette";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

const backdrop = localFont({
  src: "./fonts/Direction-R9e63.otf",
  preload: true,
  display: "block",
  variable: "--font-backdrop",
});

// Root-level base URL so every route — including ones outside [locale] like
// /gallery and 404s — resolves OpenGraph/Twitter image URLs absolutely instead
// of falling back to http://localhost:3000. Localized routes set their own too.
export const metadata: Metadata = {
  metadataBase: new URL("https://alvamoor.com"),
};

export const viewport: Viewport = {
  // The tile the landing centres on at first paint (InfiniteScroll starts on the
  // pattern's origin), so the browser chrome matches the page it frames.
  themeColor: TILE_TINTS[0],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  return (
    <html lang={locale} className={`${sans.variable} ${backdrop.variable}`}>
      <body>{children}</body>
    </html>
  );
}
