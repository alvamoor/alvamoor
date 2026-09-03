"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/navigation";

import styles from "./pages.module.css";

/**
 * Every error a page under /[locale] throws, whatever it was.
 *
 * The copy is deliberately cause-agnostic. A visitor cannot act on *which*
 * subsystem failed, and guessing wrong is worse than saying nothing: "check your
 * connection" sends someone to reboot their router over a failed R2 fetch. So it
 * says only the two things that are both always true and actually useful — it is
 * not their fault, and retrying is worth one press.
 *
 * This is the *nearest* boundary, so it is where page errors stop: ../global-error
 * only ever sees what this does not catch, which is an error in a root layout.
 * Removing this file to route everything through that one was tried and does not
 * help — the failure below is invisible to both.
 *
 * What neither boundary covers, so nobody reads a bare 500 as this file being
 * broken:
 *
 *   * A throw during *static generation* of a prerendered route. Next aborts the
 *     generation and answers with a plain "Internal Server Error"; a client error
 *     boundary needs a flight payload to render and there is none. Verified against
 *     a dead manifest host, with and without this file present. Most routes here
 *     are static, so the gap is real.
 *   * A Worker killed by the CPU limit (Cloudflare 1102) or throwing before the app
 *     loads (1101). Cloudflare answers those itself.
 *
 * Both need a Cloudflare custom error page at the zone level, not app code.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    // The digest is the only handle on the server-side stack, which is redacted in
    // production. Logging it is what makes a visitor's report correlatable.
    // eslint-disable-next-line no-console
    console.error("page error", error.digest ?? "(no digest)", error.message);
  }, [error]);

  return (
    <div className={styles.prose}>
      <h1 className={styles.statement}>{t("heading")}</h1>
      <p className={styles.intro}>{t("body")}</p>
      <p className={styles.intro}>
        {/* Retry before navigating away: most of what reaches this boundary is
            transient — a manifest that failed to read this second usually reads
            fine the next. reset() re-renders the segment without a full reload. */}
        <button type="button" className={styles.contactLink} onClick={reset}>
          {t("retry")}
        </button>
        {" · "}
        <Link href="/works/paper" className={styles.contactLink}>
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
