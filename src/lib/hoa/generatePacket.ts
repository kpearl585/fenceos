import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { FenceProjectInput } from "@/lib/fence-graph/types";

// Input shape for the HOA packet cover page. Everything the contractor
// either already typed into the estimator (project name, fence specs)
// or types at packet-generation time (customer name/address, HOA name).
export interface HoaPacketCoverData {
  projectName: string;
  customerName: string;
  customerAddress: string;
  customerCity: string | null;
  customerState: string | null;
  customerZip: string | null;
  hoaName: string | null;
  org: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  project: {
    linearFeet: number;
    fenceHeightFt: number;
    gateCount: number;
    fenceType: string;      // human readable, e.g. "Vinyl Privacy 6'"
    generatedAt: Date;
  };
}

// Draw a text block that wraps on spaces within a max width.
// pdf-lib doesn't wrap automatically, so we do it manually.
function drawWrapped(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  opts: {
    x: number; y: number; maxWidth: number; lineHeight: number;
    font: PDFFont; size: number; color?: ReturnType<typeof rgb>;
  }
): number /* final y after drawing */ {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let y = opts.y;
  for (const word of words) {
    const tentative = line ? `${line} ${word}` : word;
    const w = opts.font.widthOfTextAtSize(tentative, opts.size);
    if (w > opts.maxWidth && line) {
      page.drawText(line, {
        x: opts.x, y, size: opts.size, font: opts.font,
        color: opts.color ?? rgb(0, 0, 0),
      });
      y -= opts.lineHeight;
      line = word;
    } else {
      line = tentative;
    }
  }
  if (line) {
    page.drawText(line, {
      x: opts.x, y, size: opts.size, font: opts.font,
      color: opts.color ?? rgb(0, 0, 0),
    });
    y -= opts.lineHeight;
  }
  return y;
}

// Roll up gates from either shape (top-level or per-run).
export function summarizeGateCount(input: FenceProjectInput): number {
  let count = 0;
  const top = (input as unknown as { gates?: unknown[] }).gates;
  if (Array.isArray(top)) count += top.length;
  const runs = (input as unknown as { runs?: Array<{ gates?: unknown[] }> }).runs;
  if (Array.isArray(runs)) {
    for (const r of runs) {
      if (Array.isArray(r?.gates)) count += r.gates.length;
    }
  }
  return count;
}

// Page 1: HOA packet cover — contractor info, customer/property, project
// summary, and a short "what's included" note so the HOA reviewer knows
// what they're looking at.
async function drawCoverPage(
  doc: PDFDocument,
  data: HoaPacketCoverData,
  helv: PDFFont,
  helvBold: PDFFont
): Promise<void> {
  const page = doc.addPage([612, 792]);  // US Letter
  const margin = 54;                      // ¾"
  const pageWidth = 612;
  const contentWidth = pageWidth - margin * 2;
  const fenceGreen = rgb(0.17, 0.42, 0.31);   // matches fence-600
  const gray = rgb(0.35, 0.35, 0.35);
  const lightGray = rgb(0.75, 0.75, 0.75);

  let y = 792 - margin;

  // ── Header band ─────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 792 - 6, width: pageWidth, height: 6,
    color: fenceGreen,
  });

  // Title
  page.drawText("HOA Submittal Packet", {
    x: margin, y, size: 24, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 28;

  page.drawText(
    `Prepared ${data.project.generatedAt.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })}`,
    { x: margin, y, size: 10, font: helv, color: gray }
  );
  y -= 28;

  // Divider
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 1, color: lightGray,
  });
  y -= 24;

  // ── Contractor block ─────────────────────────────────────────────
  page.drawText("Contractor", {
    x: margin, y, size: 9, font: helvBold, color: gray,
  });
  y -= 14;
  page.drawText(data.org.name, {
    x: margin, y, size: 14, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 16;
  if (data.org.address) {
    page.drawText(data.org.address, { x: margin, y, size: 10, font: helv });
    y -= 13;
  }
  const contactLine = [data.org.phone, data.org.email].filter(Boolean).join("  ·  ");
  if (contactLine) {
    page.drawText(contactLine, { x: margin, y, size: 10, font: helv, color: gray });
    y -= 13;
  }
  y -= 16;

  // ── Property & HOA block ────────────────────────────────────────
  page.drawText("Property & HOA", {
    x: margin, y, size: 9, font: helvBold, color: gray,
  });
  y -= 14;
  page.drawText(data.customerName, {
    x: margin, y, size: 13, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 16;
  page.drawText(data.customerAddress, { x: margin, y, size: 10, font: helv });
  y -= 13;
  const cityLine = [
    data.customerCity, data.customerState, data.customerZip,
  ].filter(Boolean).join(data.customerZip ? " " : ", ").replace(/, (\S+)$/, ", $1");
  // Compose "City, ST Zip" cleanly
  const cityState = [data.customerCity, data.customerState].filter(Boolean).join(", ");
  const fullCity = [cityState, data.customerZip].filter(Boolean).join(" ");
  if (fullCity) {
    page.drawText(fullCity, { x: margin, y, size: 10, font: helv });
    y -= 13;
  } else if (cityLine) {
    page.drawText(cityLine, { x: margin, y, size: 10, font: helv });
    y -= 13;
  }
  if (data.hoaName) {
    y -= 6;
    page.drawText("HOA", {
      x: margin, y, size: 9, font: helvBold, color: gray,
    });
    y -= 12;
    page.drawText(data.hoaName, { x: margin, y, size: 11, font: helv });
    y -= 13;
  }
  y -= 20;

  // ── Project summary block ───────────────────────────────────────
  page.drawText("Project Summary", {
    x: margin, y, size: 9, font: helvBold, color: gray,
  });
  y -= 14;
  page.drawText(data.projectName, {
    x: margin, y, size: 13, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 18;

  const specRows: Array<[string, string]> = [
    ["Fence type", data.project.fenceType],
    ["Total length", `${data.project.linearFeet.toLocaleString()} linear feet`],
    ["Fence height", `${data.project.fenceHeightFt} ft`],
    ["Gates", String(data.project.gateCount)],
  ];
  for (const [label, value] of specRows) {
    page.drawText(label, { x: margin, y, size: 10, font: helv, color: gray });
    page.drawText(value, {
      x: margin + 130, y, size: 10, font: helvBold, color: rgb(0.1, 0.15, 0.2),
    });
    y -= 15;
  }
  y -= 20;

  // ── What's included ──────────────────────────────────────────────
  page.drawText("What's in this packet", {
    x: margin, y, size: 9, font: helvBold, color: gray,
  });
  y -= 14;
  const includedLines = [
    "1. This cover page with project and contractor details.",
    "2. Contractor's certificate of liability insurance.",
  ];
  for (const line of includedLines) {
    y = drawWrapped(page, line, {
      x: margin, y, maxWidth: contentWidth, lineHeight: 14,
      font: helv, size: 10,
    });
    y -= 2;
  }
  y -= 16;

  // ── Signature / submission block ────────────────────────────────
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 0.5, color: lightGray,
  });
  y -= 28;

  y = drawWrapped(
    page,
    "Submitted for architectural review. Contractor is licensed and insured; the attached certificate of liability insurance lists current coverage limits. Contact the contractor directly with any technical questions about the project.",
    {
      x: margin, y, maxWidth: contentWidth, lineHeight: 13,
      font: helv, size: 9, color: gray,
    }
  );

  // Footer brand stripe
  page.drawRectangle({
    x: 0, y: 0, width: pageWidth, height: 4, color: fenceGreen,
  });
  page.drawText("Generated by FenceEstimatePro", {
    x: margin, y: 12, size: 8, font: helv, color: gray,
  });
}

// Fetch the insurance cert from storage and return its bytes.
// Returns null if the cert doesn't exist (caller handles that).
// Throws on actual Supabase errors so the caller can Sentry them.
export async function fetchInsuranceCertBytes(
  storagePath: string,
  downloadFn: (path: string) => Promise<{ data: Blob | null; error: Error | null }>
): Promise<Uint8Array | null> {
  const { data, error } = await downloadFn(storagePath);
  if (error) throw error;
  if (!data) return null;
  const arrayBuf = await data.arrayBuffer();
  return new Uint8Array(arrayBuf);
}

// Build the final merged HOA packet. `certBytes` is the insurance cert
// PDF bytes, or null if the contractor hasn't uploaded one yet — in
// that case we still produce a usable cover page, with a visible note
// flagging the missing cert.
export async function buildHoaPacketPdf(
  data: HoaPacketCoverData,
  certBytes: Uint8Array | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`HOA Packet — ${data.projectName}`);
  doc.setAuthor(data.org.name || "FenceEstimatePro");
  doc.setProducer("FenceEstimatePro");
  doc.setCreationDate(new Date());

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  await drawCoverPage(doc, data, helv, helvBold);

  // Try to merge the insurance cert. A bad/encrypted PDF here must NOT
  // 500 the whole packet — we emit a warning page instead so the
  // contractor can see the packet generated, then re-upload a clean cert.
  if (certBytes) {
    try {
      const certDoc = await PDFDocument.load(certBytes, {
        // ignoreEncryption lets pdf-lib open password-free-but-permission-
        // restricted PDFs (very common for insurance certs). Actually
        // encrypted PDFs still throw, which we handle below.
        ignoreEncryption: true,
      });
      const pageIndices = certDoc.getPageIndices();
      const copied = await doc.copyPages(certDoc, pageIndices);
      for (const p of copied) doc.addPage(p);
    } catch (err) {
      console.error("HOA packet: failed to merge insurance cert:", err);
      const warnPage = doc.addPage([612, 792]);
      warnPage.drawText("Insurance certificate could not be merged", {
        x: 54, y: 792 - 80, size: 16, font: helvBold, color: rgb(0.8, 0.1, 0.1),
      });
      drawWrapped(warnPage, "The uploaded insurance certificate PDF was encrypted, password-protected, or malformed and could not be included in this packet. Please re-upload a standard PDF copy of the certificate and regenerate this packet.", {
        x: 54, y: 792 - 110, maxWidth: 504, lineHeight: 14,
        font: helv, size: 11,
      });
    }
  } else {
    const warnPage = doc.addPage([612, 792]);
    warnPage.drawText("Insurance certificate not yet uploaded", {
      x: 54, y: 792 - 80, size: 16, font: helvBold, color: rgb(0.8, 0.5, 0.1),
    });
    drawWrapped(warnPage, "Upload your insurance certificate in Settings → HOA Packet to include it here. HOAs typically require proof of contractor liability insurance before approving fence installations.", {
      x: 54, y: 792 - 110, maxWidth: 504, lineHeight: 14,
      font: helv, size: 11,
    });
  }

  return await doc.save();
}
