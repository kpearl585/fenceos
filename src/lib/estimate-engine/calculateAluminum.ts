// ── Aluminum / Ornamental Calculation ─────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateAluminum(
  inputs: EstimateInputs
): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.aluminum;
  const { linearFeet, gateCount, height, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // ── Panels: select 4ft or 6ft based on height ─────────────────
  // Standard aluminum picket: 4ft residential, 6ft commercial/pool
  const panelSku = height > 4 ? "ALUM_PANEL_6FT" : "ALUM_PANEL_4FT";
  const panelName = height > 4
    ? "Aluminum Picket Panel 6ft"
    : "Aluminum Picket Panel 4ft";

  // Panels span between posts at 6ft spacing
  const rawPanels = Math.ceil(linearFeet / cfg.defaultPostSpacing);
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
    sku: "ALUM_POST_2X2",
    name: "Aluminum Post 2x2x8",
    unit: "ea",
    qty: posts,
  });

  // ── Post caps: 1 per post ──────────────────────────────────────
  items.push({
    sku: "ALUM_POST_CAP",
    name: "Aluminum Post Cap 2x2",
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
      sku: "GATE_ALUM_4FT",
      name: "Aluminum Walk Gate 4ft",
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
