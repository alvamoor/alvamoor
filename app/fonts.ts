// Shared by the root layouts. There is no app/layout.tsx any more — [locale] and
// admin are each their own root (see app/[locale]/layout.tsx) — and next/font
// loaders must run at module scope, so they live here rather than being called once
// per root.
//
// Each root applies only the variables its stylesheets actually read:
//   [locale]  both — shell.module.css uses --font-backdrop for the watermark
//   admin     sans only — admin.module.css names no font variable
import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

// The display face, and it has exactly one consumer: the watermark in
// shell.module.css, whose content is `"alva\A moor"` under `text-transform:
// uppercase` at `opacity: 0.055`. Six distinct glyphs, behind everything, at 5.5%
// opacity.
//
// Which is why this is a subset rather than the original OTF. Measured over the
// wire, where the OTF was already being gzipped in transit:
//
//   OTF + gzip           13.9 KB   (what shipped until now)
//   full woff2            9.5 KB
//   subset woff2          2.3 KB   ← this
//
// Subset to U+0020 and U+0041–005A — space and all of A–Z — rather than just the
// six glyphs the watermark needs. The extra twenty cost ~1 KB and mean that editing
// the watermark string cannot silently fall back to Impact for the new letters.
// Anything outside that range will, so re-subset from the .otf beside this file if
// the face is ever used for real text. That .otf is kept as the master; next/font
// bundles only what `src` names, so it adds nothing to the build.
//
// display "swap", not "block". "block" hides the element for up to 3s waiting on
// the font — a rendering block bought on behalf of a decorative mark nobody can
// quite see. "swap" paints Impact immediately and swaps when the face arrives,
// which at this opacity and size is not a visible change.
export const backdrop = localFont({
  src: "./fonts/Direction-R9e63.subset.woff2",
  preload: true,
  display: "swap",
  variable: "--font-backdrop",
});
