"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import styles from "@/app/showroom/showroom.module.css";

import type { ShowroomWork } from "./Showroom";

// The code-split boundary for three.js — ~850 KB that only this route pays, and
// only as a static asset served by the ASSETS binding, so it costs the Worker
// bundle nothing.
//
// Two things the scene this replaces did without: a loading state, and a Suspense
// boundary. `useTexture` suspends, and with nothing to catch it the canvas simply
// appeared whenever it was ready. Both fallbacks here are just the wall's colour —
// the real content of the page (title, measurement, comparison) is server-rendered
// DOM in ShowroomView and is already on screen, so there is nothing to spin over.
const Showroom = dynamic(() => import("./Showroom"), {
  ssr: false,
  loading: () => <div className={styles.loading} />,
});

export function SceneFrame({
  work,
  preload,
}: {
  work: ShowroomWork;
  preload?: string[];
}) {
  return (
    <Suspense fallback={<div className={styles.loading} />}>
      <Showroom work={work} preload={preload} />
    </Suspense>
  );
}
