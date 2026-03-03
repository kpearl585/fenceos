// ── Aluminum / Ornamental Calculation ─────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateAluminum(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.aluminum;
  const { linearFeet, gateCount, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // Panels: 6ft spacing, ceil + waste
  const rawPanels = Math.ceil(linearFeet / cfg.defaultPostSpacing);
  const panels = Math.ceil(rawPanels * (1 + wasteFactorPct));
  items.push({
    sku: "ALUM_PANEL_4FT",
    name: "Aluminum Picket Panel 4ft",
    unit: "ea",
    qty: panels,
    meta: { rawQty: rawPanels, wasteApplied: true },
  });

  // Posts: rawPanels + 1
  const posts = rawPanels + 1;
  items.push({
    sku: "ALUM_POST_2X2",
    name: "Aluminum Post 2x2x8",
    unit: "ea",
    qty: posts,
  });

  // Post caps
  items.push({
    sku: "ALUM_POST_CAP",
    name: "Aluminum Post Cap 2x2",
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

  // Gates
  if (gateCount > 0) {
    items.push({
      sku: "GATE_ALUM_4FT",
      name: "Aluminum Gate 4ft",
      unit: "ea",
      qty: gateCount,
    });
    items.push({
      sku: "HINGE_HD",
      name: "Heavy Duty Gate Hinge",
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
