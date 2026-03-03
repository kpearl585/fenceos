// ── Chain Link Calculation ──────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateChainLink(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.chain_link;
  const { linearFeet, gateCount, postSpacing, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // Fabric: linear feet with waste
  const rawFabric = linearFeet;
  const fabric = Math.ceil(rawFabric * (1 + wasteFactorPct));
  items.push({
    sku: "CL_FABRIC_4FT",
    name: "Chain Link Fabric 4ft (per ft)",
    unit: "ft",
    qty: fabric,
    meta: { rawQty: rawFabric, wasteApplied: true },
  });

  // Top rail: same length as fabric with waste
  const rawTopRail = linearFeet;
  const topRail = Math.ceil(rawTopRail * (1 + wasteFactorPct));
  items.push({
    sku: "CL_TOPRAIL",
    name: "Chain Link Top Rail (per ft)",
    unit: "ft",
    qty: topRail,
    meta: { rawQty: rawTopRail, wasteApplied: true },
  });

  // Total posts: ceil(linearFeet / postSpacing) + 1
  const totalPosts = Math.ceil(linearFeet / postSpacing) + 1;

  // Terminal posts: 2 ends + 2 per gate (each gate needs 2 terminal posts)
  const terminalPosts = 2 + gateCount * 2;
  const linePosts = Math.max(0, totalPosts - terminalPosts);

  items.push({
    sku: "CL_POST_2IN",
    name: "Chain Link Line Post 2in",
    unit: "ea",
    qty: linePosts,
  });

  items.push({
    sku: "CL_POST_TERM",
    name: "Chain Link Terminal Post",
    unit: "ea",
    qty: terminalPosts,
  });

  // Tension wire: 1 per terminal post
  items.push({
    sku: "CL_TENSION_WIRE",
    name: "Chain Link Tension Wire",
    unit: "ea",
    qty: terminalPosts,
  });

  // Small hardware / staples: 1 box per 100ft
  items.push({
    sku: "STAPLES_1LB",
    name: "Staples 1lb Box",
    unit: "ea",
    qty: Math.ceil(linearFeet / 100),
  });

  // Concrete: bags per post, round up to whole bags
  const concreteBags = Math.ceil(totalPosts * cfg.concreteBagsPerPost);
  items.push({
    sku: "CONCRETE_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: concreteBags,
  });

  // Misc fittings: 1 latch per 50ft
  items.push({
    sku: "GATE_LATCH",
    name: "Gate Latch / Misc Fittings",
    unit: "ea",
    qty: Math.ceil(linearFeet / 50),
  });

  // Gates
  if (gateCount > 0) {
    items.push({
      sku: "GATE_CL_4FT",
      name: "Chain Link Gate Single 4ft",
      unit: "ea",
      qty: gateCount,
    });
  }

  return items;
}
