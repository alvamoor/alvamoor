"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import styles from "./ThemeSwitcher.module.css";
import { STORAGE_KEY, THEMES, type Theme, isTheme } from "./theme";

function applyTheme(theme: Theme) {
  if (theme === "classic") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeSwitcher() {
  const t = useTranslations("ThemeSwitcher");
  const [active, setActive] = useState<Theme>("classic");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isTheme(stored)) setActive(stored);
    } catch {
      // localStorage unavailable (private mode, disabled cookies) — use default
    }
  }, []);

  const choose = (theme: Theme) => {
    setActive(theme);
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  };

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t("label")}</legend>
      {THEMES.map((theme, i) => (
        <span key={theme}>
          {i > 0 && (
            <span className={styles.sep} aria-hidden="true">
              /
            </span>
          )}
          <label
            className={`${styles.option} ${active === theme ? styles.active : ""}`}
          >
            <input
              type="radio"
              name="theme"
              value={theme}
              checked={active === theme}
              onChange={() => choose(theme)}
              className={styles.input}
            />
            {t(theme)}
          </label>
        </span>
      ))}
    </fieldset>
  );
}
