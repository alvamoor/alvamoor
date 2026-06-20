"use client";

import { useCallback, useEffect, useState } from "react";

import type { ManifestEntry, Medium } from "@/app/lib/artworks";

import styles from "./admin.module.css";
import { resizeToWebp } from "./resize";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "https://img.alvamoor.com";

const MEDIA: Medium[] = ["paper", "canvas"];

const DEFAULT_MEDIUM_LABEL: Record<Medium, { en: string; de: string }> = {
  paper: { en: "Mixed media on paper", de: "Mischtechnik auf Papier" },
  canvas: { en: "Oil on canvas", de: "Öl auf Leinwand" },
};

type Draft = Omit<ManifestEntry, "base">;

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
      const res = await fetch(`/api/admin/works?medium=${m}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      setEntries(await res.json());
      setDirty(false);
    } catch (e) {
      setMsg({ kind: "err", text: String(e) });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(medium);
    setDraft(emptyDraft(medium));
    setFile(null);
  }, [medium, load]);

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

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`upload failed (${res.status})`);

      const entry: ManifestEntry = { base, ...draft };
      // Drop an empty description so it isn't stored as blank.
      if (!entry.description?.en.trim() && !entry.description?.de.trim())
        delete entry.description;

      setEntries((es) => [...es, entry]);
      setDirty(true);
      setDraft(emptyDraft(medium));
      setFile(null);
      setMsg({ kind: "ok", text: "Image uploaded. Remember to Save." });
    } catch (e) {
      setMsg({ kind: "err", text: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      const res = await fetch("/api/admin/works", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ medium, entries }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `save failed (${res.status})`);
      }
      setDirty(false);
      setMsg({ kind: "ok", text: "Saved. Live within ~1 minute." });
    } catch (e) {
      setMsg({ kind: "err", text: String(e) });
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
              onClick={() => setMedium(m)}
              disabled={busy && dirty}
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
}: {
  label: string;
  value: { en: string; de: string };
  onChange: (v: { en: string; de: string }) => void;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.pair}>
        <input
          placeholder="EN"
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
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
      <TextPair
        label="Title"
        value={entry.title}
        onChange={(title) => onChange({ title })}
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
        <label className={styles.field}>
          <span className={styles.label}>Year</span>
          <input
            type="number"
            value={entry.year}
            onChange={(e) => onChange({ year: Number(e.target.value) })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Width cm</span>
          <input
            type="number"
            value={entry.widthCm}
            onChange={(e) => onChange({ widthCm: Number(e.target.value) })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Height cm</span>
          <input
            type="number"
            value={entry.heightCm}
            onChange={(e) => onChange({ heightCm: Number(e.target.value) })}
          />
        </label>
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
