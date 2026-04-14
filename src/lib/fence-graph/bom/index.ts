// ── BOM Router ───────────────────────────────────────────────────
// Routes to the correct type-specific BOM generator based on fence type.

import type { FenceGraph, BomItem, LaborDriver, FenceEstimateResult } from "../types";
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
  buildQuoteMetadata,
  buildCustomerProposal,
  buildTermsAndConditions,
  groupBomIntoShoppingList,
} from "../quotePackage";

export type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";

export interface BomOptions {
  fenceType: FenceType;
  woodStyle?: WoodStyle;
  laborRatePerHr?: number;
  wastePct?: number;
  priceMap?: Record<string, number>; // sku → unit_cost from DB
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
  // Comes AFTER overhead and removal so it scales all labor consistently
  const effMultiplier = config.laborEfficiency.baseMultiplier;
  if (effMultiplier !== 1.0) {
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

  // Mixer: only when concrete bag count warrants it
  const totalConcreteBags = bom.find(b => b.sku === "CONCRETE_80LB")?.qty ?? 0;
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
  let totalLaborCost = Math.round(totalLaborHrs * laborRatePerHr);

  // ── REGIONAL MULTIPLIERS ──
  // Apply materialMultiplier and laborMultiplier from config when not base (1.0)
  // Note: config.region.key already drives per-SKU pricing via mergePrices in BOM generators.
  // materialMultiplier is an ADDITIONAL multiplier on top of that (for contractor fine-tuning).
  let materialRegionalAdj = 0;
  if (config.region.materialMultiplier !== 1.0) {
    materialRegionalAdj = Math.round(finalMaterialCost * (config.region.materialMultiplier - 1));
    auditTrail.push(`Regional material adjustment: ${config.region.materialMultiplier}x → ${materialRegionalAdj > 0 ? "+" : ""}$${materialRegionalAdj}`);
  }

  let laborRegionalAdj = 0;
  if (config.region.laborMultiplier !== 1.0) {
    laborRegionalAdj = Math.round(totalLaborCost * (config.region.laborMultiplier - 1));
    auditTrail.push(`Regional labor adjustment: ${config.region.laborMultiplier}x → ${laborRegionalAdj > 0 ? "+" : ""}$${laborRegionalAdj}`);
  }

  const adjustedMaterialCost = finalMaterialCost + materialRegionalAdj;
  const adjustedLaborCost = totalLaborCost + laborRegionalAdj;

  const redFlagItems = bom.filter(item => item.confidence < 0.80);
  const overallConfidence = bom.length > 0
    ? Math.round(bom.reduce((s, item) => s + item.confidence, 0) / bom.length * 100) / 100
    : 0;

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
    quoteMetadata.quoteValidUntil
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
    totalLaborHrs,
    totalLaborCost: adjustedLaborCost,
    totalCost: Math.round(finalQuotedTotal),
    deterministicScrap_in: totalScrap,
    probabilisticWastePct: wastePct,
    overallConfidence,
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
