import { describe, expect, it } from "vitest";

import { inquiryEmail, isEmail, mailtoHref, workUrl } from "./inquiry";

const work = {
  base: "3f1a2b9c",
  title: { en: "Untitled", de: "Ohne Titel" },
  mediumLabel: { en: "Pigments on canvas", de: "Pigmente auf Leinwand" },
  year: 2026,
  widthCm: 130,
  heightCm: 170,
};

describe("isEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("first.last+tag@mail.example.com")).toBe(true);
  });

  it("rejects what cannot be an address", () => {
    for (const bad of ["", "a", "a@b", "a b@c.de", "a@b.c@d.e", "<a@b.de>"])
      expect(isEmail(bad)).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail(42)).toBe(false);
  });

  it("rejects an address that carries a line break", () => {
    expect(isEmail("a@b.de\nBcc: x@y.de")).toBe(false);
  });
});

describe("inquiryEmail", () => {
  const base = {
    work,
    medium: "canvas" as const,
    locale: "en" as const,
    visitorEmail: "buyer@example.com",
    note: "",
  };

  it("names the work, its size and its address in the subject and body", () => {
    const { subject, text } = inquiryEmail(base);
    expect(subject).toBe("Inquiry: Untitled (130 × 170 cm)");
    expect(text).toContain("buyer@example.com");
    expect(text).toContain("130 × 170 cm");
    expect(text).toContain("https://alvamoor.com/en/works/canvas/3f1a2b9c");
  });

  it("writes the labels in the visitor's language", () => {
    const { subject, text } = inquiryEmail({ ...base, locale: "de" });
    expect(subject).toBe("Anfrage: Ohne Titel (130 × 170 cm)");
    expect(text).toContain("Arbeit: Ohne Titel");
    expect(text).toContain("/de/works/canvas/");
  });

  it("includes the note only when there is one", () => {
    expect(inquiryEmail(base).text).not.toContain("Their message");
    expect(inquiryEmail({ ...base, note: "  Is it framed?  " }).text).toMatch(
      /Their message:\nIs it framed\?$/,
    );
  });

  it("leaves the size out when it is unknown", () => {
    const { subject, text } = inquiryEmail({
      ...base,
      work: { ...work, widthCm: 0, heightCm: 0 },
    });
    expect(subject).toBe("Inquiry: Untitled");
    expect(text).not.toContain("Size");
  });

  it("keeps a line break in a title out of the subject", () => {
    const { subject } = inquiryEmail({
      ...base,
      work: { ...work, title: { en: "A\r\nBcc: x@y.de", de: "A" } },
    });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe("mailtoHref", () => {
  it("addresses the artist with the work's details prefilled", () => {
    const href = mailtoHref({ work, medium: "canvas", locale: "en" });
    expect(href.startsWith("mailto:alvamoor@posteo.net?subject=")).toBe(true);
    const body = decodeURIComponent(href.split("&body=")[1]);
    expect(body).toContain('"Untitled"');
    expect(body).toContain("130 × 170 cm");
    expect(body).toContain(workUrl("en", "canvas", work.base));
    expect(body).toMatch(/price/);
  });
});
