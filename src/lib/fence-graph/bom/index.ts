// ── BOM Router ───────────────────────────────────────────────────
// Routes to the correct type-specific BOM generator based on fence type.

import type {
  FenceGraph,
  BomItem,
  LaborDriver,
  FenceEstimateResult,
  MaterialPriceMeta,
  EstimatePricingHealth,
  ConfidenceReviewGate,
  LaborModelHealth,
} from "../types";
import { generateVinylBom } from "./vinylBom";
import { generateWoodBom, type WoodStyle } from "./woodBom";
import { generateChainLinkBom } from "./chainLinkBom";
import { generateAluminumBom } from "./aluminumBom";
import { makeBomItem } from "./shared";
import { assertValidEstimate } from "../validation";
import { detectEdgeCases, addEdgeCaseSummary } from "../edgeCaseDetection";
import type { OrgEstimatorConfig } from "../config/types";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import {
  getAdaptiveLaborBucketForComplexity,
  getSiteComplexityLaborMultiplier,
} from "../siteComplexity";
import {
  buildQuoteMetadata,
  buildCustomerProposal,
  buildTermsAndConditions,
  groupBomIntoShoppingList,
} from "../quotePackage";

export type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";

const NON_MATERIAL_CATEGORIES = new Set(["equipment", "logistics", "disposal", "regulatory"]);
const STALE_PRICE_THRESHOLD_DAYS = 30;

function roundPct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function isFreshPrice(
  updatedAt: string | null | undefined,
  staleThresholdDays: number
): boolean {
  if (!updatedAt) return false;
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= staleThresholdDays * 24 * 60 * 60 * 1000;
}

function buildPricingHealth(
  bom: BomItem[],
  priceMeta: Record<string, MaterialPriceMeta>,
  staleThresholdDays: number
): EstimatePricingHealth {
  const materialItems = bom.filter((item) => !NON_MATERIAL_CATEGORIES.has(item.category));
  const pricedMaterialSpend = materialItems.reduce((sum, item) => sum + (item.extCost ?? 0), 0);

  let missingPriceItemCount = 0;
  let fallbackPriceItemCount = 0;
  let freshPriceItemCount = 0;
  let stalePriceItemCount = 0;
  let orgPricedSpend = 0;
  let freshPricedSpend = 0;
  let stalePricedSpend = 0;

  for (const item of materialItems) {
    const hasPrice = item.unitCost != null && Number.isFinite(item.unitCost);
    if (!hasPrice) {
      missingPriceItemCount += 1;
      continue;
    }

    const meta = priceMeta[item.sku];
    if (!meta) {
      fallbackPriceItemCount += 1;
      continue;
    }

    orgPricedSpend += item.extCost ?? 0;
    if (isFreshPrice(meta.updatedAt, staleThresholdDays)) {
      freshPriceItemCount += 1;
      freshPricedSpend += item.extCost ?? 0;
    } else {
      stalePriceItemCount += 1;
      stalePricedSpend += item.extCost ?? 0;
    }
  }

  const pricedItemCount = materialItems.length - missingPriceItemCount;
  const spendDenominator = pricedMaterialSpend > 0 ? pricedMaterialSpend : 1;

  return {
    staleThresholdDays,
    trueMaterialItemCount: materialItems.length,
    missingPriceItemCount,
    fallbackPriceItemCount,
    freshPriceItemCount,
    stalePriceItemCount,
    pricedCoveragePct: roundPct(pricedItemCount / Math.max(materialItems.length, 1)),
    orgCoveragePct: roundPct(orgPricedSpend / spendDenominator),
    freshCoveragePct: roundPct(freshPricedSpend / spendDenominator),
    staleCoveragePct: roundPct(stalePricedSpend / spendDenominator),
  };
}

function buildPricingReviewGates(
  pricingHealth: EstimatePricingHealth
): ConfidenceReviewGate[] {
  const gates: ConfidenceReviewGate[] = [];

  if (pricingHealth.missingPriceItemCount > 0) {
    gates.push({
      id: "pricing-missing-prices",
      fieldId: "est-pricing-health",
      severity: "blocker",
      message: `${pricingHealth.missingPriceItemCount} material line item${pricingHealth.missingPriceItemCount === 1 ? "" : "s"} still have no unit price.`,
    });
  }

  if (
    pricingHealth.trueMaterialItemCount > 0 &&
    pricingHealth.freshCoveragePct < 0.8
  ) {
    gates.push({
      id: "pricing-fresh-coverage",
      fieldId: "est-pricing-health",
      severity: "blocker",
      message: `Fresh supplier pricing covers only ${Math.round(pricingHealth.freshCoveragePct * 100)}% of material spend. Sync prices before sending this quote.`,
    });
  } else if (
    pricingHealth.trueMaterialItemCount > 0 &&
    pricingHealth.freshCoveragePct < 0.95
  ) {
    gates.push({
      id: "pricing-fresh-coverage-review",
      fieldId: "est-pricing-health",
      severity: "review",
      message: `Fresh supplier pricing covers ${Math.round(pricingHealth.freshCoveragePct * 100)}% of material spend. Accuracy improves once more supplier costs are current.`,
    });
  }

  if (pricingHealth.staleCoveragePct >= 0.2) {
    gates.push({
      id: "pricing-stale-cost-share",
      fieldId: "est-pricing-health",
      severity: "blocker",
      message: `Stale supplier pricing still drives ${Math.round(pricingHealth.staleCoveragePct * 100)}% of material spend. Refresh the materials catalog before quoting.`,
    });
  } else if (pricingHealth.stalePriceItemCount > 0) {
    gates.push({
      id: "pricing-stale-review",
      fieldId: "est-pricing-health",
      severity: "review",
      message: `${pricingHealth.stalePriceItemCount} material line item${pricingHealth.stalePriceItemCount === 1 ? "" : "s"} are older than ${pricingHealth.staleThresholdDays} days.`,
    });
  }

  if (pricingHealth.fallbackPriceItemCount > 0) {
    gates.push({
      id: "pricing-fallback-defaults",
      fieldId: "est-pricing-health",
      severity: "review",
      message: `${pricingHealth.fallbackPriceItemCount} material line item${pricingHealth.fallbackPriceItemCount === 1 ? "" : "s"} are still using default fallback pricing instead of your supplier costs.`,
    });
  }

  return gates;
}

function buildLaborModelHealth(args: {
  siteComplexityScore: number | null;
  adaptiveBand: string | null;
  adaptiveSampleCount: number;
  learnedMultiplier: number;
}): LaborModelHealth {
  const { siteComplexityScore, adaptiveBand, adaptiveSampleCount, learnedMultiplier } = args;
  const notes: string[] = [];

  let calibrationConfidence: LaborModelHealth["calibrationConfidence"] = "high";
  if (adaptiveSampleCount < 2) calibrationConfidence = "low";
  else if (adaptiveSampleCount < 5) calibrationConfidence = "medium";

  if (adaptiveBand) {
    notes.push(
      adaptiveSampleCount > 0
        ? `Labor model has ${adaptiveSampleCount} learned closeout sample${adaptiveSampleCount === 1 ? "" : "s"} for the ${adaptiveBand.replace("_", " ")} site band.`
        : `Labor model has no learned closeout history yet for the ${adaptiveBand.replace("_", " ")} site band.`
    );
  }

  if ((siteComplexityScore ?? 0) >= 4 && adaptiveSampleCount < 3) {
    notes.push("Difficult sites still need more closeout history before labor becomes highly trusted.");
  }

  if (Math.abs(learnedMultiplier - 1) > 0.01 && adaptiveSampleCount > 0) {
    notes.push(`Current learned labor multiplier for this job pattern is ${Math.round(learnedMultiplier * 100)}% of baseline.`);
  }

  return {
    siteComplexityBand: adaptiveBand,
    adaptiveSampleCount,
    learnedMultiplier,
    calibrationConfidence,
    notes,
  };
}

function buildLaborReviewGates(
  laborModelHealth: LaborModelHealth,
  siteComplexityScore: number | null,
): ConfidenceReviewGate[] {
  const gates: ConfidenceReviewGate[] = [];

  if (!laborModelHealth.siteComplexityBand) {
    return gates;
  }

  if ((siteComplexityScore ?? 0) >= 4 && laborModelHealth.adaptiveSampleCount < 2) {
    gates.push({
      id: "labor-calibration-thin-difficult",
      fieldId: "est-margin-risk",
      severity: "blocker",
      message: "This is a difficult site, but the labor model has fewer than 2 closed jobs for this job pattern. Raise the markup or review labor manually before sending the quote.",
    });
    return gates;
  }

  if ((siteComplexityScore ?? 0) >= 3 && laborModelHealth.adaptiveSampleCount < 5) {
    gates.push({
      id: "labor-calibration-review",
      fieldId: "est-margin-risk",
      severity: "review",
      message: `Labor calibration for ${laborModelHealth.siteComplexityBand.replace("_", " ")} sites is still based on only ${laborModelHealth.adaptiveSampleCount} closeout sample${laborModelHealth.adaptiveSampleCount === 1 ? "" : "s"}. Keep extra margin buffer on this quote.`,
    });
  }

  return gates;
}

// Formats a signed dollar adjustment for audit-trail readability.
function fmtAdj(n: number): string {
  return n >= 0 ? `+$${n}` : `-$${Math.abs(n)}`;
}

export interface BomOptions {
  fenceType: FenceType;
  woodStyle?: WoodStyle;
  laborRatePerHr?: number;
  wastePct?: number;
  priceMap?: Record<string, number>; // sku → unit_cost from DB
  priceMeta?: Record<string, MaterialPriceMeta>; // sku → freshness metadata from DB
  estimatorConfig?: OrgEstimatorConfig;
  // Regulatory costs (passed through from FenceProjectInput)
  permitCost?: number;
  inspectionCost?: number;
  engineeringCost?: number;
  surveyCost?: number;
  // Custom terms & conditions (org-level override)
  customTerms?: string[];
}

export function generateBom(
  graph: FenceGraph,
  options: BomOptions
): FenceEstimateResult {
  const {
    fenceType,
    woodStyle = "dog_ear_privacy",
    laborRatePerHr = 65,
    wastePct = 0.05,
    priceMap = {},
    priceMeta = {},
  } = options;

  // Resolve estimator config (use provided or fall back to defaults)
  const config = options.estimatorConfig ?? mergeEstimatorConfig(null);

  let bom: BomItem[];
  let laborDrivers: LaborDriver[];
  let auditTrail: string[];

  switch (fenceType) {
    case "wood":
      ({ bom, laborDrivers, auditTrail } = generateWoodBom(graph, wastePct, woodStyle, priceMap, config));
      break;
    case "chain_link":
      ({ bom, laborDrivers, auditTrail } = generateChainLinkBom(graph, wastePct, priceMap, config));
      break;
    case "aluminum":
      ({ bom, laborDrivers, auditTrail } = generateAluminumBom(graph, wastePct, priceMap, config));
      break;
    case "vinyl":
    default:
      ({ bom, laborDrivers, auditTrail } = generateVinylBom(graph, wastePct, priceMap, config));
      break;
  }

  // ── SETUP / CLEANUP / LAYOUT OVERHEAD ──
  // Compute job days from base install labor (before efficiency adjustment)
  const baseInstallHrs = laborDrivers.reduce((s, l) => s + l.totalHrs, 0);
  const jobDays = Math.max(1, Math.ceil(baseInstallHrs / config.production.hoursPerDay));

  if (config.overhead.fixed.setupHrs > 0) {
    laborDrivers.push({
      activity: "Job Setup",
      count: 1,
      rateHrs: config.overhead.fixed.setupHrs,
      totalHrs: config.overhead.fixed.setupHrs,
      notes: "Truck unload, tool staging, site prep",
    });
  }
  if (config.overhead.fixed.layoutHrs > 0) {
    laborDrivers.push({
      activity: "Layout & String Line",
      count: 1,
      rateHrs: config.overhead.fixed.layoutHrs,
      totalHrs: config.overhead.fixed.layoutHrs,
      notes: "Measure, stake, mark post locations",
    });
  }
  if (config.overhead.perDay.cleanupHrs > 0) {
    const cleanupTotal = Math.round(jobDays * config.overhead.perDay.cleanupHrs * 10) / 10;
    laborDrivers.push({
      activity: "Daily Cleanup",
      count: jobDays,
      rateHrs: config.overhead.perDay.cleanupHrs,
      totalHrs: cleanupTotal,
      notes: `${jobDays} day(s) × ${config.overhead.perDay.cleanupHrs}h/day`,
    });
  }
  auditTrail.push(`Overhead: setup ${config.overhead.fixed.setupHrs}h + layout ${config.overhead.fixed.layoutHrs}h + cleanup ${config.overhead.perDay.cleanupHrs}h/day × ${jobDays} days`);

  // ── OLD FENCE REMOVAL ──
  // When existingFenceRemoval is true on the project input
  if (graph.siteConfig.existingFenceRemoval) {
    const segEdges = graph.edges.filter(e => e.type === "segment");
    const totalLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
    const postCount = graph.nodes.length;

    const removalLaborHrs = Math.round(totalLF * config.removal.laborPerLf * 10) / 10;
    if (removalLaborHrs > 0) {
      laborDrivers.push({
        activity: "Existing Fence Removal",
        count: Math.round(totalLF),
        rateHrs: config.removal.laborPerLf,
        totalHrs: removalLaborHrs,
        notes: `${totalLF.toFixed(0)} LF × ${config.removal.laborPerLf}h/LF`,
      });
    }

    const extractionHrs = Math.round(postCount * config.removal.postExtractionHrs * 10) / 10;
    if (extractionHrs > 0) {
      laborDrivers.push({
        activity: "Old Post Extraction",
        count: postCount,
        rateHrs: config.removal.postExtractionHrs,
        totalHrs: extractionHrs,
        notes: `${postCount} posts × ${config.removal.postExtractionHrs}h/post`,
      });
    }

    if (config.removal.disposalCost > 0) {
      bom.push(makeBomItem(
        "DISPOSAL_HAULING", "Fence Disposal / Haul Away", "disposal", "job",
        1, 0.95, `Old fence removal disposal`, config.removal.disposalCost
      ));
    }

    auditTrail.push(`Removal: ${removalLaborHrs}h tear-down + ${extractionHrs}h post extraction + $${config.removal.disposalCost} disposal`);
  }

  // ── LABOR EFFICIENCY MULTIPLIER ──
  // Applied as a visible adjustment line when baseMultiplier != 1.0
  // Comes AFTER overhead and removal so it scales all labor consistently.
  // Epsilon comparison guards against float drift from a UI slider (step=0.05).
  const effMultiplier = config.laborEfficiency.baseMultiplier;
  if (Math.abs(effMultiplier - 1.0) > 1e-6) {
    const preFinalLaborHrs = laborDrivers.reduce((s, l) => s + l.totalHrs, 0);
    const adjustmentHrs = Math.round((preFinalLaborHrs * (effMultiplier - 1)) * 10) / 10;
    if (adjustmentHrs !== 0) {
      const pctLabel = effMultiplier > 1
        ? `+${Math.round((effMultiplier - 1) * 100)}% (harder site / slower crew)`
        : `${Math.round((effMultiplier - 1) * 100)}% (easier site / faster crew)`;
      laborDrivers.push({
        activity: "Labor Efficiency Adjustment",
        count: 1,
        rateHrs: adjustmentHrs,
        totalHrs: adjustmentHrs,
        notes: pctLabel,
      });
      auditTrail.push(`Labor efficiency multiplier: ${effMultiplier}x → ${adjustmentHrs > 0 ? "+" : ""}${adjustmentHrs}h adjustment`);
    }
  }

  // ── SITE COMPLEXITY MULTIPLIER ──
  // Separate from org-wide laborEfficiency. This reflects the scoped site
  // conditions on the current job so difficult access / obstacles / hard
  // ground can push labor without forcing a global config change.
  const siteComplexityAdjustment = getSiteComplexityLaborMultiplier(graph.siteConfig.siteComplexity);
  if (Math.abs(siteComplexityAdjustment.multiplier - 1.0) > 1e-6) {
    const preComplexityLaborHrs = laborDrivers.reduce((s, l) => s + l.totalHrs, 0);
    const adjustmentHrs = Math.round((preComplexityLaborHrs * (siteComplexityAdjustment.multiplier - 1)) * 10) / 10;
    if (adjustmentHrs !== 0) {
      laborDrivers.push({
        activity: "Site Complexity Adjustment",
        count: 1,
        rateHrs: adjustmentHrs,
        totalHrs: adjustmentHrs,
        notes: siteComplexityAdjustment.note ?? "Site complexity-based labor adjustment",
      });
      auditTrail.push(
        `Site complexity multiplier: ${siteComplexityAdjustment.multiplier}x → ${adjustmentHrs > 0 ? "+" : ""}${adjustmentHrs}h adjustment`
      );
    }
  } else if (siteComplexityAdjustment.note) {
    auditTrail.push(siteComplexityAdjustment.note);
  }

  // ── ADAPTIVE PATTERN MULTIPLIER ──
  // Applies the learned labor drift for this fence type + site complexity
  // band, based on previously closed jobs for the same contractor.
  const adaptiveLabor = getAdaptiveLaborBucketForComplexity(
    graph.siteConfig.siteComplexity,
    config.adaptiveLabor.byFenceType[fenceType]
  );
  if (Math.abs(adaptiveLabor.multiplier - 1.0) > 1e-6) {
    const preAdaptiveLaborHrs = laborDrivers.reduce((s, l) => s + l.totalHrs, 0);
    const adjustmentHrs = Math.round((preAdaptiveLaborHrs * (adaptiveLabor.multiplier - 1)) * 10) / 10;
    if (adjustmentHrs !== 0) {
      laborDrivers.push({
        activity: "Adaptive Pattern Adjustment",
        count: 1,
        rateHrs: adjustmentHrs,
        totalHrs: adjustmentHrs,
        notes: adaptiveLabor.note ?? "Learned from prior closeouts",
      });
      auditTrail.push(
        `Adaptive labor multiplier: ${adaptiveLabor.multiplier}x (${adaptiveLabor.band ?? "unknown"} band, ${adaptiveLabor.sampleCount} samples) → ${adjustmentHrs > 0 ? "+" : ""}${adjustmentHrs}h adjustment`
      );
    }
  } else if (adaptiveLabor.note) {
    auditTrail.push(adaptiveLabor.note);
  }

  // ── EQUIPMENT RENTALS ──
  // Added as BOM line items (material cost, not labor)
  const MIXER_THRESHOLD_BAGS = 25; // add mixer rental when concrete exceeds this

  // Auger: always needed
  if (config.equipment.augerPerDay > 0) {
    bom.push(makeBomItem(
      "EQUIP_AUGER", "Post Hole Auger Rental", "equipment", "day",
      jobDays, 0.95, `${jobDays} day(s)`, config.equipment.augerPerDay
    ));
  }

  // Mixer: only when concrete bag count warrants it.
  // Summed across the `concrete` category so a non-standard concrete SKU
  // (e.g. 60lb bags, regional variant) still triggers the rental correctly.
  const totalConcreteBags = bom
    .filter(b => b.category === "concrete" && b.sku.toUpperCase().startsWith("CONCRETE"))
    .reduce((sum, b) => sum + b.qty, 0);
  if (totalConcreteBags >= MIXER_THRESHOLD_BAGS && config.equipment.mixerPerDay > 0) {
    bom.push(makeBomItem(
      "EQUIP_MIXER", "Concrete Mixer Rental", "equipment", "day",
      jobDays, 0.90, `${totalConcreteBags} concrete bags ≥ ${MIXER_THRESHOLD_BAGS} threshold`, config.equipment.mixerPerDay
    ));
  }

  // Stretcher: chain link only
  if (fenceType === "chain_link" && config.equipment.stretcherPerDay > 0) {
    bom.push(makeBomItem(
      "EQUIP_STRETCHER", "Fence Stretcher Rental", "equipment", "day",
      jobDays, 0.95, `Chain link fabric stretching`, config.equipment.stretcherPerDay
    ));
  }

  // Chop saw: aluminum only
  if (fenceType === "aluminum" && config.equipment.sawPerDay > 0) {
    bom.push(makeBomItem(
      "EQUIP_SAW", "Metal Chop Saw Rental", "equipment", "day",
      jobDays, 0.95, `Aluminum panel cutting`, config.equipment.sawPerDay
    ));
  }

  auditTrail.push(`Equipment: ${jobDays} day(s) — auger${totalConcreteBags >= MIXER_THRESHOLD_BAGS ? " + mixer" : ""}${fenceType === "chain_link" ? " + stretcher" : ""}${fenceType === "aluminum" ? " + saw" : ""}`);

  // ── MATERIAL COST SUBTOTAL (before delivery) ──
  const totalMaterialCost = bom.reduce((s, item) => s + (item.extCost ?? 0), 0);

  // ── DELIVERY FEE ──
  // Applied when material total is below free-delivery threshold
  if (config.logistics.deliveryFee > 0 && totalMaterialCost < config.logistics.freeDeliveryThreshold) {
    bom.push(makeBomItem(
      "DELIVERY_FEE", "Material Delivery", "logistics", "job",
      1, 0.98, `Material $${Math.round(totalMaterialCost)} < $${config.logistics.freeDeliveryThreshold} threshold`, config.logistics.deliveryFee
    ));
    auditTrail.push(`Delivery: $${config.logistics.deliveryFee} (material subtotal $${Math.round(totalMaterialCost)} below $${config.logistics.freeDeliveryThreshold} free-delivery threshold)`);
  } else if (config.logistics.deliveryFee > 0) {
    auditTrail.push(`Delivery: waived (material subtotal $${Math.round(totalMaterialCost)} ≥ $${config.logistics.freeDeliveryThreshold} threshold)`);
  }

  // ── REGULATORY COSTS ──
  // Manual-entry permit/inspection/engineering/survey costs from project input
  const regulatoryCosts: { sku: string; name: string; cost: number }[] = [];
  const projInput = graph.siteConfig; // siteConfig doesn't carry these, so check options
  // Regulatory costs are threaded via the graph — we check the original input
  // which is passed to buildFenceGraph and stored on the graph
  // For now, regulatory costs are passed through BomOptions since FenceGraph doesn't carry them
  if (options.permitCost && options.permitCost > 0) {
    regulatoryCosts.push({ sku: "REG_PERMIT", name: "Permit", cost: options.permitCost });
  }
  if (options.inspectionCost && options.inspectionCost > 0) {
    regulatoryCosts.push({ sku: "REG_INSPECTION", name: "Inspection", cost: options.inspectionCost });
  }
  if (options.engineeringCost && options.engineeringCost > 0) {
    regulatoryCosts.push({ sku: "REG_ENGINEERING", name: "Engineering / Stamp", cost: options.engineeringCost });
  }
  if (options.surveyCost && options.surveyCost > 0) {
    regulatoryCosts.push({ sku: "REG_SURVEY", name: "Survey", cost: options.surveyCost });
  }
  for (const rc of regulatoryCosts) {
    bom.push(makeBomItem(rc.sku, rc.name, "regulatory", "job", 1, 0.99, `Contractor-entered regulatory cost`, rc.cost));
  }
  if (regulatoryCosts.length > 0) {
    auditTrail.push(`Regulatory: ${regulatoryCosts.map(r => `${r.name} $${r.cost}`).join(", ")}`);
  }

  // ── FINAL TOTALS ──
  const finalMaterialCost = bom.reduce((s, item) => s + (item.extCost ?? 0), 0);
  const totalLaborHrs = Math.round(laborDrivers.reduce((s, l) => s + l.totalHrs, 0) * 10) / 10;
  const totalLaborCost = Math.round(totalLaborHrs * laborRatePerHr);

  const trueMaterialOnlyCost = bom
    .filter(b => !NON_MATERIAL_CATEGORIES.has(b.category))
    .reduce((s, b) => s + (b.extCost ?? 0), 0);

  // ── REGIONAL MULTIPLIERS ──
  // Apply materialMultiplier and laborMultiplier from config when not base (1.0).
  // Note: config.region.key already drives per-SKU pricing via mergePrices in BOM generators.
  // materialMultiplier is an ADDITIONAL multiplier on top of that (for contractor fine-tuning).
  // Only applied to true material SKUs, not equipment rentals / delivery / disposal / permits.
  const EFFICIENCY_EPSILON = 1e-6;
  let materialRegionalAdj = 0;
  if (Math.abs(config.region.materialMultiplier - 1) > EFFICIENCY_EPSILON) {
    materialRegionalAdj = Math.round(trueMaterialOnlyCost * (config.region.materialMultiplier - 1));
    auditTrail.push(`Regional material adjustment: ${config.region.materialMultiplier}x applied to materials only (${fmtAdj(materialRegionalAdj)})`);
  }

  let laborRegionalAdj = 0;
  if (Math.abs(config.region.laborMultiplier - 1) > EFFICIENCY_EPSILON) {
    laborRegionalAdj = Math.round(totalLaborCost * (config.region.laborMultiplier - 1));
    auditTrail.push(`Regional labor adjustment: ${config.region.laborMultiplier}x → ${fmtAdj(laborRegionalAdj)}`);
  }

  const adjustedMaterialCost = finalMaterialCost + materialRegionalAdj;
  const adjustedLaborCost = totalLaborCost + laborRegionalAdj;

  const redFlagItems = bom.filter(item => item.confidence < 0.80);
  const pricingHealth = buildPricingHealth(bom, priceMeta, STALE_PRICE_THRESHOLD_DAYS);
  const pricingReviewGates = buildPricingReviewGates(pricingHealth);
  const siteComplexityScore = graph.siteConfig.siteComplexity?.overall_score ?? null;
  const laborModelHealth = buildLaborModelHealth({
    siteComplexityScore,
    adaptiveBand: adaptiveLabor.band,
    adaptiveSampleCount: adaptiveLabor.sampleCount,
    learnedMultiplier: adaptiveLabor.multiplier,
  });
  const laborReviewGates = buildLaborReviewGates(laborModelHealth, siteComplexityScore);
  const bomConfidence = bom.length > 0
    ? bom.reduce((s, item) => s + item.confidence, 0) / bom.length
    : 0;
  const pricingPenalty = Math.min(
    0.18,
    (1 - pricingHealth.freshCoveragePct) * 0.12 +
      pricingHealth.staleCoveragePct * 0.08 +
      Math.min(0.06, pricingHealth.missingPriceItemCount * 0.02)
  );
  const laborPenalty =
    laborModelHealth.calibrationConfidence === "low"
      ? (siteComplexityScore ?? 0) >= 4 ? 0.06 : 0.03
      : laborModelHealth.calibrationConfidence === "medium"
        ? 0.02
        : 0;
  const overallConfidence = Math.round(
    Math.max(
      0.5,
      Math.min(
        0.99,
        bomConfidence * 0.7 +
          graph.audit.overallConfidence * 0.3 -
          Math.min(0.06, redFlagItems.length * 0.01) -
          pricingPenalty -
          laborPenalty
      )
    ) * 100
  ) / 100;
  const confidenceNotes = [...(graph.audit.confidenceNotes ?? [])];
  const confidenceReviewGates = [
    ...(graph.audit.confidenceReviewGates ?? []),
    ...pricingReviewGates,
    ...laborReviewGates,
  ];
  if (redFlagItems.length > 0) {
    confidenceNotes.push(
      `${redFlagItems.length} BOM item${redFlagItems.length === 1 ? "" : "s"} flagged for lower pricing confidence.`
    );
  }
  if (pricingHealth.trueMaterialItemCount > 0) {
    confidenceNotes.push(
      `Fresh supplier pricing covers ${Math.round(pricingHealth.freshCoveragePct * 100)}% of material spend.`
    );
    if (pricingHealth.fallbackPriceItemCount > 0) {
      confidenceNotes.push(
        `${pricingHealth.fallbackPriceItemCount} line item${pricingHealth.fallbackPriceItemCount === 1 ? "" : "s"} are still using fallback default pricing.`
      );
    }
  }
  confidenceNotes.push(...laborModelHealth.notes);

  const segEdgesForScrap = graph.edges.filter(e => e.type === "segment");
  const totalScrap = segEdgesForScrap.reduce((s, e) =>
    s + (e.sections?.reduce((ss, sec) => ss + sec.scrap_in, 0) ?? 0), 0);

  // ── COST CATEGORY SUBTOTALS (for profitability summary) ──
  const categoryCosts = (cat: string) => bom
    .filter(b => b.category === cat)
    .reduce((s, b) => s + (b.extCost ?? 0), 0);

  const materialOnlyCost = bom
    .filter(b => !["equipment", "logistics", "disposal", "regulatory"].includes(b.category))
    .reduce((s, b) => s + (b.extCost ?? 0), 0) + materialRegionalAdj;
  const equipmentCost = categoryCosts("equipment");
  const logisticsCost = categoryCosts("logistics");
  const disposalCost = categoryCosts("disposal");
  const regulatoryCost = categoryCosts("regulatory");

  const rawEstimatedCost = adjustedMaterialCost + adjustedLaborCost;

  // ── MINIMUM JOB CHARGE ──
  let minJobChargeAdj = 0;
  if (config.pricing.minimumJobCharge > 0 && rawEstimatedCost < config.pricing.minimumJobCharge) {
    minJobChargeAdj = Math.round(config.pricing.minimumJobCharge - rawEstimatedCost);
    auditTrail.push(`Minimum job charge: $${config.pricing.minimumJobCharge} − $${Math.round(rawEstimatedCost)} calculated = +$${minJobChargeAdj} adjustment`);
  }

  const finalQuotedTotal = rawEstimatedCost + minJobChargeAdj;

  // ── PROFITABILITY SUMMARY ──
  const quotedAt20 = Math.round(rawEstimatedCost * 1.20);
  const quotedAt30 = Math.round(rawEstimatedCost * 1.30);
  const quotedAt40 = Math.round(rawEstimatedCost * 1.40);

  const commercialSummary: import("../types").CommercialSummary = {
    materialCostSubtotal: materialOnlyCost,
    laborCostSubtotal: adjustedLaborCost,
    equipmentCostSubtotal: equipmentCost,
    logisticsCostSubtotal: logisticsCost,
    disposalCostSubtotal: disposalCost,
    regulatoryCostSubtotal: regulatoryCost,
    commercialAdjustmentsSubtotal: minJobChargeAdj,
    rawEstimatedCost: Math.round(rawEstimatedCost),
    finalQuotedTotal: Math.round(finalQuotedTotal),
    quotedAt20Pct: quotedAt20,
    quotedAt30Pct: quotedAt30,
    quotedAt40Pct: quotedAt40,
    grossProfitAt20Pct: quotedAt20 - Math.round(rawEstimatedCost),
    grossProfitAt30Pct: quotedAt30 - Math.round(rawEstimatedCost),
    grossProfitAt40Pct: quotedAt40 - Math.round(rawEstimatedCost),
  };

  // ── QUOTE PACKAGE ──
  const quoteMetadata = buildQuoteMetadata();
  const customerProposal = buildCustomerProposal(
    { totalLaborHrs, totalCost: Math.round(finalQuotedTotal), bom, graph, commercialSummary } as FenceEstimateResult,
    fenceType,
    quoteMetadata.quoteValidUntil,
    config.production.hoursPerDay,
  );
  const termsAndConditions = buildTermsAndConditions(options.customTerms);
  const shoppingListGroups = groupBomIntoShoppingList(bom);

  const result: FenceEstimateResult = {
    projectId: graph.projectId,
    projectName: "Estimate",
    graph,
    bom,
    laborDrivers,
    totalMaterialCost: adjustedMaterialCost,
    // True materials-only subtotal — excludes equipment, logistics,
    // disposal, and regulatory so customer-facing renderers can show
    // an honest "Materials" line without rolling in service costs.
    materialOnlyCost: Math.round(materialOnlyCost),
    totalLaborHrs,
    totalLaborCost: adjustedLaborCost,
    totalCost: Math.round(finalQuotedTotal),
    deterministicScrap_in: totalScrap,
    probabilisticWastePct: wastePct,
    overallConfidence,
    confidenceNotes,
    confidenceReviewGates,
    pricingHealth,
    laborModelHealth,
    redFlagItems,
    commercialSummary,
    quoteMetadata,
    customerProposal,
    termsAndConditions,
    shoppingListGroups,
    auditTrail,
  };

  // ── EDGE CASE DETECTION: Identify known patterns from validation ──
  const edgeCaseFlags = detectEdgeCases(result, graph, fenceType);
  if (edgeCaseFlags.length > 0) {
    result.edgeCaseFlags = edgeCaseFlags;
    addEdgeCaseSummary(result, edgeCaseFlags);
  }

  // ── VALIDATION LAYER: Block bad outputs ──
  assertValidEstimate(result);

  return result;
}

export type { WoodStyle };
