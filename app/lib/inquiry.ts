// Everything about an inquiry that has no I/O: what the email says, and how an
// address or a note is judged. Shared by the API route (which sends the email),
// the dialog (which offers a mailto: link when the form is not wanted) and the
// tests.
import type { ManifestEntry, Medium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

// The address visitors see and the form's email goes to. Cloudflare Email Routing
// forwards it to the real mailbox, which is never published. The binding in
// wrangler.jsonc is locked to this address, so changing it here alone makes every
// send fail rather than go somewhere unintended.
export const INBOX = "contact@alvamoor.com";

// Must be on a domain onboarded to Email Service → Email Sending.
export const SENDER = "inquiries@alvamoor.com";

const SITE = "https://alvamoor.com";

export const MAX_NOTE = 2000;
const MAX_EMAIL = 254;

export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_EMAIL &&
    /^[^\s@<>",;:]+@[^\s@<>",;:]+\.[^\s@<>",;:]+$/.test(value)
  );
}

// Header values must never carry a line break: this text ends up in Subject, and a
// visitor-influenced newline there would let them add headers of their own.
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

type Work = Pick<
  ManifestEntry,
  "base" | "title" | "mediumLabel" | "year" | "widthCm" | "heightCm"
>;

export function workUrl(locale: Locale, medium: Medium, base: string): string {
  return `${SITE}/${locale}/works/${medium}/${base}`;
}

function sizeOf(w: Work): string | null {
  return w.widthCm > 0 && w.heightCm > 0
    ? `${w.widthCm} × ${w.heightCm} cm`
    : null;
}

const COPY = {
  en: {
    subject: "Inquiry",
    from: "From",
    work: "Work",
    medium: "Medium",
    year: "Year",
    size: "Size",
    link: "Link",
    language: "Language",
    asks: "They would like to know the price and see more pictures.",
    note: "Their message",
    hello: "Hello,",
    interested: (title: string, details: string) =>
      `I am interested in "${title}"${details}.`,
    question: "Could you tell me the price and send me more pictures?",
    thanks: "Thank you!",
  },
  de: {
    subject: "Anfrage",
    from: "Von",
    work: "Arbeit",
    medium: "Technik",
    year: "Jahr",
    size: "Größe",
    link: "Link",
    language: "Sprache",
    asks: "Gewünscht sind der Preis und weitere Bilder.",
    note: "Nachricht",
    hello: "Hallo,",
    interested: (title: string, details: string) =>
      `ich interessiere mich für „${title}“${details}.`,
    question:
      "Wie viel kostet die Arbeit, und könnten Sie mir weitere Bilder schicken?",
    thanks: "Vielen Dank!",
  },
} satisfies Record<Locale, unknown>;

function subjectFor(w: Work, locale: Locale): string {
  const size = sizeOf(w);
  return oneLine(
    `${COPY[locale].subject}: ${w.title[locale]}${size ? ` (${size})` : ""}`,
  );
}

/** The email the artist receives when someone sends the form. Plain text. */
export function inquiryEmail(args: {
  work: Work;
  medium: Medium;
  locale: Locale;
  visitorEmail: string;
  note: string;
}): { subject: string; text: string } {
  const { work, medium, locale, visitorEmail, note } = args;
  const c = COPY[locale];
  const size = sizeOf(work);

  const lines = [
    `${c.work}: ${work.title[locale]}`,
    `${c.medium}: ${work.mediumLabel[locale]}`,
    `${c.year}: ${work.year}`,
    ...(size ? [`${c.size}: ${size}`] : []),
    `${c.link}: ${workUrl(locale, medium, work.base)}`,
    "",
    `${c.from}: ${visitorEmail}`,
    `${c.language}: ${locale.toUpperCase()}`,
    c.asks,
  ];
  if (note.trim()) lines.push("", `${c.note}:`, note.trim());

  return { subject: subjectFor(work, locale), text: lines.join("\n") };
}

/** A prefilled mail to the artist, for visitors who would rather use their own client. */
export function mailtoHref(args: {
  work: Work;
  medium: Medium;
  locale: Locale;
}): string {
  const { work, medium, locale } = args;
  const c = COPY[locale];
  const size = sizeOf(work);
  const details = [work.mediumLabel[locale], size, String(work.year)]
    .filter(Boolean)
    .join(", ");

  const body = [
    c.hello,
    "",
    c.interested(work.title[locale], ` (${details})`),
    workUrl(locale, medium, work.base),
    "",
    c.question,
    "",
    c.thanks,
  ].join("\n");

  return `mailto:${INBOX}?subject=${encodeURIComponent(subjectFor(work, locale))}&body=${encodeURIComponent(body)}`;
}
