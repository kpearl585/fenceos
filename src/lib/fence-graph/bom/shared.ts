// ── Shared BOM utilities ─────────────────────────────────────────
import type { BomItem } from "../types";

export function makeBomItem(
  sku: string, name: string, category: string, unit: string,
  qty: number, confidence: number, traceability: string,
  unitCost?: number
): BomItem {
  const rounded = Math.ceil(qty);
  // Use `!= null` instead of truthy check so a legitimate $0 unitCost
  // (comp'd / sample / zero-priced line item) still produces extCost === 0
  // instead of undefined, which would fail the validation layer.
  const hasPrice = unitCost != null && Number.isFinite(unitCost);
  return {
    sku, name, category, unit,
    qty: rounded,
    unitCost,
    extCost: hasPrice ? rounded * unitCost : undefined,
    confidence,
    traceability,
  };
}

// ── Cutting-Stock Optimizer ──────────────────────────────────────
// Given required segment lengths and stock length, compute minimum
// number of stock pieces and exact cutting pattern.
// Uses First-Fit-Decreasing (FFD) — ~2% of optimal on average.

export interface CutPlan {
  stockPiecesNeeded: number;
  totalWaste_ft: number;
  pattern: { piece: number; cuts: number[] }[];
  explanation: string;
}

export function cuttingStockOptimizer(
  requiredLengths_ft: number[],
  stockLength_ft: number,
  wastePct = 0.05
): CutPlan {
  // Sort descending for FFD
  const sorted = [...requiredLengths_ft].sort((a, b) => b - a);
  const bins: number[][] = [];

  for (const len of sorted) {
    let placed = false;
    for (const bin of bins) {
      const used = bin.reduce((s, v) => s + v, 0);
      if (used + len <= stockLength_ft) {
        bin.push(len);
        placed = true;
        break;
      }
    }
    if (!placed) bins.push([len]);
  }

  const totalWaste = bins.reduce((s, bin) => {
    const used = bin.reduce((ss, v) => ss + v, 0);
    return s + (stockLength_ft - used);
  }, 0);

  const withWaste = Math.ceil(bins.length * (1 + wastePct));

  return {
    stockPiecesNeeded: withWaste,
    totalWaste_ft: Math.round(totalWaste * 10) / 10,
    pattern: bins.map((bin, i) => ({ piece: i + 1, cuts: bin })),
    explanation: `${requiredLengths_ft.length} segments → ${bins.length} stock pieces (${stockLength_ft}ft each), ${Math.round(totalWaste * 10) / 10}ft waste, +${Math.round(wastePct * 100)}% = ${withWaste} total`,
  };
}

// ── EWMA Waste Calibration ───────────────────────────────────────
// Per-contractor waste factor that learns post-closeout.
// alpha=0.2 smoothing factor; bounds [0.03, 0.15]

export interface WasteCalibration {
  currentFactor: number;   // current EWMA estimate
  alpha: number;           // smoothing (0.2 default)
  minFactor: number;       // floor
  maxFactor: number;       // ceiling
  sampleCount: number;     // how many jobs fed in
}

export const DEFAULT_WASTE_CALIBRATION: WasteCalibration = {
  currentFactor: 0.05,
  alpha: 0.2,
  minFactor: 0.03,
  maxFactor: 0.15,
  sampleCount: 0,
};

export function updateWasteCalibration(
  cal: WasteCalibration,
  actualWastePct: number
): WasteCalibration {
  // Cold-start damping: the first few samples carry less weight than the
  // configured alpha so a brand-new org's calibration can't swing from
  // 0.05 to 0.14 (+180%) on a single anomalous job. Effective alpha grows
  // from ~50% of configured on sample 0 toward full alpha as sampleCount
  // climbs. Formula: alpha * (n+1) / (n+2). At n=0 → 0.5α, n=1 → 0.67α,
  // n=5 → 0.86α, n=20 → 0.95α, n→∞ → α.
  const effectiveAlpha = cal.alpha * (cal.sampleCount + 1) / (cal.sampleCount + 2);
  const raw = cal.currentFactor * (1 - effectiveAlpha) + actualWastePct * effectiveAlpha;
  const clamped = Math.max(cal.minFactor, Math.min(cal.maxFactor, raw));
  return {
    ...cal,
    currentFactor: Math.round(clamped * 1000) / 1000,
    sampleCount: cal.sampleCount + 1,
  };
}

export function getWasteFactor(cal: WasteCalibration | null | undefined): number {
  return cal?.currentFactor ?? DEFAULT_WASTE_CALIBRATION.currentFactor;
}
