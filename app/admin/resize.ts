// Browser-side image resizing for the admin uploader. Produces webp variants
// matching the gallery's width set (capped at 1200, never upscaled), so the
// existing static-variant architecture is unchanged and no server CPU / sharp /
// WASM is needed. Keep widths in sync with WIDTHS in app/lib/artworks.ts.

const BREAKPOINTS = [640, 1024];
const MAX_WIDTH = 1200;
const QUALITY = 0.82;

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/webp",
      QUALITY,
    );
  });
}

/** Resize a picked file into { width → webp Blob }, capped at 1200, no upscale. */
export async function resizeToWebp(file: File): Promise<Map<number, Blob>> {
  const bitmap = await createImageBitmap(file);
  const natural = bitmap.width;
  const cap = Math.min(natural, MAX_WIDTH);
  const widths = [
    ...new Set([...BREAKPOINTS.filter((w) => w < cap), cap]),
  ].sort((a, b) => a - b);

  const out = new Map<number, Blob>();
  for (const w of widths) {
    const h = Math.round((bitmap.height * w) / natural);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    out.set(w, await canvasToWebp(canvas));
  }
  bitmap.close();
  return out;
}
