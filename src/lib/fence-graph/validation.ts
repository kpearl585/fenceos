// ── BOM Validation Layer ─────────────────────────────────────────
// Prevents broken estimates from reaching users
// Validates BOM completeness, pricing, and data integrity

import type { BomItem, FenceEstimateResult } from "./types";

export interface ValidationError {
  field: string;
  issue: string;
  severity: "critical" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validates a complete fence estimate before returning to user
 * CRITICAL errors block the estimate from being returned
 * WARNINGS are logged but don't block
 */
export function validateEstimate(result: FenceEstimateResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // ── CRITICAL: Total cost must be a positive number ──
  if (isNaN(result.totalCost) || !isFinite(result.totalCost)) {
    errors.push({
      field: "totalCost",
      issue: `Total cost is ${result.totalCost} (must be a positive number)`,
      severity: "critical",
    });
  } else if (result.totalCost <= 0) {
    errors.push({
      field: "totalCost",
      issue: `Total cost is $${result.totalCost} (must be greater than $0)`,
      severity: "critical",
    });
  }

  // ── CRITICAL: Material cost must be valid ──
  if (isNaN(result.totalMaterialCost) || !isFinite(result.totalMaterialCost)) {
    errors.push({
      field: "totalMaterialCost",
      issue: `Material cost is ${result.totalMaterialCost} (must be a positive number)`,
      severity: "critical",
    });
  } else if (result.totalMaterialCost < 0) {
    errors.push({
      field: "totalMaterialCost",
      issue: `Material cost is negative: $${result.totalMaterialCost}`,
      severity: "critical",
    });
  }

  // ── CRITICAL: Labor cost must be valid ──
  if (isNaN(result.totalLaborCost) || !isFinite(result.totalLaborCost)) {
    errors.push({
      field: "totalLaborCost",
      issue: `Labor cost is ${result.totalLaborCost} (must be a positive number)`,
      severity: "critical",
    });
  } else if (result.totalLaborCost < 0) {
    errors.push({
      field: "totalLaborCost",
      issue: `Labor cost is negative: $${result.totalLaborCost}`,
      severity: "critical",
    });
  }

  // ── CRITICAL: Labor hours must be valid ──
  if (isNaN(result.totalLaborHrs) || !isFinite(result.totalLaborHrs)) {
    errors.push({
      field: "totalLaborHrs",
      issue: `Labor hours is ${result.totalLaborHrs} (must be a positive number)`,
      severity: "critical",
    });
  } else if (result.totalLaborHrs < 0) {
    errors.push({
      field: "totalLaborHrs",
      issue: `Labor hours is negative: ${result.totalLaborHrs}`,
      severity: "critical",
    });
  }

  // ── CRITICAL: BOM must exist and have items ──
  if (!result.bom || result.bom.length === 0) {
    errors.push({
      field: "bom",
      issue: "BOM is empty (no items generated)",
      severity: "critical",
    });
  } else {
    // ── CRITICAL: All BOM items must have valid prices ──
    // `unitCost != null` lets a legitimate $0 unit cost pass validation;
    // the only failure case is missing price or NaN/Infinity.
    const itemsWithoutPrices = result.bom.filter(
      item => item.unitCost == null || isNaN(item.unitCost) || !isFinite(item.unitCost)
    );
    if (itemsWithoutPrices.length > 0) {
      errors.push({
        field: "bom",
        issue: `${itemsWithoutPrices.length} items missing prices: ${itemsWithoutPrices.map(i => i.sku).join(", ")}`,
        severity: "critical",
      });
    }

    // ── CRITICAL: All BOM items must have valid quantities ──
    const itemsWithBadQty = result.bom.filter(
      item => !item.qty || isNaN(item.qty) || !isFinite(item.qty) || item.qty <= 0
    );
    if (itemsWithBadQty.length > 0) {
      errors.push({
        field: "bom",
        issue: `${itemsWithBadQty.length} items have invalid quantities: ${itemsWithBadQty.map(i => `${i.sku}(${i.qty})`).join(", ")}`,
        severity: "critical",
      });
    }

    // ── CRITICAL: All BOM items must have valid extended costs ──
    // `extCost != null` preserves $0 extended cost (qty × $0 unitCost) as valid.
    const itemsWithBadExtCost = result.bom.filter(
      item => item.extCost == null || isNaN(item.extCost) || !isFinite(item.extCost)
    );
    if (itemsWithBadExtCost.length > 0) {
      errors.push({
        field: "bom",
        issue: `${itemsWithBadExtCost.length} items have invalid extended costs: ${itemsWithBadExtCost.map(i => `${i.sku}($${i.extCost})`).join(", ")}`,
        severity: "critical",
      });
    }

    // ── WARNING: Check for critical components ──
    const hasPosts = result.bom.some(item =>
      item.sku.toLowerCase().includes("post") && !item.sku.toLowerCase().includes("cap")
    );
    const hasPanelsOrFabric = result.bom.some(item =>
      item.sku.toLowerCase().includes("panel") ||
      item.sku.toLowerCase().includes("fabric") ||
      item.sku.toLowerCase().includes("picket")
    );
    const hasConcrete = result.bom.some(item => item.sku.toLowerCase().includes("concrete"));

    if (!hasPosts) {
      warnings.push({
        field: "bom",
        issue: "No posts found in BOM",
        severity: "warning",
      });
    }
    if (!hasPanelsOrFabric) {
      warnings.push({
        field: "bom",
        issue: "No panels/fabric/pickets found in BOM",
        severity: "warning",
      });
    }
    if (!hasConcrete) {
      warnings.push({
        field: "bom",
        issue: "No concrete found in BOM",
        severity: "warning",
      });
    }
  }

  // ── WARNING: Check confidence levels ──
  if (result.overallConfidence < 0.70) {
    warnings.push({
      field: "overallConfidence",
      issue: `Low confidence estimate (${Math.round(result.overallConfidence * 100)}%) - review BOM carefully`,
      severity: "warning",
    });
  }

  // ── WARNING: Check for red flag items ──
  if (result.redFlagItems.length > 3) {
    warnings.push({
      field: "redFlagItems",
      issue: `${result.redFlagItems.length} items flagged for review`,
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Throws an error if validation fails (BLOCKS bad output)
 * Use this in the BOM generation pipeline before returning to user
 */
export function assertValidEstimate(result: FenceEstimateResult): void {
  const validation = validateEstimate(result);

  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.issue}`).join("; ");
    throw new Error(`VALIDATION FAILED: ${errorMessages}`);
  }

  // Log warnings but don't block
  if (validation.warnings.length > 0) {
    console.warn("Estimate validation warnings:");
    validation.warnings.forEach(w => {
      console.warn(`  - ${w.field}: ${w.issue}`);
    });
  }
}
