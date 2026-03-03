// jsPDF is browser-only — must be dynamically imported to avoid crashing in Node.js/Vercel

/**
 * Customer-facing estimate PDF generator.
 * Uses org branding + legal snapshots. Never exposes internal costs/margins.
 */

export interface PdfEstimateData {
  estimateId: string;
  title: string;
  createdAt: string;
  quotedAt: string | null;

  // Customer
  customerName: string;
  customerAddress: string | null;
  customerCity: string | null;
  customerState: string | null;
  customerPhone: string | null;
  customerEmail: string | null;

  // Project
  fenceType: string;
  linearFeet: number;
  gateCount: number;
  height: number | null;

  // Line items (customer-facing: description, qty, unit, unit_price, extended_price)
  lineItems: {
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    extendedPrice: number;
    type: string;
  }[];

  // Totals (customer-facing only)
  total: number;

  // Legal snapshots
  paymentTerms: string | null;
  legalTerms: string | null;

  // Branding
  orgName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  footerNote: string | null;

  // Acceptance (for signed contracts)
  isSigned?: boolean;
  acceptedByName?: string | null;
  acceptedAt?: string | null;
  acceptedSignatureUrl?: string | null;
  acceptanceHash?: string | null;
}

function fmt(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export async function generateEstimatePdfBuffer(data: PdfEstimateData): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pw - margin * 2;
  const [pr, pg, pb] = hexToRgb(data.primaryColor);
  const [ar, ag, ab] = hexToRgb(data.accentColor);

  let y = margin;

  // ── HEADER ──
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pw, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(data.fontFamily, "bold");
  doc.text(data.orgName, margin, 26);

  doc.setFontSize(10);
  doc.setFont(data.fontFamily, "normal");
  doc.text("ESTIMATE", pw - margin, 18, { align: "right" });
  doc.text(
    `#${data.estimateId.substring(0, 8).toUpperCase()}`,
    pw - margin,
    26,
    { align: "right" }
  );
  const dateStr = data.quotedAt
    ? new Date(data.quotedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date(data.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  doc.text(dateStr, pw - margin, 34, { align: "right" });

  y = 52;

  // ── CUSTOMER BLOCK ──
  doc.setTextColor(pr, pg, pb);
  doc.setFontSize(10);
  doc.setFont(data.fontFamily, "bold");
  doc.text("PREPARED FOR", margin, y);
  y += 6;

  doc.setTextColor(60, 60, 60);
  doc.setFont(data.fontFamily, "normal");
  doc.setFontSize(11);
  doc.text(data.customerName, margin, y);
  y += 5;
  if (data.customerAddress) {
    doc.setFontSize(9);
    doc.text(data.customerAddress, margin, y);
    y += 4;
    const cityState = [data.customerCity, data.customerState]
      .filter(Boolean)
      .join(", ");
    if (cityState) {
      doc.text(cityState, margin, y);
      y += 4;
    }
  }
  if (data.customerPhone) {
    doc.text(data.customerPhone, margin, y);
    y += 4;
  }
  if (data.customerEmail) {
    doc.text(data.customerEmail, margin, y);
    y += 4;
  }

  y += 4;

  // ── PROJECT OVERVIEW ──
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  doc.setTextColor(pr, pg, pb);
  doc.setFontSize(10);
  doc.setFont(data.fontFamily, "bold");
  doc.text("PROJECT DETAILS", margin, y);
  y += 7;

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont(data.fontFamily, "normal");
  const fenceLabel = data.fenceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const details = [
    ["Fence Type", fenceLabel],
    ["Linear Feet", `${data.linearFeet} ft`],
    ["Gates", `${data.gateCount}`],
  ];
  if (data.height) details.push(["Height", `${data.height} ft`]);
  for (const [label, value] of details) {
    doc.text(label + ":", margin, y);
    doc.setFont(data.fontFamily, "bold");
    doc.text(value, margin + 40, y);
    doc.setFont(data.fontFamily, "normal");
    y += 5;
  }

  y += 6;

  // ── LINE ITEMS TABLE ──
  doc.setFillColor(ar, ag, ab);
  doc.rect(margin, y, contentWidth, 7, "F");
  y += 5;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(data.fontFamily, "bold");
  doc.text("DESCRIPTION", margin + 2, y);
  doc.text("QTY", margin + 100, y, { align: "right" });
  doc.text("UNIT PRICE", margin + 130, y, { align: "right" });
  doc.text("TOTAL", pw - margin - 2, y, { align: "right" });
  y += 5;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont(data.fontFamily, "normal");

  let rowToggle = false;
  for (const li of data.lineItems) {
    if (y > ph - 60) {
      doc.addPage();
      y = margin;
    }
    if (rowToggle) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3.5, contentWidth, 6, "F");
    }
    rowToggle = !rowToggle;
    doc.text(li.description, margin + 2, y);
    doc.text(`${li.qty} ${li.unit}`, margin + 100, y, { align: "right" });
    doc.text(fmt(li.unitPrice), margin + 130, y, { align: "right" });
    doc.setFont(data.fontFamily, "bold");
    doc.text(fmt(li.extendedPrice), pw - margin - 2, y, { align: "right" });
    doc.setFont(data.fontFamily, "normal");
    y += 6;
  }

  // ── TOTAL ──
  y += 2;
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.5);
  doc.line(pw - margin - 60, y, pw - margin, y);
  y += 7;

  doc.setFillColor(pr, pg, pb);
  doc.rect(pw - margin - 62, y - 5, 62, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(data.fontFamily, "bold");
  doc.text("TOTAL", pw - margin - 58, y + 1);
  doc.text(fmt(data.total), pw - margin - 2, y + 1, { align: "right" });

  y += 16;

  // ── PAYMENT TERMS ──
  if (data.paymentTerms) {
    if (y > ph - 50) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(10);
    doc.setFont(data.fontFamily, "bold");
    doc.text("PAYMENT TERMS", margin, y);
    y += 6;

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont(data.fontFamily, "normal");
    const ptLines = doc.splitTextToSize(data.paymentTerms, contentWidth);
    doc.text(ptLines, margin, y);
    y += ptLines.length * 4 + 6;
  }

  // ── PAGE 2: LEGAL TERMS ──
  if (data.legalTerms) {
    doc.addPage();
    y = margin;

    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, pw, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(data.fontFamily, "normal");
    doc.text(`${data.orgName} — Terms & Conditions`, margin, 8);

    y = 22;
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(12);
    doc.setFont(data.fontFamily, "bold");
    doc.text("TERMS & CONDITIONS", margin, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont(data.fontFamily, "normal");
    const legalLines = doc.splitTextToSize(data.legalTerms, contentWidth);
    for (const line of legalLines) {
      if (y > ph - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4;
    }

    y += 10;
  }

  // ── SIGNATURE SECTION ──
  if (y > ph - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(pr, pg, pb);
  doc.setFontSize(10);
  doc.setFont(data.fontFamily, "bold");
  doc.text("ACCEPTANCE", margin, y);
  y += 8;

  if (data.isSigned && data.acceptedByName) {
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(9);
    doc.setFont(data.fontFamily, "bold");
    doc.text("ACCEPTED", margin, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFont(data.fontFamily, "normal");
    doc.text(`Signed by: ${data.acceptedByName}`, margin, y);
    y += 4;
    if (data.acceptedAt) {
      doc.text(
        `Date: ${new Date(data.acceptedAt).toLocaleString("en-US")}`,
        margin,
        y
      );
      y += 4;
    }
    if (data.acceptanceHash) {
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Hash: ${data.acceptanceHash}`, margin, y);
      y += 4;
    }
    // Signature image placeholder (would need base64 img in production)
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(data.fontFamily, "normal");
    doc.text(
      "By signing below, you agree to the terms and conditions outlined in this estimate.",
      margin,
      y
    );
    y += 10;

    // Signature line
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, y, margin + 80, y);
    doc.text("Signature", margin, y + 4);

    doc.line(margin + 90, y, pw - margin, y);
    doc.text("Date", margin + 90, y + 4);
  }

  // ── FOOTER ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont(data.fontFamily, "normal");
    doc.setTextColor(160, 160, 160);
    const footerY = ph - 8;
    if (data.footerNote) {
      doc.text(data.footerNote, pw / 2, footerY - 4, { align: "center" });
    }
    doc.text(`Page ${i} of ${pages}`, pw / 2, footerY, { align: "center" });
  }

  // Return as Buffer for server-side upload
  return Buffer.from(doc.output("arraybuffer"));
}
