"use client";

import { type Artwork } from "@/app/lib/artworks";
import { TILE_TINTS } from "@/app/lib/palette";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import styles from "../works.module.css";

type Props = {
  works: Artwork[];
  locale: Locale;
  medium: string;
};

// Roughly the above-the-fold grid rows (3 cols mobile, 4 desktop). These load
// eagerly at high priority for a fast LCP; everything below stays lazy.
const EAGER_COUNT = 8;

export default function MediumGrid({ works, locale, medium }: Props) {
  return (
    <div className={styles.grid}>
      {works.map((a, i) => (
        <Link
          key={a.id}
          href={`/works/${medium}/${a.base}`}
          className={styles.thumb}
          prefetch={false}
          scroll={false}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.thumbImg}
            src={a.src}
            srcSet={a.webpSrcSet}
            // The column is ~267px above 56rem and ~30vw below; these are
            // inflated ~12% because object-fit: cover crops, so a landscape
            // source needs more pixels than the box and `sizes` cannot say so.
            sizes="(min-width: 56rem) 300px, 34vw"
            alt={a.title[locale]}
            loading={i < EAGER_COUNT ? "eager" : "lazy"}
            fetchPriority={i < EAGER_COUNT ? "high" : "auto"}
            decoding="async"
            style={{ backgroundColor: TILE_TINTS[i % TILE_TINTS.length] }}
          />
        </Link>
      ))}
    </div>
  );
}
