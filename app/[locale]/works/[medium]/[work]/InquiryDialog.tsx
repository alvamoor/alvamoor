"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Artwork } from "@/app/lib/artworks";
import { INBOX, MAX_NOTE, mailtoHref } from "@/app/lib/inquiry";
import type { Locale } from "@/i18n/routing";

import styles from "../../works.module.css";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void },
  ) => string;
  remove: (id: string) => void;
};

function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as unknown as { turnstile?: TurnstileApi };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () =>
      w.turnstile ? resolve(w.turnstile) : reject(new Error("no turnstile"));
    s.onerror = () => reject(new Error("turnstile failed to load"));
    document.head.appendChild(s);
  });
}

type Status = "idle" | "sending" | "sent" | "error";

export default function InquiryDialog({
  work,
  locale,
}: {
  work: Artwork;
  locale: Locale;
}) {
  const t = useTranslations("Inquiry");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // A click on the dimmed area is a click on the dialog element itself. Attached
  // here rather than as a JSX prop: the a11y rules, rightly, do not want a click
  // handler on a non-interactive element, and Escape already closes it natively.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);

  // Turnstile renders only while the dialog is open, so visitors who never ask
  // never load it.
  useEffect(() => {
    if (!open || !SITE_KEY || status === "sent") return;
    const el = captchaRef.current;
    if (!el) return;
    let widget: string | undefined;
    let api: TurnstileApi | undefined;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled) return;
        api = ts;
        widget = ts.render(el, { sitekey: SITE_KEY, callback: setToken });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (api && widget) api.remove(widget);
      setToken("");
    };
  }, [open, status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          medium: work.medium,
          base: work.base,
          locale,
          email,
          note,
          website,
          turnstile: token,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  // Runs however the dialog closed: a button, Escape, or the dimmed area. Keeps
  // what was typed after a failure; starts fresh after a success.
  function onClosed() {
    setOpen(false);
    if (status === "sent") {
      setStatus("idle");
      setNote("");
    }
  }

  const mailto = mailtoHref({ work, medium: work.medium, locale });

  return (
    <>
      <button
        type="button"
        className={styles.inquire}
        onClick={() => setOpen(true)}
      >
        {t("button")}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.inquiryDialog}
        onClose={onClosed}
        aria-labelledby="inquiry-title"
      >
        <div className={styles.inquiryBody}>
          {status === "sent" ? (
            <>
              <p id="inquiry-title" className={styles.inquiryHeading}>
                {t("sentTitle")}
              </p>
              <p className={styles.inquiryText}>{t("sentBody")}</p>
              <button
                type="button"
                className={styles.inquirySubmit}
                onClick={() => dialogRef.current?.close()}
              >
                {t("close")}
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              <p id="inquiry-title" className={styles.inquiryHeading}>
                {t("heading", { title: work.title[locale] })}
              </p>
              <p className={styles.inquiryText}>{t("intro")}</p>

              <label className={styles.inquiryField}>
                <span>{t("email")}</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className={styles.inquiryField}>
                <span>{t("note")}</span>
                <textarea
                  name="note"
                  rows={3}
                  maxLength={MAX_NOTE}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              {/* Honeypot: people never see or reach it. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className={styles.inquiryTrap}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />

              {SITE_KEY && <div ref={captchaRef} />}

              {status === "error" && (
                <p className={styles.inquiryError} role="alert">
                  {t("error")}
                </p>
              )}

              <div className={styles.inquiryActions}>
                <button
                  type="submit"
                  className={styles.inquirySubmit}
                  disabled={status === "sending" || (!!SITE_KEY && !token)}
                >
                  {status === "sending" ? t("sending") : t("send")}
                </button>
                <button
                  type="button"
                  className={styles.inquiryCancel}
                  onClick={() => dialogRef.current?.close()}
                >
                  {t("cancel")}
                </button>
              </div>

              <p className={styles.inquiryAlt}>
                {t("or")} <a href={mailto}>{t("mailInstead")}</a>
                {" · "}
                <span className={styles.inquiryAddress}>{INBOX}</span>
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
