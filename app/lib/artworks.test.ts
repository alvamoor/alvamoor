import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { type ManifestEntry, getByMedium, getWindow } from "./artworks";

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
    // Fallback src is the smallest variant — src is for clients ignoring srcSet.
    expect(w.src).toMatch(/\/paper\/paper-01-384\.webp$/);
    // Responsive srcSet spans all four uploaded widths.
    expect(w.webpSrcSet).toContain("384w");
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

  // The single-work view renders three works, not the whole medium — see the
  // WorkWindow comment in artworks.ts for why that limit exists.
  describe("getWindow", () => {
    const three = ["a", "b", "c"].map((base) => ({ ...entry, base }));

    it("returns the work and both neighbours", async () => {
      stubFetch(() => ({ ok: true, json: async () => three }));

      const found = await getWindow("paper", "b");
      expect(found.status).toBe("ok");
      assert(found.status === "ok");
      expect(found.window.prev?.base).toBe("a");
      expect(found.window.current.base).toBe("b");
      expect(found.window.next?.base).toBe("c");
    });

    // The bulk-reorder case, which is what positional URLs got wrong: after a
    // re-sort, the same base must still open the same work, and must pick up the
    // neighbours it has *now* rather than the ones it had when the page was built.
    it("follows a reorder: same work, new neighbours", async () => {
      const reordered = ["c", "b", "a"].map((base) => ({ ...entry, base }));

      stubFetch(() => ({ ok: true, json: async () => three }));
      const before = await getWindow("paper", "a");
      assert(before.status === "ok");
      expect(before.window.current.base).toBe("a");
      expect(before.window.prev).toBeNull();
      expect(before.window.next?.base).toBe("b");

      stubFetch(() => ({ ok: true, json: async () => reordered }));
      const after = await getWindow("paper", "a");
      assert(after.status === "ok");
      // The identity does not move with the order — that is the whole point of
      // addressing a work by name.
      expect(after.window.current.base).toBe("a");
      // The adjacency does.
      expect(after.window.prev?.base).toBe("b");
      expect(after.window.next).toBeNull();
    });

    // The arrows and the swipe handler are driven by these being null, so the ends
    // of a medium have to report as ends rather than wrap or repeat.
    it("has no prev at the start and no next at the end", async () => {
      stubFetch(() => ({ ok: true, json: async () => three }));

      const first = await getWindow("paper", "a");
      const last = await getWindow("paper", "c");
      assert(first.status === "ok" && last.status === "ok");
      expect(first.window.prev).toBeNull();
      expect(last.window.next).toBeNull();
    });

    it("is a window of one when the medium holds a single work", async () => {
      stubFetch(() => ({ ok: true, json: async () => [entry] }));

      const found = await getWindow("paper", entry.base);
      assert(found.status === "ok");
      expect(found.window.current.base).toBe(entry.base);
      expect(found.window.prev).toBeNull();
      expect(found.window.next).toBeNull();
    });

    // What a link to a deleted work hits. The route turns this into the grid.
    it("returns null for a base the manifest does not name", async () => {
      stubFetch(() => ({ ok: true, json: async () => three }));
      expect((await getWindow("paper", "gone")).status).toBe("missing");
    });

    // A leftover positional URL is just another name the manifest does not have:
    // it must not resolve to the work currently sitting at that index.
    it("returns null for a digits-only segment", async () => {
      stubFetch(() => ({ ok: true, json: async () => three }));
      expect((await getWindow("paper", "1")).status).toBe("missing");
    });

    // The reason this returns three cases instead of two. An unreadable manifest
    // must NOT read as "missing": the route caches a redirect for that, so one
    // failed fetch would be stored as "this work is gone".
    describe("when the manifest cannot be read", () => {
      beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
      });
      afterEach(() => vi.restoreAllMocks());

      it("reports unavailable, not missing, on a non-ok response", async () => {
        stubFetch(() => ({ ok: false, json: async () => [] }));
        expect((await getWindow("paper", "a")).status).toBe("unavailable");
      });

      it("reports unavailable when the body is not an array", async () => {
        stubFetch(() => ({ ok: true, json: async () => ({}) }));
        expect((await getWindow("paper", "a")).status).toBe("unavailable");
      });

      it("reports unavailable when fetch itself throws", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(() => Promise.reject(new Error("boom"))),
        );
        expect((await getWindow("paper", "a")).status).toBe("unavailable");
      });

      // A medium that really is empty is a different thing again: the manifest read
      // fine, so a name that is not in it is genuinely missing.
      it("still reports missing when an empty manifest reads fine", async () => {
        stubFetch(() => ({ ok: true, json: async () => [] }));
        expect((await getWindow("paper", "a")).status).toBe("missing");
      });
    });
  });
});
