import { describe, expect, it } from "vitest";

import { moveBlock, rangeBetween, shiftBlock } from "./reorder";

// Letters stand in for works: short enough that an expectation reads as the resulting
// order at a glance, which is the thing being asserted.
const L = ["a", "b", "c", "d", "e"];

describe("moveBlock", () => {
  it("moves one item forward, accounting for its own removal", () => {
    // The bug this guards: target 3 counted against the original list. Once "b" is
    // lifted out, position 3 has slid left, so a naive splice lands it after "d".
    expect(moveBlock(L, [1], 3)).toEqual(["a", "c", "b", "d", "e"]);
  });

  it("moves one item backward, where no removal precedes the target", () => {
    expect(moveBlock(L, [3], 1)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("moves a block to the front and to the end", () => {
    expect(moveBlock(L, [2, 3], 0)).toEqual(["c", "d", "a", "b", "e"]);
    expect(moveBlock(L, [0, 1], L.length)).toEqual(["c", "d", "e", "a", "b"]);
  });

  it("collapses a non-contiguous selection, preserving relative order", () => {
    expect(moveBlock(L, [0, 2, 4], 2)).toEqual(["b", "a", "c", "e", "d"]);
  });

  it("keeps the selection's own order however the indices are given", () => {
    expect(moveBlock(L, [4, 0, 2], 2)).toEqual(moveBlock(L, [0, 2, 4], 2));
  });

  it("is a no-op when the target falls inside the selection", () => {
    expect(moveBlock(L, [1, 2, 3], 2)).toEqual(L);
    expect(moveBlock(L, [1, 2, 3], 3)).toEqual(L);
  });

  it("is a no-op for an empty selection, or for everything", () => {
    expect(moveBlock(L, [], 2)).toBe(L);
    expect(moveBlock(L, [0, 1, 2, 3, 4], 0)).toBe(L);
  });

  it("ignores indices that are not in the list", () => {
    expect(moveBlock(L, [1, 99, -3], 3)).toEqual(moveBlock(L, [1], 3));
  });

  it("clamps a target beyond either end instead of dropping items", () => {
    expect(moveBlock(L, [0], 99)).toEqual(["b", "c", "d", "e", "a"]);
    expect(moveBlock(L, [4], -5)).toEqual(["e", "a", "b", "c", "d"]);
  });

  it("never loses or duplicates a work", () => {
    const out = moveBlock(L, [0, 3], 2);
    expect([...out].sort()).toEqual([...L].sort());
  });
});

describe("shiftBlock", () => {
  it("matches the adjacent swap it replaces, in both directions", () => {
    // The old move(i, dir) swapped neighbours; a single-item shift must be identical,
    // or every existing up/down click changes behaviour.
    expect(shiftBlock(L, [2], -1)).toEqual(["a", "c", "b", "d", "e"]);
    expect(shiftBlock(L, [2], 1)).toEqual(["a", "b", "d", "c", "e"]);
  });

  it("steps a contiguous block over its neighbour", () => {
    expect(shiftBlock(L, [1, 2], -1)).toEqual(["b", "c", "a", "d", "e"]);
    expect(shiftBlock(L, [1, 2], 1)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("stops at the ends rather than wrapping", () => {
    expect(shiftBlock(L, [0], -1)).toBe(L);
    expect(shiftBlock(L, [0, 1], -1)).toBe(L);
    expect(shiftBlock(L, [4], 1)).toBe(L);
    expect(shiftBlock(L, [3, 4], 1)).toBe(L);
  });

  it("is a no-op for an empty selection", () => {
    expect(shiftBlock(L, [], 1)).toBe(L);
  });

  it("collapses a non-contiguous selection as it moves", () => {
    // Documenting the rule rather than pretending it is a pure shift: the block ends up
    // together, which is what every other bulk operation here does too.
    expect(shiftBlock(L, [0, 2], 1)).toEqual(["b", "d", "a", "c", "e"]);
  });
});

describe("rangeBetween", () => {
  const works = L.map((base) => ({ base }));
  const idOf = (w: { base: string }) => w.base;

  it("returns the inclusive range, in list order, whichever end is clicked first", () => {
    expect(rangeBetween(works, idOf, "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeBetween(works, idOf, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("returns the single work when both ends are the same", () => {
    expect(rangeBetween(works, idOf, "c", "c")).toEqual(["c"]);
  });

  it("returns nothing when an end is not in the list", () => {
    expect(rangeBetween(works, idOf, "b", "zz")).toEqual([]);
  });
});
