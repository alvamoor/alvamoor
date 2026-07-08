import { afterEach, describe, expect, it, vi } from "vitest";

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
});
