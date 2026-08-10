"use client";

import { useCallback, useEffect, useState } from "react";

import type { ManifestEntry, Medium } from "@/app/lib/artworks";

import styles from "./admin.module.css";
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

  const load = useCallback(async (m: Medium) => {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      const res = await apiFetch(`/api/admin/works?medium=${m}`);
      setEntries(await res.json());
      setDirty(false);
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

  function move(i: number, dir: -1 | 1) {
    setEntries((es) => {
      const j = i + dir;
      if (j < 0 || j >= es.length) return es;
      const copy = [...es];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
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
      <ol className={styles.list}>
        {entries.map((e, i) => (
          <li key={e.base} className={styles.card}>
            <div className={styles.row}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.thumb}
                src={`${IMAGE_BASE}/${medium}/${e.base}-640.webp`}
                alt=""
              />
              <div className={styles.rowMain}>
                <EntryFields entry={e} onChange={(p) => patch(i, p)} />
              </div>
              <div className={styles.rowControls}>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === entries.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patch(i, {
                      status: e.status === "sold" ? "available" : "sold",
                    })
                  }
                >
                  {e.status === "sold" ? "Mark available" : "Mark sold"}
                </button>
                <button
                  type="button"
                  className={styles.del}
                  onClick={() => remove(i)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
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
