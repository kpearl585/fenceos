// ── Volumetric Concrete Calculator ──────────────────────────────
// Computes actual cubic volume of concrete needed per post
// based on hole dimensions, post size, and gravel base.
// Far more accurate than flat "bags per post" estimates.

import type { FenceNode, InstallRules, SiteConfig } from "./types";
import { FLORIDA_DEPTH_OVERRIDE_IN } from "./types";

export interface ConcreteCalc {
  holeVolume_cu_in: number;
  gravelVolume_cu_in: number;
  postDisplacement_cu_in: number;
  concreteVolume_cu_in: number;
  concreteVolume_cu_ft: number;
  bagsNeeded: number;           // 60lb bags (0.45 cu ft yield each)
  gravelBagsNeeded: number;     // 40lb bags (0.5 cu ft each)
}

const BAG_60LB_YIELD_CU_FT = 0.45;  // 60lb concrete bag yield
const GRAVEL_BAG_CU_FT = 0.5;       // 40lb gravel bag fill volume

export function calcConcretePerPost(
  rules: InstallRules,
  site: SiteConfig,
  isGatePost: boolean
): ConcreteCalc {
  const holeDia = rules.holeDiameter_in;
  const holeRadius = holeDia / 2;

  // Florida sandy soil: enforce minimum depth
  let holeDepth = rules.holeDepth_in;
  if (site.soilType === "sandy" || site.soilType === "wet") {
    holeDepth = Math.max(holeDepth, FLORIDA_DEPTH_OVERRIDE_IN);
  }
  // Gate posts: extra 6 inches for leverage/weight
  if (isGatePost) {
    holeDepth = Math.max(holeDepth, holeDepth + 6);
  }

  const postSizeNum = holeDia === 10 ? 5 : 4; // 5x5 or 4x4 post nominal
  const gravelBase = rules.gravelBase_in;
  const postInHoleDepth = holeDepth - gravelBase;

  // Cylindrical hole volume (cu in)
  const holeVolume = Math.PI * Math.pow(holeRadius, 2) * holeDepth;

  // Gravel base volume (cylinder)
  const gravelVolume = Math.PI * Math.pow(holeRadius, 2) * gravelBase;

  // Post displacement (square post in cylindrical hole)
  const postDisplacement = postSizeNum * postSizeNum * postInHoleDepth;

  // Net concrete volume
  const concreteVolume_cu_in = holeVolume - gravelVolume - postDisplacement;
  const concreteVolume_cu_ft = concreteVolume_cu_in / 1728;

  // Bags needed — apply soil factor for sandy/wet soil (more concrete needed)
  const baseBags = concreteVolume_cu_ft / BAG_60LB_YIELD_CU_FT;
  const adjustedBags = baseBags * site.soilConcreteFactor;
  const bagsNeeded = Math.ceil(adjustedBags);

  // Gravel bags
  const gravelVolume_cu_ft = gravelVolume / 1728;
  const gravelBagsNeeded = Math.ceil(gravelVolume_cu_ft / GRAVEL_BAG_CU_FT);

  return {
    holeVolume_cu_in: Math.round(holeVolume * 10) / 10,
    gravelVolume_cu_in: Math.round(gravelVolume * 10) / 10,
    postDisplacement_cu_in: postDisplacement,
    concreteVolume_cu_in: Math.round(concreteVolume_cu_in * 10) / 10,
    concreteVolume_cu_ft: Math.round(concreteVolume_cu_ft * 1000) / 1000,
    bagsNeeded,
    gravelBagsNeeded,
  };
}

export function calcTotalConcrete(
  nodes: FenceNode[],
  rules: InstallRules,
  site: SiteConfig,
  wastePct = 0.05
): { totalBags: number; totalGravelBags: number; perPostCalc: ConcreteCalc } {
  const isGatePost = (type: string) =>
    type === "gate_hinge" || type === "gate_latch";

  const perPost = calcConcretePerPost(rules, site, false);
  const perGatePost = calcConcretePerPost(rules, site, true);

  let totalBags = 0;
  let totalGravelBags = 0;

  for (const node of nodes) {
    const calc = isGatePost(node.type) ? perGatePost : perPost;
    totalBags += calc.bagsNeeded;
    totalGravelBags += calc.gravelBagsNeeded;
  }

  // Apply waste factor
  totalBags = Math.ceil(totalBags * (1 + wastePct));
  totalGravelBags = Math.ceil(totalGravelBags * (1 + wastePct));

  return { totalBags, totalGravelBags, perPostCalc: perPost };
}
