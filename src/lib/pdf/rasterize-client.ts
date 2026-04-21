// Client-side PDF → PNG rasterizer.
//
// Uses pdfjs-dist (Mozilla's PDF.js) to render the first page of a PDF
// to an HTML canvas at a target DPI, then exports as a base64 PNG. This
// runs in the browser only — we dynamic-import pdfjs-dist to avoid
// bundling its ~1MB worker into every SSR response.
//
// Why client-side: our AI extraction endpoint already accepts base64
// images, so once the PDF is rendered to a PNG we can reuse the whole
// server-side image flow (GPT-4o vision, rate limit, billing gate,
// audit log) without any changes.

"use client";

const TARGET_DPI = 200; // Balances handwriting legibility vs payload size.
// At 200 DPI a letter-size (8.5x11") PDF renders at 1700x2200 px which
// stays well under OpenAI's per-image size limits while keeping pen
// strokes + boundary dimensions readable.

export interface RasterizedPdf {
  /** base64-encoded PNG (no data: prefix) */
  base64: string;
  /** Final width of the rendered page */
  widthPx: number;
  /** Final height of the rendered page */
  heightPx: number;
  /** Data URL for <img src={...}> previews */
  dataUrl: string;
  /** Bytes of the rendered PNG (for size tracking) */
  sizeBytes: number;
  /** Pages in the original PDF — we currently only render page 1 */
  totalPages: number;
}

/**
 * Render the first page of a PDF to a PNG image in the browser.
 *
 * @param file - PDF File from an <input type="file"> element
 * @param signal - Optional AbortSignal to cancel mid-render
 */
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

    // PDF points → pixels. 1 point = 1/72 inch, so DPI/72 = scale factor.
    const viewport = page.getViewport({ scale: TARGET_DPI / 72 });

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

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] ?? "";
    const sizeBytes = Math.ceil((base64.length * 3) / 4);

    return {
      base64,
      widthPx: canvas.width,
      heightPx: canvas.height,
      dataUrl,
      sizeBytes,
      totalPages: doc.numPages,
    };
  } finally {
    // Release the PDF document resources.
    doc.destroy();
  }
}
