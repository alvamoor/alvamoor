// Shared by the root layouts. There is no app/layout.tsx any more — [locale],
// admin and gallery are each their own root (see app/[locale]/layout.tsx) — and
// next/font loaders must run at module scope, so they live here rather than being
// called once per root.
//
// Each root applies only the variables its stylesheets actually read:
//   [locale]  both — shell.module.css uses --font-backdrop for the watermark
//   gallery   both — page.module.css uses --font-backdrop for its watermark
//   admin     sans only — admin.module.css names no font variable
import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

export const backdrop = localFont({
  src: "./fonts/Direction-R9e63.otf",
  preload: true,
  display: "block",
  variable: "--font-backdrop",
});
