// ── Chain Link Calculation ──────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateChainLink(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.chain_link;
  const { linearFeet, gateCount, postSpacing, height, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // ── Fabric: select 4ft or 6ft based on height ──────────────────
  // Standard rolls: 4ft high for ≤4ft fence, 6ft high for taller fences
  const fabricSku = height > 4 ? "CL_FABRIC_6FT" : "CL_FABRIC_4FT";
  const fabricName = height > 4
    ? "Chain Link Fabric 6ft (per ft)"
    : "Chain Link Fabric 4ft (per ft)";

  // Deduct gate openings from fabric/rail LF (each gate ~ 4ft opening)
  const netLF = Math.max(0, linearFeet - gateCount * 4);
  const rawFabric = netLF;
  const fabric = Math.ceil(rawFabric * (1 + wasteFactorPct));
  items.push({
    sku: fabricSku,
    name: fabricName,
    unit: "ft",
    qty: fabric,
    meta: { rawQty: rawFabric, wasteApplied: true, heightFt: height },
  });

  // ── Top rail: linear feet with waste ──────────────────────────
  const rawTopRail = netLF;
  const topRail = Math.ceil(rawTopRail * (1 + wasteFactorPct));
  items.push({
    sku: "CL_TOPRAIL",
    name: "Chain Link Top Rail (per ft)",
    unit: "ft",
    qty: topRail,
    meta: { rawQty: rawTopRail, wasteApplied: true },
  });

  // ── Posts ──────────────────────────────────────────────────────
  // Total posts: one at each interval boundary
  const totalPosts = Math.ceil(linearFeet / postSpacing) + 1;

  // Terminal posts: 2 end posts + 2 per gate opening
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
    name: "Chain Link Terminal Post 2.5in",
    unit: "ea",
    qty: terminalPosts,
  });

  // ── Tension wire: 1 roll per 150 linear feet (min 1) ──────────
  // Bottom tension wire runs full fence length to prevent fabric lift.
  // Typical spool covers ~150ft; round up.
  items.push({
    sku: "CL_TENSION_WIRE",
    name: "Chain Link Tension Wire (spool)",
    unit: "ea",
    qty: Math.max(1, Math.ceil(linearFeet / 150)),
  });

  // ── Tie wire / staples: 1 box per 100ft ────────────────────────
  items.push({
    sku: "STAPLES_1LB",
    name: "Tie Wire / Fence Staples 1lb",
    unit: "ea",
    qty: Math.ceil(linearFeet / 100),
  });

  // ── Concrete: bags per post ────────────────────────────────────
  // Chain link: 1.5 bags per post (line posts 1 bag, terminal 2 bags — blended)
  const concreteBags = Math.ceil(totalPosts * cfg.concreteBagsPerPost);
  items.push({
    sku: "CONCRETE_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: concreteBags,
  });

  // ── Misc hardware (rail ends, brace bands): 1 set per terminal post
  items.push({
    sku: "CL_FITTINGS",
    name: "Misc Fittings (rail ends / brace bands)",
    unit: "set",
    qty: terminalPosts,
  });

  // ── Gates ──────────────────────────────────────────────────────
  if (gateCount > 0) {
    items.push({
      sku: "GATE_CL_4FT",
      name: "Chain Link Walk Gate 4ft",
      unit: "ea",
      qty: gateCount,
    });
    items.push({
      sku: "GATE_LATCH",
      name: "Gate Latch",
      unit: "ea",
      qty: gateCount,
    });
  }

  return items;
}
