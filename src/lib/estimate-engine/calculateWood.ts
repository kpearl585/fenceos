// ── Wood Privacy Calculation ────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateWood(inputs: EstimateInputs): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.wood_privacy;
  const { linearFeet, gateCount, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // Panels: ceil(linearFeet / 8), then apply waste factor
  const rawPanels = Math.ceil(linearFeet / 8);
  const panels = Math.ceil(rawPanels * (1 + wasteFactorPct));
  items.push({
    sku: "WOOD_PANEL_8FT",
    name: "Wood Privacy Panel 8ft",
    unit: "ea",
    qty: panels,
    meta: { rawQty: rawPanels, wasteApplied: true },
  });

  // Posts: rawPanels + 1  (one post per panel boundary)
  const posts = rawPanels + 1;
  items.push({
    sku: "WOOD_POST_4X4_8",
    name: "Wood Post 4x4 8ft",
    unit: "ea",
    qty: posts,
  });

  // Concrete: 2 bags per post
  const concreteBags = posts * cfg.concreteBagsPerPost;
  items.push({
    sku: "CONCRETE_80LB",
    name: "Concrete Bag 80lb",
    unit: "bag",
    qty: Math.ceil(concreteBags),
  });

  // Fasteners: 1 box per 5 panels (round up)
  const fastenerBoxes = Math.ceil(panels / 5);
  items.push({
    sku: "SCREWS_1LB",
    name: "Screws 1lb Box",
    unit: "ea",
    qty: fastenerBoxes,
  });

  // Gates
  if (gateCount > 0) {
    items.push({
      sku: "GATE_WOOD_4FT",
      name: "Wood Gate 4ft",
      unit: "ea",
      qty: gateCount,
    });
    items.push({
      sku: "HINGE_HD",
      name: "Heavy Duty Gate Hinge",
      unit: "ea",
      qty: gateCount * 2,
    });
  }

  return items;
}
