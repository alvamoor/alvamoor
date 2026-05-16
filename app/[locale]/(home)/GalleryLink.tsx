"use client";

import { useCallback } from "react";

import { Link, useRouter } from "@/i18n/navigation";

import styles from "./page.module.css";

let preloaded = false;

export default function GalleryLink({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const preloadScene = useCallback(() => {
    if (preloaded) return;
    preloaded = true;
    router.prefetch("/gallery");
    import("@/app/gallery/Scene");
  }, [router]);

  return (
    <Link
      href="/gallery"
      className={styles.taglineLink}
      prefetch
      onPointerEnter={preloadScene}
      onMouseEnter={preloadScene}
      onFocus={preloadScene}
      onTouchStart={preloadScene}
    >
      {children}
    </Link>
  );
}
