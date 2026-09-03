import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getWindow, isMedium } from "@/app/lib/artworks";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import { WorksHeading } from "../../WorksHeading";
import WorkScroller from "./WorkScroller";

// Nothing is enumerated here, unlike the gallery one level up: which works exist
// is a property of the R2 manifest at request time, not of the build, so a work
// added today should be linkable without a redeploy.
//
// The empty array is doing real work all the same, and `revalidate` below is a
// no-op without it. Omit generateStaticParams entirely and Next classifies the
// route as dynamic — it never enters the prerender manifest, so every request
// re-renders and nothing is stored. Returning no params instead puts the route in
// the manifest with a blocking fallback: the first request for a work renders it,
// the result is cached, and the window below applies from there.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string; work: string }>;
}): Promise<Metadata> {
  const { locale, medium, work } = await params;
  if (!isMedium(medium)) return {};

  const found = await getWindow(medium, work);
  if (found.status !== "ok") return {};

  const { current } = found.window;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  const path = `/works/${medium}/${current.base}`;

  return {
    title: `${current.title[locale]} — ${t(medium).toLowerCase()}`,
    description: current.description?.[locale],
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}${path}`]),
      ),
    },
    openGraph: {
      title: current.title[locale],
      description: current.description?.[locale],
      images: [{ url: current.src }],
    },
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string; work: string }>;
}) {
  const { locale, medium, work } = await params;
  if (!isMedium(medium)) notFound();

  const t = await getTranslations({ locale, namespace: "Gallery" });

  const found = await getWindow(medium, work);

  // The manifest could not be read, so we do not know whether this work exists.
  // Throwing is the whole point: it renders ../../../error.tsx and, unlike a
  // redirect or a notFound, Next stores nothing for a render that threw. A blip
  // costs one request instead of being cached as "this work is gone" for the rest
  // of the revalidate window.
  if (found.status === "unavailable")
    throw new Error(`${medium} manifest unavailable: ${found.reason}`);

  if (found.status === "missing") {
    // Anything the manifest does not name — a deleted work, a typo, or one of the
    // positional URLs works had before this route addressed them by name — lands
    // on the grid. Safe to cache: it stays true until the manifest changes.
    //
    // A position is deliberately NOT resolved to the work that currently sits
    // there. That redirect was cached like any other response (s-maxage=60,
    // x-nextjs-prerender: 1), so it carried the exact staleness this route was
    // rewritten to remove: after a re-sort, a cached /works/paper/44 kept sending
    // visitors to whatever was 44th when it was last rendered. A redirect that can
    // be quietly wrong is worse than one that admits it does not know.
    redirect({ href: `/works/${medium}`, locale });

    // Unreachable: redirect() throws. It is here because next-intl types it as
    // returning void rather than never, so without it the compiler still believes
    // `found` may not be "ok" below.
    notFound();
  }

  const { window: win } = found;

  return (
    <>
      <WorksHeading locale={locale} medium={medium} />

      <WorkScroller
        prev={win.prev}
        current={win.current}
        next={win.next}
        locale={locale}
        medium={medium}
        labels={{
          prev: t("prev"),
          next: t("next"),
          back: t("back"),
        }}
      />
    </>
  );
}
