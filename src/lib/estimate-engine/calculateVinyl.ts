// ── Vinyl Calculation ──────────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateVinyl(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.vinyl;
  const { linearFeet, gateCount, height, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // ── Panels: select 6ft or 8ft based on height ─────────────────
  const panelSku = height > 7 ? "VINYL_PANEL_8FT" : "VINYL_PANEL_6FT";
  const panelName = height > 7
    ? "Vinyl Privacy Panel 8ft"
    : "Vinyl Privacy Panel 6ft";

  const rawPanels = Math.ceil(linearFeet / 8);
  const panels = Math.ceil(rawPanels * (1 + wasteFactorPct));
  items.push({
    sku: panelSku,
    name: panelName,
    unit: "ea",
    qty: panels,
    meta: { rawQty: rawPanels, wasteApplied: true, heightFt: height },
  });

  // ── Posts: 1 per panel boundary ────────────────────────────────
  const posts = rawPanels + 1;
  items.push({
    sku: "VINYL_POST_5X5",
    name: "Vinyl Post 5x5 10ft",
    unit: "ea",
    qty: posts,
  });

  // ── Post caps: 1 per post ──────────────────────────────────────
  // Required to cap vinyl posts and prevent water intrusion
  items.push({
    sku: "VINYL_POST_CAP",
    name: "Vinyl Post Cap 5x5",
    unit: "ea",
    qty: posts,
  });

  // ── Concrete: 2 bags per post ──────────────────────────────────
  const concreteBags = posts * cfg.concreteBagsPerPost;
  items.push({
    sku: "CONCRETE_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: Math.ceil(concreteBags),
  });

  // ── Gates ──────────────────────────────────────────────────────
  if (gateCount > 0) {
    items.push({
      sku: "GATE_VINYL_4FT",
      name: "Vinyl Walk Gate 4ft",
      unit: "ea",
      qty: gateCount,
    });
    items.push({
      sku: "HINGE_HD",
      name: "Heavy Duty Gate Hinge (pair)",
      unit: "ea",
      qty: gateCount * 2,
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
