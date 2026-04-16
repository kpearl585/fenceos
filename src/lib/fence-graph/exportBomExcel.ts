// ── BOM Excel Export ─────────────────────────────────────────────
// Generates two distinct Excel workbooks (client-side, no server round-trip):
//
//  1. Internal BOM  — full costs, margins, audit trail. Owner eyes only.
//  2. Supplier PO   — quantities + SKU/description only. Send to distributor.
//
// Uses SheetJS (xlsx) for workbook generation.

// Dynamic import: xlsx (SheetJS) is ~500KB and only needed when the
// contractor clicks "Download Excel". Importing at the top of every
// page load bloats the client bundle. The `import("xlsx")` inside each
// export function defers loading until the button is actually clicked.
import type { FenceEstimateResult } from "./types";

// Categories that should NOT be sent to a fence supplier — these are
// service costs the supplier can't quote (rentals, delivery, disposal,
// permits). Used by the Supplier PO export filter.
const NON_SUPPLIER_CATEGORIES = new Set([
  "equipment",
  "logistics",
  "disposal",
  "regulatory",
]);

function today() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtCurrency(n: number | undefined) {
  if (n == null || isNaN(n)) return "";
  return `$${n.toFixed(2)}`;
}

async function loadXLSX() {
  return await import("xlsx");
}

function downloadWorkbook(XLSX: typeof import("xlsx"), wb: import("xlsx").WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 1. Internal BOM Workbook ──────────────────────────────────────
// Three sheets: Summary | Bill of Materials | Labor
export async function downloadInternalBom(
  result: FenceEstimateResult,
  projectName: string,
  markupPct: number,
  totalLF: number,
  orgName?: string
) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const safeMarkup = Math.max(0, markupPct);
  const bidPrice = Math.round(result.totalCost * (1 + safeMarkup / 100));
  const grossProfit = bidPrice - result.totalCost;
  const grossMarginPct = bidPrice > 0 ? Math.round((grossProfit / bidPrice) * 100) : 0;
  const perLF = totalLF > 0 ? bidPrice / totalLF : 0;

  // Category-split so the Summary accurately breaks out materials vs
  // equipment/delivery/disposal/regulatory. `materialOnlyCost` is the
  // new engine field; fallback to totalMaterialCost for estimates that
  // pre-date that field so historical saved estimates still render.
  const materialOnly = result.materialOnlyCost ?? result.totalMaterialCost;
  const equipmentCost = result.bom.filter(b => b.category === "equipment").reduce((s, b) => s + (b.extCost ?? 0), 0);
  const logisticsCost = result.bom.filter(b => b.category === "logistics").reduce((s, b) => s + (b.extCost ?? 0), 0);
  const disposalCost = result.bom.filter(b => b.category === "disposal").reduce((s, b) => s + (b.extCost ?? 0), 0);
  const regulatoryCost = result.bom.filter(b => b.category === "regulatory").reduce((s, b) => s + (b.extCost ?? 0), 0);

  // ── Sheet 1: Summary ──────────────────────────────────────────
  const summaryRows: (string | number)[][] = [
    ["INTERNAL ESTIMATE — CONFIDENTIAL"],
    [],
    ["Project", projectName],
    ["Date", today()],
    ["Contractor", orgName ?? ""],
    [],
    ["COST SUMMARY", "", ""],
    ["Total LF", totalLF, "ft"],
    ["Materials", materialOnly, ""],
  ];
  if (equipmentCost > 0)  summaryRows.push(["Equipment Rentals", equipmentCost, ""]);
  if (logisticsCost > 0)  summaryRows.push(["Delivery / Logistics", logisticsCost, ""]);
  if (disposalCost > 0)   summaryRows.push(["Disposal / Removal", disposalCost, ""]);
  if (regulatoryCost > 0) summaryRows.push(["Permits / Regulatory", regulatoryCost, ""]);
  summaryRows.push(
    ["Labor Cost", result.totalLaborCost, ""],
    ["Total Cost", result.totalCost, ""],
    [],
    ["PRICING", "", ""],
    ["Markup", `${safeMarkup}%`, ""],
    ["Bid Price", bidPrice, ""],
    ["Gross Profit", grossProfit, ""],
    ["Gross Margin", `${grossMarginPct}%`, ""],
    ["Per Linear Foot", perLF.toFixed(2), ""],
    [],
    ["CONFIDENCE", `${Math.round((result.overallConfidence ?? 0) * 100)}%`, ""],
  );
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Sheet 2: Bill of Materials ────────────────────────────────
  // Ext. Cost uses `!= null` so legitimate $0 extCost lines (e.g. comped
  // items, no-price overrides) render as "$0.00" instead of blank.
  const bomHeader = ["SKU", "Description", "Category", "Qty", "Unit", "Unit Cost", "Ext. Cost", "Confidence", "Traceability"];
  const bomRows = result.bom.map(item => [
    item.sku,
    item.name,
    item.category,
    item.qty,
    item.unit,
    item.unitCost != null ? fmtCurrency(item.unitCost) : "",
    item.extCost != null ? fmtCurrency(item.extCost) : "",
    item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "",
    item.traceability,
  ]);
  const wsBom = XLSX.utils.aoa_to_sheet([bomHeader, ...bomRows]);
  wsBom["!cols"] = [
    { wch: 22 }, { wch: 38 }, { wch: 16 }, { wch: 8 }, { wch: 6 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 45 },
  ];
  // TOTALS row — sums the line items in THIS sheet so the contractor's
  // mental cross-check matches. Previously used result.totalMaterialCost
  // which included regional adjustment not visible on any row above, so
  // the sheet's column sum never matched the TOTALS cell.
  const lineItemSum = result.bom.reduce((s, b) => s + (b.extCost ?? 0), 0);
  const totalRow = ["", "TOTALS", "", "", "", "", fmtCurrency(lineItemSum), "", ""];
  XLSX.utils.sheet_add_aoa(wsBom, [[], totalRow], { origin: -1 });
  // Show the regional material adjustment explicitly if it's non-zero so
  // the sheet totals still reconcile against result.totalMaterialCost.
  const regionalAdj = Math.round(result.totalMaterialCost - lineItemSum);
  if (regionalAdj !== 0) {
    XLSX.utils.sheet_add_aoa(wsBom, [
      ["", "Regional material adjustment", "", "", "", "", fmtCurrency(regionalAdj), "", ""],
      ["", "MATERIALS + ADJ", "", "", "", "", fmtCurrency(result.totalMaterialCost), "", ""],
    ], { origin: -1 });
  }
  XLSX.utils.book_append_sheet(wb, wsBom, "Bill of Materials");

  // ── Sheet 3: Labor Drivers ────────────────────────────────────
  const laborHeader = ["Activity", "Count", "Rate (hrs/unit)", "Total Hours", "Labor Cost"];
  const laborRate = result.totalLaborCost / (result.totalLaborHrs || 1);
  const laborRows = result.laborDrivers
    .filter(l => l.count > 0)
    .map(l => [
      l.activity,
      l.count,
      l.rateHrs,
      l.totalHrs.toFixed(2),
      fmtCurrency(l.totalHrs * laborRate),
    ]);
  const wsLabor = XLSX.utils.aoa_to_sheet([laborHeader, ...laborRows, [], ["", "", "TOTAL", result.totalLaborHrs, fmtCurrency(result.totalLaborCost)]]);
  wsLabor["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsLabor, "Labor");

  // ── Sheet 4: Audit Trail ──────────────────────────────────────
  const auditRows = (result.auditTrail ?? []).map((line, i) => [i + 1, line]);
  const wsAudit = XLSX.utils.aoa_to_sheet([["#", "Audit Entry"], ...auditRows]);
  wsAudit["!cols"] = [{ wch: 4 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsAudit, "Audit Trail");

  const slug = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  downloadWorkbook(XLSX, wb, `${slug}-internal-bom.xlsx`);
}

// ── 2. Supplier Purchase Order Workbook ───────────────────────────
// One clean sheet. No costs. Send directly to distributor.
export async function downloadSupplierPO(
  result: FenceEstimateResult,
  projectName: string,
  totalLF: number,
  orgName?: string,
  customerAddress?: string
) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const headerRows = [
    ["MATERIAL PURCHASE ORDER"],
    [],
    ["Project", projectName],
    ["Job Address", customerAddress ?? ""],
    ["Contractor", orgName ?? ""],
    ["Date", today()],
    ["Total LF", `${totalLF} ft`],
    [],
    ["Please quote the following materials for the above project."],
    [],
  ];

  const poHeader = ["Line #", "SKU / Part #", "Description", "Qty", "Unit", "Unit Price", "Extended Price", "Notes"];

  // Filter out non-supplier categories before grouping. Equipment rentals,
  // delivery fees, disposal costs, and regulatory permits are NOT things
  // a fence supplier can fulfill — shipping them in the PO confuses the
  // supplier and erodes contractor credibility.
  const supplierItems = result.bom.filter(item => !NON_SUPPLIER_CATEGORIES.has(item.category));

  // Group by category
  const categorized: Record<string, typeof result.bom> = {};
  for (const item of supplierItems) {
    if (!categorized[item.category]) categorized[item.category] = [];
    categorized[item.category].push(item);
  }

  const allRows: unknown[][] = [...headerRows, poHeader];
  let lineNum = 1;
  for (const [cat, items] of Object.entries(categorized)) {
    allRows.push([`— ${cat.replace(/_/g, " ").toUpperCase()} —`, "", "", "", "", "", "", ""]);
    for (const item of items) {
      allRows.push([lineNum++, item.sku, item.name, item.qty, item.unit, "", "", ""]);
    }
    allRows.push([]);
  }

  allRows.push(
    [],
    ["NOTES FOR SUPPLIER"],
    ["1. All quantities include waste factor per project spec."],
    ["2. Please confirm availability and lead time before ordering."],
    ["3. Delivery address to be confirmed at time of order."],
    [],
    ["Authorized by:", ""],
    ["Signature:", ""],
    ["Date:", ""],
  );

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws["!cols"] = [
    { wch: 8 }, { wch: 24 }, { wch: 40 }, { wch: 8 },
    { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");

  const slug = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  downloadWorkbook(XLSX, wb, `${slug}-supplier-po.xlsx`);
}
