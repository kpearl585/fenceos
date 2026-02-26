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
    sku: "CL_TOP_RAIL",
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
    sku: "CL_LINE_POST",
    name: "Chain Link Line Post",
    unit: "ea",
    qty: linePosts,
  });

  items.push({
    sku: "CL_TERMINAL_POST",
    name: "Chain Link Terminal Post",
    unit: "ea",
    qty: terminalPosts,
  });

  // Tension bands: 4 per terminal post
  items.push({
    sku: "CL_TENSION_BAND",
    name: "Chain Link Tension Band",
    unit: "ea",
    qty: terminalPosts * 4,
  });

  // Tie wire: ~1ft per linear foot
  items.push({
    sku: "CL_TIE_WIRE",
    name: "Chain Link Tie Wire (per ft)",
    unit: "ft",
    qty: Math.ceil(linearFeet),
  });

  // Concrete: 1.5 bags per post, round up to whole bags
  const concreteBags = Math.ceil(totalPosts * cfg.concreteBagsPerPost);
  items.push({
    sku: "CONCRETE_BAG_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: concreteBags,
  });

  // Misc fittings: 1 set per 50ft
  items.push({
    sku: "CL_FITTINGS_MISC",
    name: "Chain Link Misc Fittings",
    unit: "ea",
    qty: Math.ceil(linearFeet / 50),
  });

  // Gates
  if (gateCount > 0) {
    items.push({
      sku: "CL_GATE_SINGLE",
      name: "Chain Link Gate Single",
      unit: "ea",
      qty: gateCount,
    });
  }

  return items;
}
