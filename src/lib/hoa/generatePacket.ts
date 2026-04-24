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

// Roll up gates with their widths. Used by the sketch page to annotate
// each run with the gates that follow it. Mirrors the tolerant shape-
// handling in summarizeGateCount above.
function gatesByRun(input: FenceProjectInput): Map<string, Array<{ widthFt: number; isPoolGate?: boolean }>> {
  const out = new Map<string, Array<{ widthFt: number; isPoolGate?: boolean }>>();
  const push = (runId: string, w: number, pool?: boolean) => {
    const arr = out.get(runId) ?? [];
    arr.push({ widthFt: w, isPoolGate: pool });
    out.set(runId, arr);
  };

  const top = (input as unknown as {
    gates?: Array<{ afterRunId?: string; widthFt?: number; isPoolGate?: boolean }>
  }).gates;
  if (Array.isArray(top)) {
    for (const g of top) {
      if (typeof g?.afterRunId === "string" && typeof g?.widthFt === "number") {
        push(g.afterRunId, g.widthFt, g.isPoolGate);
      }
    }
  }
  return out;
}

// Page: Fence layout schematic. Not a geometric overhead view — we
// deliberately don't try to reconstruct the lot shape from corner
// angles because it'd be wrong on any irregular lot. Instead we render
// each run as a horizontal bar with length, gate notches, and the
// start/end post types labeled. HOAs that care about real geometry
// have the surveyor's plot plan, which the contractor attaches
// separately. This sketch is a spec summary, not a site plan.
async function drawFenceSketchPage(
  doc: PDFDocument,
  input: FenceProjectInput,
  fenceTypeLabel: string,
  helv: PDFFont,
  helvBold: PDFFont
): Promise<void> {
  const page = doc.addPage([612, 792]);
  const margin = 54;
  const pageWidth = 612;
  const contentWidth = pageWidth - margin * 2;
  const fenceGreen = rgb(0.17, 0.42, 0.31);
  const gray = rgb(0.35, 0.35, 0.35);
  const lightGray = rgb(0.75, 0.75, 0.75);
  const barFill = rgb(0.17, 0.42, 0.31);
  const barFillAlt = rgb(0.25, 0.55, 0.42);

  let y = 792 - margin;

  page.drawRectangle({ x: 0, y: 792 - 6, width: pageWidth, height: 6, color: fenceGreen });
  page.drawText("Fence Layout", {
    x: margin, y, size: 22, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 24;

  page.drawText("Reference sketch — see attached surveyor's plot plan for authoritative site geometry.", {
    x: margin, y, size: 9, font: helv, color: gray,
  });
  y -= 28;

  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 1, color: lightGray,
  });
  y -= 30;

  // Normalize runs
  const runs = Array.isArray(input.runs) ? input.runs : [];
  const runGates = gatesByRun(input);

  // Find the longest run for proportional scaling; bars take up the
  // full content width for the longest run, shorter runs get
  // proportionally narrower bars (but clamped to a minimum so very
  // short runs don't vanish).
  const maxLF = runs.reduce((m, r) => {
    const lf = typeof r?.linearFeet === "number" ? r.linearFeet : 0;
    return lf > m ? lf : m;
  }, 0);
  const maxBarWidth = contentWidth - 110;  // leave room for LF label at right
  const minBarWidth = 40;

  const barHeight = 14;
  const rowHeight = 54;

  // Labels for post types — keep single char + descriptive footer.
  const typeSymbol: Record<string, string> = {
    end:    "End",
    corner: "Corner",
    gate:   "Gate",
  };

  if (runs.length === 0) {
    page.drawText("No runs captured on this estimate.", {
      x: margin, y, size: 12, font: helv, color: gray,
    });
  } else {
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const lf = typeof run?.linearFeet === "number" ? Math.round(run.linearFeet) : 0;
      const barWidth = maxLF > 0
        ? Math.max(minBarWidth, (lf / maxLF) * maxBarWidth)
        : minBarWidth;

      // "Run N" label above bar
      page.drawText(`Run ${i + 1}`, {
        x: margin, y: y - 2, size: 9, font: helvBold, color: rgb(0.1, 0.15, 0.2),
      });

      // Post-type endpoints under label
      const startLabel = typeSymbol[run?.startType as string] ?? "—";
      const endLabel = typeSymbol[run?.endType as string] ?? "—";
      page.drawText(`${startLabel} \u00BB ${endLabel}`, {  // \u00BB = » (WinAnsi 0xBB)
        x: margin, y: y - 16, size: 8, font: helv, color: gray,
      });

      const barX = margin + 90;
      const barY = y - 10 - barHeight / 2;

      // Draw the run bar. Alternate shades so adjacent runs are
      // visually distinguishable when printed greyscale.
      page.drawRectangle({
        x: barX, y: barY, width: barWidth, height: barHeight,
        color: i % 2 === 0 ? barFill : barFillAlt,
      });

      // Gates attached to this run: render as inverted-V notches on
      // the bar. Position doesn't need to match the actual intra-run
      // placement — we only have the count + widths, not offsets.
      const gates = runGates.get(run?.id ?? "") ?? [];
      for (let g = 0; g < gates.length; g++) {
        const gateOffset = barWidth * ((g + 1) / (gates.length + 1));
        const gx = barX + gateOffset;
        const gy = barY + barHeight;
        // Notch
        page.drawRectangle({
          x: gx - 3, y: barY, width: 6, height: barHeight,
          color: rgb(1, 1, 1),
        });
        // Label above
        page.drawText(`${gates[g].widthFt}'`, {  // ASCII apostrophe — prime symbol (') isn't in WinAnsi
          x: gx - 7, y: gy + 3, size: 7, font: helvBold, color: gray,
        });
      }

      // LF label at the right
      page.drawText(`${lf} LF`, {
        x: barX + barWidth + 8, y: barY + 4, size: 10, font: helvBold,
        color: rgb(0.1, 0.15, 0.2),
      });

      y -= rowHeight;
      if (y < margin + 80) break;  // safety — 100 runs is the max but unlikely
    }
  }

  // Summary footer
  const totalLF = runs.reduce((sum, r) => {
    const lf = typeof r?.linearFeet === "number" ? r.linearFeet : 0;
    return sum + lf;
  }, 0);
  const gateCount = summarizeGateCount(input);

  y = margin + 60;
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 0.5, color: lightGray,
  });
  y -= 14;
  page.drawText("Summary", { x: margin, y, size: 9, font: helvBold, color: gray });
  y -= 14;
  page.drawText(
    `${Math.round(totalLF).toLocaleString()} LF total · ${gateCount} gate${gateCount === 1 ? "" : "s"} · ${fenceTypeLabel}`,
    { x: margin, y, size: 11, font: helv, color: rgb(0.1, 0.15, 0.2) }
  );

  // Brand footer stripe
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 4, color: fenceGreen });
  page.drawText("Generated by FenceEstimatePro", {
    x: margin, y: 12, size: 8, font: helv, color: gray,
  });
}

// Page: Adjoining Property Owner Consent. Generic blank form — four
// signature blocks that the contractor or customer fills by hand with
// actual neighbors. Corner lots have 2 neighbors, mid-block lots have
// 3, cul-de-sacs vary; contractor crosses out unused blocks rather
// than us trying to parameterize this in the UI.
async function drawAdjoiningFenceConsentPage(
  doc: PDFDocument,
  data: HoaPacketCoverData,
  helv: PDFFont,
  helvBold: PDFFont
): Promise<void> {
  const page = doc.addPage([612, 792]);
  const margin = 54;
  const pageWidth = 612;
  const contentWidth = pageWidth - margin * 2;
  const fenceGreen = rgb(0.17, 0.42, 0.31);
  const gray = rgb(0.35, 0.35, 0.35);
  const lightGray = rgb(0.6, 0.6, 0.6);

  let y = 792 - margin;

  page.drawRectangle({ x: 0, y: 792 - 6, width: pageWidth, height: 6, color: fenceGreen });

  page.drawText("Adjoining Property Owner Consent", {
    x: margin, y, size: 20, font: helvBold, color: rgb(0.1, 0.15, 0.2),
  });
  y -= 28;

  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 1, color: rgb(0.75, 0.75, 0.75),
  });
  y -= 22;

  // Intro paragraph
  const subjectCityState = [data.customerCity, data.customerState].filter(Boolean).join(", ");
  const subjectFull = [data.customerAddress, subjectCityState, data.customerZip]
    .filter(Boolean).join(", ");
  const hoaPhrase = data.hoaName
    ? `the ${data.hoaName} architectural review board`
    : "the homeowners' association";

  const intro =
    `I/we, the undersigned, am/are the owner(s) of property adjoining ${subjectFull || "the subject property"}. ` +
    `I/we have been informed of the proposed fence installation at this property and consent to its construction ` +
    `along the shared property line. This consent is provided to ${hoaPhrase} in support of the architectural ` +
    `review application submitted by ${data.org.name || "the contractor"}.`;

  y = drawWrapped(page, intro, {
    x: margin, y, maxWidth: contentWidth, lineHeight: 13,
    font: helv, size: 10,
  });
  y -= 14;

  page.drawText(
    "Contractor may cross out any signature blocks that do not apply (e.g., corner lots have only two adjoining properties).",
    { x: margin, y, size: 8, font: helv, color: gray }
  );
  y -= 24;

  // Four signature blocks — each gets: property address / print name /
  // signature / date, drawn as labelled underlines. Fixed vertical
  // spacing keeps the page tidy even when the intro wraps differently.
  const slotHeight = 110;
  const labelSize = 8;
  const lineColor = lightGray;

  for (let i = 0; i < 4; i++) {
    if (y - slotHeight < margin + 30) break;  // Safety; never overflow.

    // Slot header
    page.drawText(`Adjoining Property ${i + 1}`, {
      x: margin, y, size: 10, font: helvBold, color: rgb(0.1, 0.15, 0.2),
    });
    y -= 16;

    // Property address line
    page.drawText("Property address", { x: margin, y: y - 2, size: labelSize, font: helv, color: gray });
    page.drawLine({
      start: { x: margin + 100, y: y + 2 },
      end:   { x: pageWidth - margin, y: y + 2 },
      thickness: 0.75, color: lineColor,
    });
    y -= 22;

    // Print name + signature on same row
    const halfWidth = (contentWidth - 24) / 2;
    page.drawText("Print name", { x: margin, y: y - 2, size: labelSize, font: helv, color: gray });
    page.drawLine({
      start: { x: margin + 70, y: y + 2 },
      end:   { x: margin + halfWidth, y: y + 2 },
      thickness: 0.75, color: lineColor,
    });
    page.drawText("Signature", { x: margin + halfWidth + 24, y: y - 2, size: labelSize, font: helv, color: gray });
    page.drawLine({
      start: { x: margin + halfWidth + 84, y: y + 2 },
      end:   { x: pageWidth - margin, y: y + 2 },
      thickness: 0.75, color: lineColor,
    });
    y -= 22;

    // Date
    page.drawText("Date", { x: margin, y: y - 2, size: labelSize, font: helv, color: gray });
    page.drawLine({
      start: { x: margin + 40, y: y + 2 },
      end:   { x: margin + 200, y: y + 2 },
      thickness: 0.75, color: lineColor,
    });
    y -= 30;
  }

  // Brand footer stripe
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 4, color: fenceGreen });
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

// Build the final merged HOA packet.
//
// Page order (changed in HOA Packet v2): Cover → Cert → Sketch → Consent.
// The cert comes immediately after the cover because HOA reviewers
// typically skim for insurance proof first; anything between cover and
// cert makes them flip pages. Sketch + consent are contractor-generated
// supporting material and sit at the end.
//
// `certBytes` is the insurance cert PDF bytes, or null if the contractor
// hasn't uploaded one yet — in that case we still produce a usable
// packet with a visible warning page flagging the missing cert.
export async function buildHoaPacketPdf(
  data: HoaPacketCoverData,
  input: FenceProjectInput,
  certBytes: Uint8Array | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`HOA Packet — ${data.projectName}`);
  doc.setAuthor(data.org.name || "FenceEstimatePro");
  doc.setProducer("FenceEstimatePro");
  doc.setCreationDate(new Date());

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Cover
  await drawCoverPage(doc, data, helv, helvBold);

  // Page 2+: Insurance cert (or warning placeholder).
  // A bad/encrypted PDF here must NOT 500 the whole packet — we emit a
  // warning page instead so the contractor can see the packet generated,
  // then re-upload a clean cert.
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
    drawWrapped(warnPage, "Upload your insurance certificate in Settings > HOA Packet to include it here. HOAs typically require proof of contractor liability insurance before approving fence installations.", {
      x: 54, y: 792 - 110, maxWidth: 504, lineHeight: 14,
      font: helv, size: 11,
    });
  }

  // Page N+1: Fence layout schematic
  await drawFenceSketchPage(doc, input, data.project.fenceType, helv, helvBold);

  // Page N+2: Adjoining property consent form
  await drawAdjoiningFenceConsentPage(doc, data, helv, helvBold);

  return await doc.save();
}
