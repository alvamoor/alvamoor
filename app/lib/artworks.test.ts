import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ManifestEntry, getByMedium } from "./artworks";

describe("getByMedium", () => {
  afterEach(() => vi.unstubAllGlobals());

  const entry: ManifestEntry = {
    base: "paper-01",
    title: { en: "Untitled", de: "Ohne Titel" },
    mediumLabel: { en: "Acrylics on paper", de: "Acryl auf Papier" },
    year: 2025,
    widthCm: 0,
    heightCm: 0,
    status: "available",
  };

  function stubFetch(impl: (url: string) => Partial<Response>) {
    const fn = vi.fn((url: string) => Promise.resolve(impl(url) as Response));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("fetches the medium's manifest and derives id/medium/image URLs", async () => {
    const fetchMock = stubFetch(() => ({
      ok: true,
      json: async () => [entry],
    }));

    const works = await getByMedium("paper");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/paper\/index\.json$/);

    expect(works).toHaveLength(1);
    const [w] = works;
    expect(w.id).toBe("paper-01");
    expect(w.medium).toBe("paper");
    // Fallback src is the 1024 variant in the medium's folder.
    expect(w.src).toMatch(/\/paper\/paper-01-1024\.webp$/);
    // Responsive srcSet spans all three uploaded widths.
    expect(w.webpSrcSet).toContain("640w");
    expect(w.webpSrcSet).toContain("1024w");
    expect(w.webpSrcSet).toContain("1200w");
    // Original manifest fields are preserved.
    expect(w.title.de).toBe("Ohne Titel");
    expect(w.status).toBe("available");
  });

  it("returns an empty list when the manifest is missing", async () => {
    stubFetch(() => ({ ok: false, json: async () => [] }));
    expect(await getByMedium("canvas")).toEqual([]);
  });

  // The manifest is hand-editable and published by three paths, so a malformed
  // entry is a realistic input. One bad work must not cost the whole page.
  describe("a malformed manifest", () => {
    // The read path warns about what it drops; keep the test output clean.
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());

    it("drops an invalid entry and keeps the valid ones", async () => {
      stubFetch(() => ({
        ok: true,
        json: async () => [
          { ...entry, base: "good-01" },
          { ...entry, base: "no-title-02", title: undefined },
          { ...entry, base: "good-03" },
        ],
      }));

      const works = await getByMedium("paper");
      expect(works.map((w) => w.id)).toEqual(["good-01", "good-03"]);
    });

    it("drops a duplicate base, which would collide as a React key", async () => {
      stubFetch(() => ({
        ok: true,
        json: async () => [
          entry,
          { ...entry, title: { en: "Copy", de: "Kopie" } },
        ],
      }));

      const works = await getByMedium("paper");
      expect(works).toHaveLength(1);
      expect(works[0].title.en).toBe("Untitled");
    });

    it("returns an empty list when the body is not an array", async () => {
      stubFetch(() => ({ ok: true, json: async () => ({ works: [] }) }));
      expect(await getByMedium("paper")).toEqual([]);
    });

    it("returns an empty list when the body is not JSON", async () => {
      stubFetch(() => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      }));
      expect(await getByMedium("paper")).toEqual([]);
    });
  });
});
