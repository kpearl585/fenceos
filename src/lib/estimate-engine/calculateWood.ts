// ── Wood Privacy Calculation ────────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

export function calculateWood(inputs: EstimateInputs): MaterialRequirement[] {
  const cfg = FENCE_TYPE_CONFIGS.wood_privacy;
  const { linearFeet, gateCount, height, wasteFactorPct } = inputs;
  const items: MaterialRequirement[] = [];

  // ── Panels: select 6ft or 8ft based on height ─────────────────
  // Standard wood privacy panels: 6ft height (most residential),
  // 8ft for commercial or privacy upgrades.
  const panelSku = height > 7 ? "WOOD_PANEL_8FT" : "WOOD_PANEL_6FT";
  const panelName = height > 7
    ? "Wood Privacy Panel 8ft"
    : "Wood Privacy Panel 6ft";

  // Panel width = 8ft; deduct gate openings (4ft each) from panel LF
  const panelLF = Math.max(0, linearFeet - gateCount * 4);
  const rawPanels = Math.ceil(panelLF / 8);
  const panels = Math.ceil(rawPanels * (1 + wasteFactorPct));
  items.push({
    sku: panelSku,
    name: panelName,
    unit: "ea",
    qty: panels,
    meta: { rawQty: rawPanels, wasteApplied: true, heightFt: height },
  });

  // ── Posts: select height based on fence height ─────────────────
  // Rule of thumb: post = fence height + 2ft buried.
  // ≤6ft fence → 8ft post; >6ft fence → 10ft post
  const postSku = height > 6 ? "WOOD_POST_4X4_10" : "WOOD_POST_4X4_8";
  const postName = height > 6 ? "Wood Post 4x4 10ft" : "Wood Post 4x4 8ft";

  // One post per panel boundary
  const posts = rawPanels + 1;
  items.push({
    sku: postSku,
    name: postName,
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

  // ── Fasteners: 1 box per 5 panels ─────────────────────────────
  const fastenerBoxes = Math.ceil(panels / 5);
  items.push({
    sku: "SCREWS_1LB",
    name: "Screws 1lb Box",
    unit: "ea",
    qty: fastenerBoxes,
  });

  // ── Gates ──────────────────────────────────────────────────────
  if (gateCount > 0) {
    items.push({
      sku: "GATE_WOOD_4FT",
      name: "Wood Walk Gate 4ft",
      unit: "ea",
      qty: gateCount,
    });
    // 2 hinges per gate
    items.push({
      sku: "HINGE_HD",
      name: "Heavy Duty Gate Hinge (pair)",
      unit: "ea",
      qty: gateCount * 2,
    });
    // 1 latch per gate
    items.push({
      sku: "GATE_LATCH",
      name: "Gate Latch",
      unit: "ea",
      qty: gateCount,
    });
  }

  return items;
}
