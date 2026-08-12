"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ManifestEntry, Medium } from "@/app/lib/artworks";

import styles from "./admin.module.css";
import { moveBlock, rangeBetween, shiftBlock } from "./reorder";
import { resizeToWebp } from "./resize";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "https://img.alvamoor.com";

const MEDIA: Medium[] = ["paper", "canvas"];

const DEFAULT_MEDIUM_LABEL: Record<Medium, { en: string; de: string }> = {
  paper: { en: "Acrylics on paper", de: "Acryl auf Papier" },
  canvas: { en: "Pigments on canvas", de: "Pigmente auf Leinwand" },
};

type Draft = Omit<ManifestEntry, "base">;

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * fetch for the admin API, with failures a non-developer can act on.
 */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, redirect: "manual", cache: "no-store" });
  } catch (cause) {
    throw new Error(
      "Could not reach the server — check your connection and try again.",
      { cause },
    );
  }

  const expired =
    "Your Cloudflare Access session has expired. Reload this page to sign in again, then retry.";

  if (res.type === "opaqueredirect" || res.status === 0)
    throw new Error(expired);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    // Prefer the server's reason: a 401 can mean an expired session *or* that
    // the Worker's Access secrets are missing, which needs a very different fix.
    if (body?.error)
      throw new Error(`The server rejected the request: ${body.error}`);
    if (res.status === 401) throw new Error(expired);
    throw new Error(`Request failed (${res.status} ${res.statusText}).`);
  }
  return res;
}

function emptyDraft(medium: Medium): Draft {
  return {
    title: { en: "", de: "" },
    description: { en: "", de: "" },
    mediumLabel: { ...DEFAULT_MEDIUM_LABEL[medium] },
    year: new Date().getFullYear(),
    widthCm: 0,
    heightCm: 0,
    status: "available",
  };
}

export default function AdminApp() {
  const [medium, setMedium] = useState<Medium>("paper");
  const [entries, setEntries] = useState<ManifestEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | ""; text: string }>({
    kind: "",
    text: "",
  });

  const [draft, setDraft] = useState<Draft>(() => emptyDraft("paper"));
  const [file, setFile] = useState<File | null>(null);

  // Selection is keyed by `base`, not by index: indices move under every reorder,
  // whereas a base is stable and already unique (validateEntries rejects duplicates).
  // `anchor` is the other end of a shift-click range.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const selectedIndices = useMemo(
    () =>
      entries.reduce<number[]>((acc, e, i) => {
        if (selected.has(e.base)) acc.push(i);
        return acc;
      }, []),
    [entries, selected],
  );

  // Pointer covers mouse and touch — /admin gets reordered from a tablet as well as a
  // desk. Keyboard is the reason this is a library at all: it gives the admin its first
  // keyboard reordering, where before there was no keyboard handling anywhere in the
  // file. The 6px activation distance keeps a click on the handle from being read as a
  // one-pixel drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const load = useCallback(async (m: Medium) => {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      const res = await apiFetch(`/api/admin/works?medium=${m}`);
      setEntries(await res.json());
      setDirty(false);
      clearSelection();
    } catch (e) {
      setMsg({ kind: "err", text: msgOf(e) });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(medium);
    setDraft(emptyDraft(medium));
    setFile(null);
  }, [medium, load]);

  // "Add" uploads the image immediately but only "Save" writes the manifest, so
  // leaving with unsaved changes loses the work and orphans its images in R2.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function switchMedium(next: Medium) {
    if (next === medium) return;
    if (
      dirty &&
      !confirm("You have unsaved changes — switching discards them. Continue?")
    )
      return;
    setMedium(next);
  }

  function patch(i: number, next: Partial<ManifestEntry>) {
    setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...next } : e)));
    setDirty(true);
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchor(null);
  }

  /**
   * Apply a reorder, and only mark the form dirty if the order actually changed.
   *
   * Every reorder path goes through here — the row arrows, the toolbar, the insertion
   * strips and drag — so there is one place that decides what "changed" means. The old
   * move() set dirty unconditionally, so pressing an edge case armed the
   * unsaved-changes warning over a no-op.
   */
  function reorder(next: (es: ManifestEntry[]) => ManifestEntry[]) {
    setEntries((es) => {
      const out = next(es);
      if (out !== es) setDirty(true);
      return out;
    });
  }

  /** One row, one step. Unchanged in behaviour from the swap it replaces. */
  function move(i: number, dir: -1 | 1) {
    reorder((es) => shiftBlock(es, [i], dir));
  }

  /** The selected block, one step. */
  function shiftSelection(dir: -1 | 1) {
    reorder((es) => shiftBlock(es, selectedIndices, dir));
  }

  /** The selected block, to an insertion point. `target` counts the list as it looks now. */
  function placeSelection(target: number) {
    reorder((es) => moveBlock(es, selectedIndices, target));
  }

  /**
   * Whether placing the selection at `target` would leave the list exactly as it is.
   *
   * Only true for a contiguous selection sitting against that insertion point — a
   * scattered selection always changes something, because placing it collapses it.
   * Used to hide the two strips that would be dead controls.
   */
  function isNoopTarget(target: number) {
    if (selectedIndices.length === 0) return true;
    const first = selectedIndices[0];
    const last = selectedIndices[selectedIndices.length - 1];
    const contiguous = last - first + 1 === selectedIndices.length;
    return contiguous && (target === first || target === last + 1);
  }

  function toggleSelect(base: string, extend: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      // Shift-click takes the run between the anchor and here, which is the only way to
      // pick up twenty studies without twenty clicks.
      if (extend && anchor) {
        for (const b of rangeBetween(entries, (e) => e.base, anchor, base))
          next.add(b);
        return next;
      }
      if (next.has(base)) next.delete(base);
      else next.add(base);
      return next;
    });
    if (!extend) setAnchor(base);
  }

  function remove(i: number) {
    if (!confirm("Remove this work? Its images are deleted on Save.")) return;
    setEntries((es) => es.filter((_, j) => j !== i));
    setDirty(true);
  }

  async function addWork() {
    if (!file) return setMsg({ kind: "err", text: "Pick an image first." });
    if (!draft.title.en.trim())
      return setMsg({ kind: "err", text: "Title (EN) is required." });
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      const base = crypto.randomUUID();
      const variants = await resizeToWebp(file);

      const form = new FormData();
      form.set("medium", medium);
      form.set("base", base);
      for (const [w, blob] of variants)
        form.set(`file-${w}`, blob, `${w}.webp`);

      const res = await apiFetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const { stored } = (await res.json()) as { stored?: number };
      if (stored !== variants.size)
        throw new Error(
          `Only ${stored ?? 0} of ${variants.size} image sizes reached storage — the work was not added. Please try again.`,
        );

      const entry: ManifestEntry = { base, ...draft };
      // Drop an empty description so it isn't stored as blank.
      if (!entry.description?.en.trim() && !entry.description?.de.trim())
        delete entry.description;

      // New works go to the front — array order = display order, so this makes
      // the just-added work the first one visitors see.
      setEntries((es) => [entry, ...es]);
      setDirty(true);
      setDraft(emptyDraft(medium));
      setFile(null);
      setMsg({
        kind: "ok",
        text: 'Image uploaded — now click "Save changes" to publish it.',
      });
    } catch (e) {
      setMsg({ kind: "err", text: msgOf(e) });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Dropping a dragged row.
   *
   * Dragging a row that is part of the selection moves the whole selection, so a drag
   * and the toolbar mean the same thing. Dragging an unselected row moves just that row
   * and leaves the selection alone.
   *
   * dnd-kit reports the index the row landed on; moveBlock wants an insertion point, and
   * the two differ by one when moving downward — dropping onto index 4 from above means
   * "after the item at 4", which is insertion point 5.
   */
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = entries.findIndex((e) => e.base === active.id);
    const to = entries.findIndex((e) => e.base === over.id);
    if (from === -1 || to === -1) return;

    const block = selected.has(String(active.id)) ? selectedIndices : [from];
    const target = to > from ? to + 1 : to;
    reorder((es) => moveBlock(es, block, target));
  }

  async function save() {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      await apiFetch("/api/admin/works", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ medium, entries }),
      });
      setDirty(false);
      clearSelection();
      setMsg({ kind: "ok", text: "Saved. Live within ~1 minute." });
    } catch (e) {
      setMsg({ kind: "err", text: msgOf(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.root}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Works admin</h1>
        <div className={styles.tabs}>
          {MEDIA.map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.tab} ${m === medium ? styles.tabActive : ""}`}
              onClick={() => switchMedium(m)}
              disabled={busy}
            >
              {m}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.save}
            onClick={save}
            disabled={busy || !dirty}
          >
            {dirty ? "Save changes" : "Saved"}
          </button>
          {/* Said once, quietly, because it is easy to forget and impossible to see:
              a work's public URL is its position, so reordering repoints every link
              below the change. A previously shared /works/canvas/3 will show whatever
              is third afterwards. */}
          <p className={styles.note}>
            Reordering changes each work&rsquo;s link — /works/{medium}
            /&lt;n&gt; is a position, not a name.
          </p>
        </div>
      </header>

      {msg.text && (
        <p className={msg.kind === "err" ? styles.err : styles.ok}>
          {msg.text}
        </p>
      )}

      {/* Add work */}
      <section className={styles.card}>
        <h2 className={styles.h2}>Add work ({medium})</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <DraftFields draft={draft} onChange={setDraft} />
        <button
          type="button"
          className={styles.add}
          onClick={addWork}
          disabled={busy}
        >
          Add
        </button>
      </section>

      {/* Existing works */}
      {selected.size > 0 && (
        // Only present when there is a selection, so the list is not permanently
        // fronted by controls that would do nothing.
        <div className={styles.selectBar}>
          <span className={styles.selectCount}>{selected.size} selected</span>
          <button
            type="button"
            onClick={() => shiftSelection(-1)}
            aria-label="Move selected works up one place"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => shiftSelection(1)}
            aria-label="Move selected works down one place"
          >
            ↓
          </button>
          <button type="button" onClick={() => placeSelection(0)}>
            to top
          </button>
          <button type="button" onClick={() => placeSelection(entries.length)}>
            to bottom
          </button>
          <button type="button" onClick={clearSelection}>
            clear
          </button>
          {/* The list is 80-odd works long; say where they will land rather than
              making it a surprise. */}
          <span className={styles.selectHint}>
            or click a line between works to place them there
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        // Vertical only, and kept inside the list: this is a single column, so
        // sideways travel is nothing but a chance to drop a work somewhere unintended.
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.base)}
          strategy={verticalListSortingStrategy}
        >
          <ol className={styles.list}>
            {entries.map((e, i) => (
              <EntryRow
                key={e.base}
                entry={e}
                index={i}
                total={entries.length}
                medium={medium}
                selected={selected.has(e.base)}
                selectedCount={selected.size}
                dropTarget={selected.size > 0 && !isNoopTarget(i) ? i : null}
                onPlace={placeSelection}
                onToggleSelect={toggleSelect}
                onPatch={patch}
                onMove={move}
                onRemove={remove}
              />
            ))}
            {/* The last insertion point has no row after it to hang off, so it gets an
                item of its own. An <ol> may only contain <li>, which is also why every
                other strip lives inside the row it precedes. */}
            {selected.size > 0 && !isNoopTarget(entries.length) && (
              <li className={styles.item}>
                <DropSlot
                  count={selected.size}
                  onClick={() => placeSelection(entries.length)}
                />
              </li>
            )}
          </ol>
        </SortableContext>
      </DndContext>
    </main>
  );
}

/**
 * One insertion point: a thin line in the gap between two cards that puts the selection
 * there.
 *
 * This is the control that makes a list of 81 works workable. Dragging a study from the
 * end to position five means travelling past seventy-five rows however good the drag
 * implementation is; selecting it and clicking a line is two gestures at either end of
 * the list, with a scroll in between.
 */
function DropSlot({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className={styles.dropSlot} onClick={onClick}>
      <span className={styles.dropSlotLabel}>
        place {count} {count === 1 ? "work" : "works"} here
      </span>
    </button>
  );
}

/**
 * One work in the list, draggable by its handle.
 *
 * A component rather than inline JSX because useSortable is a hook and needs to run once
 * per row. The listeners go on the handle alone, never the whole row: the row is full of
 * text inputs, and a row-wide drag would swallow every attempt to select a title.
 */
function EntryRow({
  entry,
  index,
  total,
  medium,
  selected,
  selectedCount,
  dropTarget,
  onPlace,
  onToggleSelect,
  onPatch,
  onMove,
  onRemove,
}: {
  entry: ManifestEntry;
  index: number;
  total: number;
  medium: Medium;
  selected: boolean;
  /** How many works a click on the strip would move. */
  selectedCount: number;
  /** Insertion point to offer above this row, or null for none. */
  dropTarget: number | null;
  onPlace: (target: number) => void;
  onToggleSelect: (base: string, extend: boolean) => void;
  onPatch: (i: number, next: Partial<ManifestEntry>) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    // The handle is not the draggable element, so dnd-kit has to be told which node
    // activated the drag — without it the keyboard sensor computes its start position
    // from the wrong element.
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.base });

  return (
    <li
      ref={setNodeRef}
      className={styles.item}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {dropTarget !== null && (
        <DropSlot count={selectedCount} onClick={() => onPlace(dropTarget)} />
      )}

      <div
        className={`${styles.card} ${selected ? styles.cardSelected : ""} ${
          isDragging ? styles.cardDragging : ""
        }`}
      >
        <div className={styles.row}>
          <label className={styles.pick}>
            <input
              type="checkbox"
              checked={selected}
              // Shift extends from the last plain click, so a run of works is two
              // clicks rather than twenty. onClick rather than onChange because the
              // modifier keys are only on the mouse event.
              onClick={(ev) => onToggleSelect(entry.base, ev.shiftKey)}
              onChange={() => {}}
              aria-label={`Select ${entry.title.en || entry.base}`}
            />
          </label>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.thumb}
            src={`${IMAGE_BASE}/${medium}/${entry.base}-640.webp`}
            alt=""
          />
          <div className={styles.rowMain}>
            <EntryFields entry={entry} onChange={(p) => onPatch(index, p)} />
          </div>
          <div className={styles.rowControls}>
            <button
              type="button"
              className={styles.handle}
              ref={setActivatorNodeRef}
              aria-label={`Reorder ${entry.title.en || entry.base}`}
              {...attributes}
              {...listeners}
            >
              ⠿
            </button>
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              aria-label="Move up one place"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={index === total - 1}
              aria-label="Move down one place"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() =>
                onPatch(index, {
                  status: entry.status === "sold" ? "available" : "sold",
                })
              }
            >
              {entry.status === "sold" ? "Mark available" : "Mark sold"}
            </button>
            <button
              type="button"
              className={styles.del}
              onClick={() => onRemove(index)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function TextPair({
  label,
  value,
  onChange,
  mirror = false,
}: {
  label: string;
  value: { en: string; de: string };
  onChange: (v: { en: string; de: string }) => void;
  /** Copy EN into DE while DE has not been given a value of its own. */
  mirror?: boolean;
}) {
  // Titles are usually identical in both languages, so DE follows EN — until DE
  // is edited on its own.
  const linked = mirror && (value.de === "" || value.de === value.en);

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.pair}>
        <input
          placeholder="EN"
          value={value.en}
          onChange={(e) =>
            onChange({
              en: e.target.value,
              de: linked ? e.target.value : value.de,
            })
          }
        />
        <input
          placeholder="DE"
          value={value.de}
          onChange={(e) => onChange({ ...value, de: e.target.value })}
        />
      </span>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // The text you typed is the source of truth for what's displayed; the number
  // is derived from it. Deriving the display from the number instead breaks in
  // two ways, because Number("") is 0: echoing it back makes the field
  // impossible to clear (delete the digit and 0 reappears), while blanking 0
  // makes a typed "0" vanish as you type it. Keeping the raw text fixes both.
  const [text, setText] = useState(value === 0 ? "" : String(value));

  // Re-sync when the value changes from outside (medium switch, reload,
  // reorder), but leave the text alone while it still means the same number —
  // otherwise an in-progress "0" or "05" would be rewritten under the cursor.
  useEffect(() => {
    setText((t) =>
      Number(t || 0) === value ? t : value === 0 ? "" : String(value),
    );
  }, [value]);

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        type="number"
        min={0}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          onChange(e.target.value === "" || !Number.isFinite(n) ? 0 : n);
        }}
      />
    </label>
  );
}

function DraftFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  return (
    <Fields entry={draft} onChange={(p) => onChange({ ...draft, ...p })} />
  );
}

function EntryFields({
  entry,
  onChange,
}: {
  entry: ManifestEntry;
  onChange: (p: Partial<ManifestEntry>) => void;
}) {
  return <Fields entry={entry} onChange={onChange} />;
}

function Fields({
  entry,
  onChange,
}: {
  entry: Omit<ManifestEntry, "base"> & { base?: string };
  onChange: (p: Partial<ManifestEntry>) => void;
}) {
  return (
    <div className={styles.fields}>
      {/* Only the title mirrors. A German description is real prose, and the
          medium labels differ by language ("Pigments" / "Pigmente"). */}
      <TextPair
        label="Title"
        value={entry.title}
        onChange={(title) => onChange({ title })}
        mirror
      />
      <TextPair
        label="Description"
        value={entry.description ?? { en: "", de: "" }}
        onChange={(description) => onChange({ description })}
      />
      <TextPair
        label="Medium"
        value={entry.mediumLabel}
        onChange={(mediumLabel) => onChange({ mediumLabel })}
      />
      <div className={styles.nums}>
        <NumberField
          label="Year"
          value={entry.year}
          onChange={(year) => onChange({ year })}
        />
        <NumberField
          label="Width cm"
          value={entry.widthCm}
          onChange={(widthCm) => onChange({ widthCm })}
        />
        <NumberField
          label="Height cm"
          value={entry.heightCm}
          onChange={(heightCm) => onChange({ heightCm })}
        />
        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select
            value={entry.status}
            onChange={(e) =>
              onChange({ status: e.target.value as "available" | "sold" })
            }
          >
            <option value="available">available</option>
            <option value="sold">sold</option>
          </select>
        </label>
      </div>
    </div>
  );
}
