import { describe, expect, it } from "vitest";

import { copyWorkImages, planMove, validateEntries } from "./admin-r2";

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

describe("planMove", () => {
  const e = (base: string) => ({ ...valid(), base });

  it("moves the asked works in source order, not request order", () => {
    const out = planMove([e("a"), e("b"), e("c")], [], ["c", "a"]);
    expect(out.moving.map((m) => m.base)).toEqual(["a", "c"]);
    expect(out.already).toEqual([]);
    expect(out.unknown).toEqual([]);
  });

  it("does not add a work the destination already has, but still lets it leave", () => {
    const out = planMove([e("a"), e("b")], [e("a")], ["a", "b"]);
    expect(out.moving.map((m) => m.base)).toEqual(["b"]);
    expect(out.already).toEqual(["a"]);
  });

  it("reports bases the source does not have", () => {
    const out = planMove([e("a")], [], ["a", "zzz"]);
    expect(out.unknown).toEqual(["zzz"]);
  });
});

describe("copyWorkImages", () => {
  // Just enough of R2Bucket: a map of key -> bytes.
  function fakeBucket(keys: string[]) {
    const store = new Map<string, unknown>(keys.map((k) => [k, "bytes"]));
    return {
      store,
      get: async (k: string) =>
        store.has(k)
          ? { body: store.get(k), httpMetadata: {}, customMetadata: {} }
          : null,
      put: async (k: string, v: unknown) => void store.set(k, v),
      delete: async (k: string) => void store.delete(k),
    } as unknown as R2Bucket & { store: Map<string, unknown> };
  }

  const widths = [384, 640, 1024, 1200];

  it("copies every width into the destination folder and keeps the source", async () => {
    const b = fakeBucket(widths.map((w) => `paper/x-${w}.webp`));
    await copyWorkImages(b, "paper", "other", "x");
    for (const w of widths) {
      expect(b.store.has(`other/x-${w}.webp`)).toBe(true);
      expect(b.store.has(`paper/x-${w}.webp`)).toBe(true);
    }
  });

  it("leaves nothing behind when a width is missing at the source", async () => {
    const b = fakeBucket([384, 640, 1200].map((w) => `paper/x-${w}.webp`));
    await expect(copyWorkImages(b, "paper", "other", "x")).rejects.toThrow(
      /missing/,
    );
    expect([...b.store.keys()].filter((k) => k.startsWith("other/"))).toEqual(
      [],
    );
  });
});
