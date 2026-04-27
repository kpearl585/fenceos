// Client-side PDF → image rasterizer with adaptive DPI/format fallback.
//
// Uses pdfjs-dist (Mozilla's PDF.js) to render the first page of a PDF
// to an HTML canvas, then exports as a base64 image. Runs in the browser
// only — we dynamic-import pdfjs-dist to avoid bundling its ~1MB worker
// into every SSR response.
//
// The resulting base64 image is sent to a Next.js server action with a
// 20 MB body limit. To stay inside that budget even on large or
// multi-page surveys, this rasterizer tries 400 DPI first (best for
// GPT-4o handwriting reads) and falls back step-by-step to smaller
// DPIs until the payload fits.

"use client";

// Max base64 payload we'll ship over the wire. Next.js server-actions
// body limit is 20 MB (see next.config.js). Base64 encoding adds ~33%
// overhead, so we leave headroom and target ≤17 MB base64 to stay
// comfortably inside. Above this we downscale automatically before
// trying to send — a previous fixed 400 DPI produced 20+ MB PNGs on
// oversized surveys and the platform-layer 413 blew up as a client-
// side "unexpected response" error (Sentry FENCEOS-9).
// 17 MB left too little headroom once the base64 string was wrapped in a
// server-action payload. Keep a materially safer ceiling so marked surveys
// fail locally with a useful message instead of tripping a transport-layer
// "unexpected response" error in the browser.
const TARGET_MAX_BASE64_BYTES = 12_000_000;

// DPI ladder. First attempt = 400 (the A/B-eval accuracy sweet spot).
// If the result exceeds the size target, fall back one step at a time.
// 150 DPI is the floor — below that, handwriting is unreadable to
// GPT-4o and the extraction is worse than useless.
const DPI_LADDER = [400, 300, 240, 200, 150] as const;

export interface RasterizedPdf {
  /** base64-encoded image payload (no data: prefix) */
  base64: string;
  /** Final MIME type used for extraction/preview */
  mimeType: "image/png" | "image/jpeg";
  /** Final width of the rendered page */
  widthPx: number;
  /** Final height of the rendered page */
  heightPx: number;
  /** Data URL for <img src={...}> previews */
  dataUrl: string;
  /** Bytes of the rendered image (for size tracking) */
  sizeBytes: number;
  /** Pages in the original PDF — we currently only render page 1 */
  totalPages: number;
  /** The DPI that was actually used (may be lower than 400 if higher
   *  DPIs exceeded the payload budget). Surfaced so the UI can tell
   *  the contractor "rendered at 300 DPI due to size" if needed. */
  dpiUsed: number;
}

/**
 * Render the first page of a PDF to a PNG image in the browser,
 * adapting DPI downward if the result would exceed the server body
 * limit.
 *
 * @param file - PDF File from an <input type="file"> element
 * @param signal - Optional AbortSignal to cancel mid-render
 */
type SerializedCanvasAttempt = {
  dataUrl: string;
  base64: string;
  sizeBytes: number;
  mimeType: "image/png" | "image/jpeg";
  quality?: number;
};

function serializeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/jpeg",
  quality?: number,
): SerializedCanvasAttempt {
  const dataUrl =
    mimeType === "image/jpeg"
      ? canvas.toDataURL(mimeType, quality)
      : canvas.toDataURL(mimeType);
  const base64 = dataUrl.split(",")[1] ?? "";
  const sizeBytes = Math.ceil((base64.length * 3) / 4);
  return { dataUrl, base64, sizeBytes, mimeType, quality };
}

export async function rasterizePdfFirstPage(
  file: File,
  signal?: AbortSignal,
): Promise<RasterizedPdf> {
  if (typeof window === "undefined") {
    throw new Error("rasterizePdfFirstPage must run in the browser");
  }
  if (file.type !== "application/pdf") {
    throw new Error(`Expected application/pdf, got ${file.type}`);
  }

  // Dynamic import — pdfjs-dist has a ~400KB main bundle + separate worker.
  // Importing at call time keeps it out of the Next.js client bundle for
  // users who never upload a PDF.
  const pdfjs = await import("pdfjs-dist");

  // PDF.js needs its worker. The worker ships in node_modules and is
  // copied to /public/pdf.worker.min.mjs by the prebuild script so it
  // loads from our own origin — this satisfies CSP (`worker-src 'self'`)
  // without widening the policy for a CDN.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const buffer = await file.arrayBuffer();
  if (signal?.aborted) throw new Error("Cancelled");

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    if (signal?.aborted) throw new Error("Cancelled");
    const page = await doc.getPage(1);

    let lastAttempt:
      | {
          dataUrl: string;
          base64: string;
          width: number;
          height: number;
          sizeBytes: number;
          dpi: number;
          mimeType: "image/png" | "image/jpeg";
        }
      | null = null;

    for (const dpi of DPI_LADDER) {
      if (signal?.aborted) throw new Error("Cancelled");

      // PDF points → pixels. 1 point = 1/72 inch, so DPI/72 = scale factor.
      const viewport = page.getViewport({ scale: dpi / 72 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D canvas context unavailable");

      // White background — PDF.js renders transparent unless we fill first.
      // A transparent PNG would hide pen-and-highlighter marks on dark
      // viewers. Fill white so the rendering matches how the survey looks
      // when printed.
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as Parameters<typeof page.render>[0]).promise;

      if (signal?.aborted) throw new Error("Cancelled");

      // Try PNG first to preserve small text and markup lines. If the PNG is
      // too large, fall back to high-quality JPEG before dropping the DPI.
      const attempts: SerializedCanvasAttempt[] = [
        serializeCanvas(canvas, "image/png"),
        serializeCanvas(canvas, "image/jpeg", 0.92),
        serializeCanvas(canvas, "image/jpeg", 0.85),
        serializeCanvas(canvas, "image/jpeg", 0.75),
      ];

      const withinBudget =
        attempts.find((attempt) => attempt.base64.length <= TARGET_MAX_BASE64_BYTES) ??
        attempts[attempts.length - 1];

      console.log(
        `[rasterize] dpi=${dpi} format=${withinBudget.mimeType} size=${(
          withinBudget.sizeBytes / 1_000_000
        ).toFixed(1)}MB ${canvas.width}x${canvas.height}`
      );

      lastAttempt = {
        dataUrl: withinBudget.dataUrl,
        base64: withinBudget.base64,
        width: canvas.width,
        height: canvas.height,
        sizeBytes: withinBudget.sizeBytes,
        dpi,
        mimeType: withinBudget.mimeType,
      };

      if (withinBudget.base64.length <= TARGET_MAX_BASE64_BYTES) break;
      // Too big — fall to next DPI step. Canvas gets GC'd when out of scope.
    }

    if (!lastAttempt) throw new Error("Failed to render PDF at any DPI");

    if (lastAttempt.base64.length > TARGET_MAX_BASE64_BYTES) {
      // Even 150 DPI was too big. Unusual — means the PDF's first page
      // is blueprint-size or poster-size. Contractor should crop before
      // uploading. Throw a clear error the UI can surface.
      const mb = (lastAttempt.sizeBytes / 1_000_000).toFixed(1);
      throw new Error(`PDF page is too large to send (${mb}MB even at 150 DPI). Crop the PDF to a smaller region or save the first page as a separate file.`);
    }

    return {
      base64: lastAttempt.base64,
      mimeType: lastAttempt.mimeType,
      widthPx: lastAttempt.width,
      heightPx: lastAttempt.height,
      dataUrl: lastAttempt.dataUrl,
      sizeBytes: lastAttempt.sizeBytes,
      totalPages: doc.numPages,
      dpiUsed: lastAttempt.dpi,
    };
  } finally {
    // Release the PDF document resources.
    doc.destroy();
  }
}
