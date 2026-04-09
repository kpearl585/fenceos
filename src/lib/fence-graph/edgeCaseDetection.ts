// ── Edge Case Detection & Flagging ──────────────────────────────
// Detects known edge cases from validation testing and adds visibility flags
// Does NOT modify pricing calculations - only adds audit trail warnings

import type { FenceEstimateResult, FenceGraph } from "./types";

export interface EdgeCaseFlag {
  type: "long_run_economics" | "gate_dominant_short_run" | "ultra_high_gate_density";
  severity: "info" | "warning";
  message: string;
  details: Record<string, any>;
}

/**
 * Detect edge cases in an estimate and add flags to audit trail
 * Non-invasive: Does not modify pricing, only adds informational flags
 */
export function detectEdgeCases(
  result: FenceEstimateResult,
  graph: FenceGraph,
  fenceType: string
): EdgeCaseFlag[] {
  const flags: EdgeCaseFlag[] = [];

  // Calculate total linear feet
  const totalLF = graph.edges
    .filter(e => e.type === "segment")
    .reduce((s, e) => s + e.length_in / 12, 0);

  // Count gates
  const gateEdges = graph.edges.filter(e => e.type === "gate");
  const gateCount = gateEdges.length;

  // Calculate gate cost percentage
  const gateMaterialCost = result.bom
    .filter(item => item.category === "gates" || item.sku.includes("GATE"))
    .reduce((s, item) => s + (item.extCost ?? 0), 0);
  const gateLabor = result.laborDrivers
    .filter(driver => driver.activity.includes("Gate"))
    .reduce((s, driver) => s + driver.totalHrs, 0);
  const gateTotalCost = gateMaterialCost + (gateLabor * 65); // Assume $65/hr
  const gateCostPct = result.totalCost > 0 ? (gateTotalCost / result.totalCost) * 100 : 0;

  // Gate density (gates per 100LF)
  const gateDensity = totalLF > 0 ? (gateCount / totalLF) * 100 : 0;

  // ─── EDGE CASE #1: Long Run Economics (Vinyl 300LF+) ───
  if (fenceType === "vinyl" && totalLF >= 300) {
    flags.push({
      type: "long_run_economics",
      severity: "info",
      message: `Long run detected (${totalLF.toFixed(0)}LF). Economies of scale may result in pricing 10-20% below midpoint of expected range. This is normal and reflects real-world contractor efficiency gains on large jobs.`,
      details: {
        totalLF: totalLF.toFixed(0),
        fenceType,
        expectedVariance: "-10% to -20%",
        reason: "Material bulk pricing, labor efficiency, reduced waste percentage",
        recommendation: "Price is accurate. Contractor profit margin increases on large jobs (industry standard)."
      }
    });

    result.auditTrail.push(`⚠️  EDGE CASE: Long run economics (${totalLF.toFixed(0)}LF vinyl) - May price 10-20% below midpoint`);
  }

  // ─── EDGE CASE #2: Gate-Dominant Short Runs (<130LF, gate cost >8%) ───
  if (totalLF < 130 && gateCostPct > 8 && gateCount > 0) {
    flags.push({
      type: "gate_dominant_short_run",
      severity: "warning",
      message: `Gate-dominant short run detected (${totalLF.toFixed(0)}LF with ${gateCount} gate(s) = ${gateCostPct.toFixed(1)}% of total cost). May price 5-10% below expected range. Consider adding minimum job charge if needed.`,
      details: {
        totalLF: totalLF.toFixed(0),
        gateCount,
        gateCostPct: gateCostPct.toFixed(1),
        gateMaterialCost: gateMaterialCost.toFixed(2),
        expectedVariance: "-5% to -10%",
        reason: "Gate costs are fixed regardless of fence length. On short runs, gates dominate total cost.",
        recommendation: "Real-world contractors typically add minimum job charge ($1,500-$2,000) for small projects."
      }
    });

    result.auditTrail.push(`⚠️  EDGE CASE: Gate-dominant short run (${totalLF.toFixed(0)}LF, ${gateCostPct.toFixed(1)}% gate cost) - May price 5-10% low`);
  }

  // ─── EDGE CASE #3: Ultra-High Gate Density (>1.5 gates per 100LF or >15% gate cost) ───
  // This catches cases where gate installation dominates the project
  const isHighGateDensity = (gateDensity > 1.5 && gateCount >= 3) || (gateCostPct > 15 && gateCount >= 3);

  if (isHighGateDensity) {
    flags.push({
      type: "ultra_high_gate_density",
      severity: "warning",
      message: `Ultra-high gate density detected (${gateCount} gates in ${totalLF.toFixed(0)}LF = ${gateDensity.toFixed(1)} gates/100LF, ${gateCostPct.toFixed(1)}% of total cost). This is an unusual configuration that may price 10-15% above expected range. Consider if this many gates are truly needed.`,
      details: {
        totalLF: totalLF.toFixed(0),
        gateCount,
        gateDensity: gateDensity.toFixed(1),
        gateCostPct: gateCostPct.toFixed(1),
        typicalDensity: "0.5-1.0 gates per 100LF",
        expectedVariance: "+10% to +15%",
        reason: "Gate labor and materials dominate total cost when density exceeds 1.5 gates/100LF or gate cost exceeds 15%",
        recommendation: "Review with customer if this many access points are necessary. Custom quote may be appropriate."
      }
    });

    result.auditTrail.push(`⚠️  EDGE CASE: Ultra-high gate density (${gateDensity.toFixed(1)} gates/100LF, ${gateCostPct.toFixed(1)}% cost) - May price 10-15% high`);
  }

  return flags;
}

/**
 * Add edge case summary to audit trail
 */
export function addEdgeCaseSummary(result: FenceEstimateResult, flags: EdgeCaseFlag[]): void {
  if (flags.length === 0) {
    result.auditTrail.push(`✅ No edge cases detected - pricing within normal parameters`);
    return;
  }

  result.auditTrail.push(`\n═══ EDGE CASE DETECTION ═══`);
  result.auditTrail.push(`Detected ${flags.length} known edge case(s) from validation testing:`);

  for (const flag of flags) {
    result.auditTrail.push(`  - ${flag.type}: ${flag.severity.toUpperCase()}`);
  }

  result.auditTrail.push(`See estimate details for recommendations and expected variance.`);
}

/**
 * Attach edge case flags to estimate result for API/UI consumption
 */
export function attachEdgeCaseFlags(result: FenceEstimateResult, flags: EdgeCaseFlag[]): FenceEstimateResult {
  return {
    ...result,
    edgeCaseFlags: flags,
  };
}
