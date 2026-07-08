import { describe, expect, it } from "vitest";

import { validateEntries } from "./admin-r2";

// A minimal entry that passes every check; tests clone and break one field.
const valid = () => ({
  base: "paper-01",
  title: { en: "Untitled", de: "Ohne Titel" },
  mediumLabel: { en: "Acrylics on paper", de: "Acryl auf Papier" },
  year: 2025,
  widthCm: 0,
  heightCm: 0,
  status: "available" as const,
});

describe("validateEntries", () => {
  it("accepts an empty array", () => {
    expect(validateEntries([])).toBeNull();
  });

  it("accepts a well-formed entry", () => {
    expect(validateEntries([valid()])).toBeNull();
  });

  it("accepts an optional description when it has en+de", () => {
    expect(
      validateEntries([{ ...valid(), description: { en: "a", de: "b" } }]),
    ).toBeNull();
  });

  it("rejects a non-array", () => {
    expect(validateEntries({})).toMatch(/must be an array/);
    expect(validateEntries(null)).toMatch(/must be an array/);
  });

  it("rejects a base with illegal characters", () => {
    expect(validateEntries([{ ...valid(), base: "paper 01!" }])).toMatch(
      /invalid base/,
    );
  });

  it("rejects a missing base", () => {
    const e = valid() as Record<string, unknown>;
    delete e.base;
    expect(validateEntries([e])).toMatch(/invalid base/);
  });

  it("rejects duplicate bases and reports the index", () => {
    expect(validateEntries([valid(), valid()])).toMatch(
      /entry 1: duplicate base "paper-01"/,
    );
  });

  it("rejects a title missing a locale", () => {
    expect(validateEntries([{ ...valid(), title: { en: "only-en" } }])).toMatch(
      /title must have en\+de/,
    );
  });

  it("rejects a present-but-malformed description", () => {
    expect(
      validateEntries([{ ...valid(), description: { en: "only-en" } }]),
    ).toMatch(/description must have en\+de/);
  });

  it("rejects a non-numeric year", () => {
    expect(validateEntries([{ ...valid(), year: "2025" }])).toMatch(
      /year must be a number/,
    );
  });

  it("rejects non-numeric dimensions", () => {
    expect(validateEntries([{ ...valid(), widthCm: null }])).toMatch(
      /widthCm\/heightCm must be numbers/,
    );
  });

  it("rejects an unknown status", () => {
    expect(validateEntries([{ ...valid(), status: "reserved" }])).toMatch(
      /status must be available\|sold/,
    );
  });
});
