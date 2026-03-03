// ── Supplier CSV → FEP SKU Fuzzy Matcher ─────────────────────────
// Maps supplier product descriptions to internal SKUs.
// Handles HD Pro, Lowe's Pro, and generic distributor formats.

export interface SupplierRow {
  rawDescription: string;
  rawSku?: string;
  unitCost: number;
  supplier?: string;
}

export interface MatchResult {
  supplierRow: SupplierRow;
  matchedSku: string | null;
  matchedName: string;
  confidence: number;   // 0–1
  reason: string;
}

// Keyword rules: if description contains these words → likely this SKU
// Ordered by specificity (most specific first)
const KEYWORD_RULES: { keywords: string[]; sku: string; name: string }[] = [
  // Vinyl panels
  { keywords: ["vinyl", "privacy", "panel", "8"], sku: "VINYL_PANEL_8FT", name: "Vinyl Privacy Panel 8ft" },
  { keywords: ["vinyl", "privacy", "panel", "6"], sku: "VINYL_PANEL_6FT", name: "Vinyl Privacy Panel 6ft" },
  // Vinyl posts
  { keywords: ["vinyl", "post", "5x5"], sku: "VINYL_POST_5X5", name: "Vinyl Post 5x5 10ft" },
  { keywords: ["vinyl", "post", "cap"], sku: "VINYL_POST_CAP", name: "Vinyl Post Cap" },
  // Vinyl rails
  { keywords: ["vinyl", "rail"], sku: "VINYL_RAIL_8FT", name: "Vinyl Rail 8ft" },
  // Wood panels
  { keywords: ["wood", "privacy", "panel", "8"], sku: "WOOD_PANEL_8FT", name: "Wood Privacy Panel 8ft" },
  { keywords: ["wood", "privacy", "panel", "6"], sku: "WOOD_PANEL_6FT", name: "Wood Privacy Panel 6ft" },
  { keywords: ["picket", "8"], sku: "WOOD_PICKET_8FT", name: "Wood Picket 8ft" },
  { keywords: ["picket", "6"], sku: "WOOD_PICKET_6FT", name: "Wood Picket 6ft" },
  // Wood posts
  { keywords: ["post", "4x4", "10"], sku: "WOOD_POST_4X4_10", name: "Wood Post 4x4 10ft" },
  { keywords: ["post", "4x4", "8"], sku: "WOOD_POST_4X4_8", name: "Wood Post 4x4 8ft" },
  { keywords: ["post", "6x6"], sku: "WOOD_POST_6X6_8", name: "Wood Post 6x6 8ft" },
  // Wood rails
  { keywords: ["2x4", "pressure", "treated", "8"], sku: "WOOD_RAIL_2X4_8", name: "PT 2x4x8 Rail" },
  { keywords: ["rail", "2x4", "8"], sku: "WOOD_RAIL_2X4_8", name: "PT 2x4x8 Rail" },
  { keywords: ["bottom", "rail"], sku: "WOOD_RAIL_BOT_8", name: "Bottom Rail 8ft" },
  // Chain link
  { keywords: ["chain", "link", "fabric", "6"], sku: "CL_FABRIC_6FT", name: "Chain Link Fabric 6ft" },
  { keywords: ["chain", "link", "fabric", "4"], sku: "CL_FABRIC_4FT", name: "Chain Link Fabric 4ft" },
  { keywords: ["chain", "link", "post", "terminal"], sku: "CL_POST_TERM", name: "CL Terminal Post" },
  { keywords: ["chain", "link", "post", "line"], sku: "CL_POST_2IN", name: "CL Line Post 2in" },
  { keywords: ["top", "rail", "chain"], sku: "CL_TOPRAIL", name: "Chain Link Top Rail" },
  { keywords: ["tension", "wire"], sku: "CL_TENSION_WIRE", name: "Tension Wire Spool" },
  { keywords: ["tie", "wire"], sku: "STAPLES_1LB", name: "Tie Wire Box" },
  // Aluminum
  { keywords: ["aluminum", "panel", "6"], sku: "ALUM_PANEL_6FT", name: "Aluminum Panel 6ft" },
  { keywords: ["aluminum", "panel", "4"], sku: "ALUM_PANEL_4FT", name: "Aluminum Panel 4ft" },
  { keywords: ["aluminum", "post", "2x2"], sku: "ALUM_POST_2X2", name: "Aluminum Post 2x2" },
  { keywords: ["aluminum", "post", "cap"], sku: "ALUM_POST_CAP", name: "Aluminum Post Cap" },
  { keywords: ["aluminum", "rail", "flat"], sku: "ALUM_RAIL_FLAT", name: "Aluminum Flat Rail" },
  // Gates
  { keywords: ["gate", "vinyl", "double"], sku: "GATE_VINYL_DBL", name: "Vinyl Double Gate" },
  { keywords: ["gate", "vinyl"], sku: "GATE_VINYL_4FT", name: "Vinyl Walk Gate" },
  { keywords: ["gate", "wood", "double"], sku: "GATE_WOOD_DBL", name: "Wood Double Gate" },
  { keywords: ["gate", "wood"], sku: "GATE_WOOD_4FT", name: "Wood Walk Gate" },
  { keywords: ["gate", "chain", "link", "double"], sku: "GATE_CL_DBL", name: "CL Double Gate" },
  { keywords: ["gate", "chain", "link"], sku: "GATE_CL_4FT", name: "CL Walk Gate" },
  { keywords: ["gate", "aluminum"], sku: "GATE_ALUM_4FT", name: "Aluminum Gate" },
  // Hardware
  { keywords: ["hinge", "heavy", "duty"], sku: "HINGE_HD", name: "Heavy Duty Hinge Pair" },
  { keywords: ["latch", "pool"], sku: "GATE_LATCH", name: "Pool-Code Latch" },
  { keywords: ["latch", "gate"], sku: "GATE_LATCH", name: "Gate Latch" },
  { keywords: ["post", "cap", "4x4"], sku: "POST_CAP_4X4", name: "Post Cap 4x4" },
  // Concrete / gravel
  { keywords: ["concrete", "80"], sku: "CONCRETE_80LB", name: "Concrete 80lb Bag" },
  { keywords: ["concrete", "60"], sku: "CONCRETE_80LB", name: "Concrete (treat as 80lb)" },
  { keywords: ["gravel", "drainage"], sku: "GRAVEL_40LB", name: "Gravel Drainage Bag" },
  // Fasteners
  { keywords: ["screw", "1lb"], sku: "SCREWS_1LB", name: "Screws 1lb Box" },
  { keywords: ["screw", "2.5"], sku: "SCREWS_2_5", name: "Screws 2.5\" Box" },
];

function normalise(s: string): string {
  return s.toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchSupplierRow(row: SupplierRow): MatchResult {
  const norm = normalise(row.rawDescription);
  const tokens = norm.split(" ");

  let bestMatch: typeof KEYWORD_RULES[0] | null = null;
  let bestHits = 0;

  for (const rule of KEYWORD_RULES) {
    const hits = rule.keywords.filter(kw => tokens.some(t => t.includes(kw))).length;
    if (hits > bestHits || (hits === bestHits && hits > 0 && bestMatch && rule.keywords.length > bestMatch.keywords.length)) {
      bestHits = hits;
      bestMatch = rule;
    }
  }

  if (!bestMatch || bestHits === 0) {
    return {
      supplierRow: row,
      matchedSku: null,
      matchedName: "Unknown — manual mapping required",
      confidence: 0,
      reason: "No keyword match found",
    };
  }

  const confidence = Math.min(0.99, bestHits / bestMatch.keywords.length);
  return {
    supplierRow: row,
    matchedSku: bestMatch.sku,
    matchedName: bestMatch.name,
    confidence,
    reason: `Matched ${bestHits}/${bestMatch.keywords.length} keywords: ${bestMatch.keywords.join(", ")}`,
  };
}

// ── CSV Column Detector ───────────────────────────────────────────
// Detects HD Pro, Lowe's Pro, or generic formats from header row

export interface ColumnMapping {
  descriptionCol: number;
  priceCol: number;
  supplierSkuCol?: number;
  format: "hd_pro" | "lowes_pro" | "generic";
}

export function detectColumns(headers: string[]): ColumnMapping | null {
  const h = headers.map(c => c.toLowerCase().trim());

  // HD Pro format: "Product Description", "Net Price", "Item Number"
  const hdDescIdx = h.findIndex(c => c.includes("description") || c.includes("product name"));
  const hdPriceIdx = h.findIndex(c => c.includes("net price") || c.includes("unit price") || c.includes("price"));
  const hdSkuIdx = h.findIndex(c => c.includes("item number") || c.includes("sku") || c.includes("model"));

  if (hdDescIdx >= 0 && hdPriceIdx >= 0) {
    const isHD = h.some(c => c.includes("net price") || c.includes("pro xtra"));
    const isLowes = h.some(c => c.includes("lowes") || c.includes("lowe's"));
    return {
      descriptionCol: hdDescIdx,
      priceCol: hdPriceIdx,
      supplierSkuCol: hdSkuIdx >= 0 ? hdSkuIdx : undefined,
      format: isHD ? "hd_pro" : isLowes ? "lowes_pro" : "generic",
    };
  }

  return null;
}

// ── Parse CSV ─────────────────────────────────────────────────────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    // Simple CSV parse — handles quoted fields
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

export function parseSupplierCsv(text: string): { rows: SupplierRow[]; format: string; unmapped: number } {
  const allRows = parseCsv(text);
  if (allRows.length < 2) return { rows: [], format: "unknown", unmapped: 0 };

  const headers = allRows[0];
  const mapping = detectColumns(headers);

  if (!mapping) {
    // Fallback: assume col 0 = description, col 1 = price
    const rows: SupplierRow[] = allRows.slice(1).map(row => ({
      rawDescription: row[0] ?? "",
      unitCost: parseFloat((row[1] ?? "0").replace(/[$,]/g, "")) || 0,
    })).filter(r => r.rawDescription && r.unitCost > 0);
    return { rows, format: "generic", unmapped: 0 };
  }

  const rows: SupplierRow[] = allRows.slice(1).map(row => ({
    rawDescription: row[mapping.descriptionCol] ?? "",
    rawSku: mapping.supplierSkuCol != null ? (row[mapping.supplierSkuCol] ?? undefined) : undefined,
    unitCost: parseFloat((row[mapping.priceCol] ?? "0").replace(/[$,]/g, "")) || 0,
    supplier: mapping.format,
  })).filter(r => r.rawDescription && r.unitCost > 0);

  return { rows, format: mapping.format, unmapped: 0 };
}
