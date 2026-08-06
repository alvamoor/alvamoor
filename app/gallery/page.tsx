import { cookies } from "next/headers";

import NavDots from "./NavDots";
import SceneWrapper from "./SceneWrapper";
import styles from "./page.module.css";

export const metadata = {
  title: "alva moor — space out",
  description: "A quiet 3D space drifting through the night.",
};

export default async function GalleryPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const backHref = locale === "de" ? "/de" : "/en";

  return (
    <>
      <div className={styles.watermark} aria-hidden="true" />
      <SceneWrapper />
      <a href={backHref} className={styles.back} aria-label="Back">
        <span className={styles.arrow} aria-hidden="true">
          ←
        </span>
      </a>
      <NavDots />
    </>
  );
}
