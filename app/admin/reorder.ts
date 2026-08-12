/**
 * Moving works around in the admin list.
 *
 * Pure functions in their own module because this is where the off-by-one lives: an
 * insertion point is a position *between* items, and once you pull the moving items out
 * of the array, every insertion point after them has shifted. Getting that wrong is
 * silent — the works land one place off — so it belongs somewhere with tests rather
 * than inside a component.
 *
 * One rule governs every bulk operation: take the selected works, keep their relative
 * order, and put them together at one place. A non-contiguous selection is therefore
 * collapsed into a contiguous block, which is what "move these there" means and what
 * makes drag, the insertion strips and the toolbar arrows all behave the same way.
 */

/** Ascending, deduplicated, and only indices that exist. */
function clean(indices: number[], length: number): number[] {
  return [...new Set(indices)]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < length)
    .sort((a, b) => a - b);
}

/**
 * Move the items at `indices` so they sit together at `target`.
 *
 * `target` is an *insertion index* in `0..items.length`: the position the block should
 * occupy, counted against the list as it looks now. `0` puts it at the front,
 * `items.length` appends. A target that falls inside the selection resolves to where
 * the block already is, so it is a no-op rather than an error.
 */
export function moveBlock<T>(
  items: T[],
  indices: number[],
  target: number,
): T[] {
  const picked = clean(indices, items.length);
  if (picked.length === 0 || picked.length === items.length) return items;

  const taken = new Set(picked);
  const moving = picked.map((i) => items[i]);
  const rest = items.filter((_, i) => !taken.has(i));

  // The insertion point, restated against `rest`. Every selected item that sat before
  // the target has been lifted out, so the target slides left by that many.
  const before = picked.filter((i) => i < target).length;
  const at = Math.max(0, Math.min(rest.length, target - before));

  return [...rest.slice(0, at), ...moving, ...rest.slice(at)];
}

/**
 * Move the selected block one position up (`-1`) or down (`1`).
 *
 * Expressed through moveBlock so there is one implementation to trust. Down is
 * `max + 2` rather than `max + 1` because the insertion point has to clear the item
 * the block is stepping over: `max + 1` is the gap the block already occupies.
 */
export function shiftBlock<T>(items: T[], indices: number[], dir: -1 | 1): T[] {
  const picked = clean(indices, items.length);
  if (picked.length === 0) return items;

  const first = picked[0];
  const last = picked[picked.length - 1];

  // Already against the end it is heading for.
  if (dir === -1 && first === 0) return items;
  if (dir === 1 && last === items.length - 1) return items;

  return moveBlock(items, picked, dir === -1 ? first - 1 : last + 2);
}

/**
 * The range between two works, inclusive, for shift-click selection. Order of the
 * arguments does not matter — clicking upwards selects the same set as downwards.
 */
export function rangeBetween<T>(
  items: T[],
  idOf: (item: T) => string,
  a: string,
  b: string,
): string[] {
  const i = items.findIndex((item) => idOf(item) === a);
  const j = items.findIndex((item) => idOf(item) === b);
  if (i === -1 || j === -1) return [];
  return items.slice(Math.min(i, j), Math.max(i, j) + 1).map(idOf);
}
