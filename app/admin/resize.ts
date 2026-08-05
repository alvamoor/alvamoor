// Browser-side image resizing for the admin uploader. Produces one webp variant
// per width in WIDTHS — the exact set the gallery's srcSet asks for — so the
// existing static-variant architecture is unchanged and no server CPU is needed.
//
// Encoding takes the native canvas path where the browser really supports it,
// and falls back to a lazily-loaded libwebp WASM build otherwise. The fallback
// exists because `canvas.toBlob` silently substitutes image/png for unsupported
// types (HTML spec) instead of failing: Safari did exactly that here, and five
// works reached R2 as ~3 MB PNGs under .webp keys before it was noticed.
import { WIDTHS } from "@/app/lib/artworks";

const TYPE = "image/webp";
const NATIVE_QUALITY = 0.82; // canvas.toBlob scale: 0–1
const WASM_QUALITY = 82; // libwebp scale: 0–100

/**
 * Target pixel width for each variant slot, keyed by the slot (R2 key) width.
 *
 * Slots wider than the source are clamped to the source width rather than
 * skipped: the gallery names every width in WIDTHS in its `srcSet`, so a
 * missing `<base>-1200.webp` is a 404, not graceful degradation. A small source
 * therefore repeats at its native width under the larger keys — never upscaled.
 */
export function planWidths(naturalWidth: number): Map<number, number> {
  return new Map(WIDTHS.map((w) => [w, Math.min(w, naturalWidth)]));
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, NATIVE_QUALITY));
}

/** True if this browser genuinely encodes `type` from a canvas. */
export async function canEncode(type: string): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return (await toBlob(canvas, type))?.type === type;
}

let nativeWebp: Promise<boolean> | undefined;
function supportsNativeWebp(): Promise<boolean> {
  nativeWebp ??= canEncode(TYPE);
  return nativeWebp;
}

/** fetched only when actually needed. */
async function encodeViaWasm(data: ImageData): Promise<Blob> {
  let encode: (
    data: ImageData,
    options?: { quality?: number },
  ) => Promise<ArrayBuffer>;
  try {
    encode = (await import("@jsquash/webp/encode")).default;
  } catch (cause) {
    throw new Error(
      "This browser cannot create WebP images natively, and the WebP encoder failed to load. Check your connection and reload, or use Chrome, Edge or Firefox.",
      { cause },
    );
  }
  return new Blob([await encode(data, { quality: WASM_QUALITY })], {
    type: TYPE,
  });
}

async function encodeWebp(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<Blob> {
  if (await supportsNativeWebp()) {
    const blob = await toBlob(canvas, TYPE);
    if (blob?.type === TYPE) return blob;
  }

  return encodeViaWasm(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch (cause) {
    // HEIC/HEIF is the common case: Chrome, Edge and Firefox cannot decode it.
    const heic =
      /\.hei[cf]$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type);
    throw new Error(
      heic
        ? `“${file.name}” is a HEIC/HEIF photo, which this browser cannot read. Export it as JPEG first (Photos → File → Export), then upload that.`
        : `Could not read “${file.name || "the selected file"}” — it may be damaged or not an image format this browser supports.`,
      { cause },
    );
  }
}

/** Resize a picked file into { slot width → webp Blob }, capped at 1200, no upscale. */
export async function resizeToWebp(file: File): Promise<Map<number, Blob>> {
  const bitmap = await decode(file);
  try {
    const out = new Map<number, Blob>();
    for (const [slot, target] of planWidths(bitmap.width)) {
      const height = Math.round((bitmap.height * target) / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = target;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get a 2d canvas context.");
      ctx.drawImage(bitmap, 0, 0, target, height);
      out.set(slot, await encodeWebp(canvas, ctx));
    }
    return out;
  } finally {
    bitmap.close();
  }
}
