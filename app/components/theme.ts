export const THEMES = ["classic", "pop", "natural"] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = "alvamoor-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.some((t) => t === value);
}
