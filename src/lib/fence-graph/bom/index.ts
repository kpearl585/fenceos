// ── BOM Router ───────────────────────────────────────────────────
// Routes to the correct type-specific BOM generator based on fence type.

import type { FenceGraph, BomItem, LaborDriver, FenceEstimateResult } from "../types";
import { generateVinylBom } from "./vinylBom";
import { generateWoodBom, type WoodStyle } from "./woodBom";
import { generateChainLinkBom } from "./chainLinkBom";
import { generateAluminumBom } from "./aluminumBom";

export type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";

export interface BomOptions {
  fenceType: FenceType;
  woodStyle?: WoodStyle;
  laborRatePerHr?: number;
  wastePct?: number;
  priceMap?: Record<string, number>; // sku → unit_cost from DB
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

  let bom: BomItem[];
  let laborDrivers: LaborDriver[];
  let auditTrail: string[];

  switch (fenceType) {
    case "wood":
      ({ bom, laborDrivers, auditTrail } = generateWoodBom(graph, wastePct, woodStyle, priceMap));
      break;
    case "chain_link":
      ({ bom, laborDrivers, auditTrail } = generateChainLinkBom(graph, wastePct, priceMap));
      break;
    case "aluminum":
      ({ bom, laborDrivers, auditTrail } = generateAluminumBom(graph, wastePct, priceMap));
      break;
    case "vinyl":
    default:
      ({ bom, laborDrivers, auditTrail } = generateVinylBom(graph, wastePct, priceMap));
      break;
  }

  const totalMaterialCost = bom.reduce((s, item) => s + (item.extCost ?? 0), 0);
  const totalLaborHrs = Math.round(laborDrivers.reduce((s, l) => s + l.totalHrs, 0) * 10) / 10;
  const totalLaborCost = Math.round(totalLaborHrs * laborRatePerHr);
  const redFlagItems = bom.filter(item => item.confidence < 0.80);
  const overallConfidence = bom.length > 0
    ? Math.round(bom.reduce((s, item) => s + item.confidence, 0) / bom.length * 100) / 100
    : 0;

  const segEdges = graph.edges.filter(e => e.type === "segment");
  const totalScrap = segEdges.reduce((s, e) =>
    s + (e.sections?.reduce((ss, sec) => ss + sec.scrap_in, 0) ?? 0), 0);

  return {
    projectId: graph.projectId,
    projectName: "Estimate",
    graph,
    bom,
    laborDrivers,
    totalMaterialCost,
    totalLaborHrs,
    totalLaborCost,
    totalCost: totalMaterialCost + totalLaborCost,
    deterministicScrap_in: totalScrap,
    probabilisticWastePct: wastePct,
    overallConfidence,
    redFlagItems,
    auditTrail,
  };
}

export type { WoodStyle };
