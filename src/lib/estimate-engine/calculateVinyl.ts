// ── Vinyl Calculation ──────────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateVinyl(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.vinyl;
  const { linearFeet, gateCount, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // Panels: ceil(linearFeet / 8), then apply waste factor
  const rawPanels = Math.ceil(linearFeet / 8);
  const panels = Math.ceil(rawPanels * (1 + wasteFactorPct));
  items.push({
    sku: "VINYL_PANEL_8FT",
    name: "Vinyl Privacy Panel 8ft",
    unit: "ea",
    qty: panels,
    meta: { rawQty: rawPanels, wasteApplied: true },
  });

  // Posts: rawPanels + 1
  const posts = rawPanels + 1;
  items.push({
    sku: "VINYL_POST_5X5_8FT",
    name: "Vinyl Post 5x5 8ft",
    unit: "ea",
    qty: posts,
  });

  // Concrete: 2 bags per post
  const concreteBags = posts * cfg.concreteBagsPerPost;
  items.push({
    sku: "CONCRETE_BAG_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: Math.ceil(concreteBags),
  });

  // Gates
  if (gateCount > 0) {
    items.push({
      sku: "VINYL_GATE_SINGLE",
      name: "Vinyl Gate Single Assembly",
      unit: "ea",
      qty: gateCount,
    });
    items.push({
      sku: "VINYL_GATE_HARDWARE_SET",
      name: "Vinyl Gate Hardware Set",
      unit: "ea",
      qty: gateCount,
    });
  }

  return items;
}
