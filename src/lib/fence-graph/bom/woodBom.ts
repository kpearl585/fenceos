// ── Wood Fence BOM Generator ─────────────────────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";

export type WoodStyle = "dog_ear_privacy" | "flat_top_privacy" | "picket" | "board_on_board";

export function generateWoodBom(
  graph: FenceGraph,
  wastePct: number,
  style: WoodStyle = "dog_ear_privacy",
  priceMap: Record<string, number> = {}
): { bom: BomItem[]; laborDrivers: LaborDriver[]; auditTrail: string[] } {
  const bom: BomItem[] = [];
  const audit: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  const p = (sku: string) => priceMap[sku];
  const heightFt = productLine.panelHeight_in / 12;
  const isHeavy = heightFt > 6; // 6x6 posts for 8ft+ fence
  const railCount = heightFt <= 5 ? 2 : heightFt <= 6 ? 3 : 4;
  const isPicket = style === "picket";

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");
  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  // Posts
  const postSku = isHeavy ? "WOOD_POST_6X6_8" : (heightFt > 6 ? "WOOD_POST_4X4_10" : "WOOD_POST_4X4_8");
  const postName = isHeavy ? "Wood Post 6x6 8ft" : (heightFt > 6 ? "Wood Post 4x4 10ft" : "Wood Post 4x4 8ft");
  bom.push(makeBomItem(postSku, postName, "posts", "ea", nodes.length, 0.95,
    `${nodes.length} posts (${heightFt}ft fence → ${postSku})`, p(postSku)));
  bom.push(makeBomItem("POST_CAP_4X4", "Wood Post Cap", "hardware", "ea", nodes.length, 0.90,
    `1 cap × ${nodes.length} posts`));

  // Rails — 2x4 pressure treated, cutting-stock optimizer
  const segEdges = edges.filter(e => e.type === "segment");
  const railLengths = segEdges.map(e => e.length_in / 12);
  const allRailLengths = railLengths.flatMap(l => Array(railCount).fill(l));
  const railCutPlan = cuttingStockOptimizer(allRailLengths, 8, wastePct);
  bom.push(makeBomItem("WOOD_RAIL_2X4_8", "Pressure Treated 2x4x8 Rail", "rails", "ea", railCutPlan.stockPiecesNeeded, 0.92,
    `${railCount} rails/span × ${railCutPlan.explanation}`, p("WOOD_RAIL_2X4_8")));

  // Bottom rail for privacy (prevents animals/debris under)
  if (!isPicket) {
    bom.push(makeBomItem("WOOD_RAIL_BOT_8", "Bottom Rail / Kick Board 1x6x8", "rails", "ea",
      Math.ceil(segEdges.reduce((s, e) => s + e.length_in / 12, 0) / 8 * (1 + wastePct)), 0.90,
      `Kick board: total run LF ÷ 8ft stock + ${Math.round(wastePct * 100)}% waste`));
  }

  // Boards/pickets
  if (isPicket) {
    const totalRunLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
    const picketSku = heightFt > 6 ? "WOOD_PICKET_8FT" : "WOOD_PICKET_6FT";
    // Standard pickets: 3.5" wide, 0.5" gap → ~4" per picket → 3 per LF
    const picketCount = Math.ceil(totalRunLF * 3 * (1 + wastePct));
    bom.push(makeBomItem(picketSku, `Wood Picket ${heightFt}ft`, "panels", "ea", picketCount, 0.92,
      `${totalRunLF.toFixed(1)} LF × 3 pickets/ft + ${Math.round(wastePct * 100)}% waste`, p(picketSku)));
    audit.push(`Picket fence: ${totalRunLF.toFixed(1)} LF → ${picketCount} pickets`);
  } else {
    // Privacy panels
    let totalPanels = 0;
    let totalCuts = 0;
    for (const edge of segEdges) {
      if (!edge.sections) continue;
      const count = countPanelsToBuy({ sections: edge.sections, totalScrap_in: 0, cutOperations: 0, score: 0, explanation: "" });
      totalPanels += count;
      totalCuts += edge.sections.filter(s => s.isPartial).length;
      audit.push(`Edge ${edge.id}: ${(edge.length_in / 12).toFixed(1)}ft → ${count} panels`);
    }
    const panelSku = heightFt >= 8 ? "WOOD_PANEL_8FT" : "WOOD_PANEL_6FT";
    bom.push(makeBomItem(panelSku, `Wood Privacy Panel ${heightFt}ft × 8ft`, "panels", "ea",
      Math.ceil(totalPanels * (1 + wastePct)), 0.95,
      `${totalPanels} sections + ${Math.round(wastePct * 100)}% waste`, p(panelSku)));
  }

  // Concrete + gravel
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(nodes, installRules, siteConfig, wastePct);
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${nodes.length} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor})`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base × ${nodes.length} posts`));

  // Fasteners
  const totalRails = railCutPlan.stockPiecesNeeded;
  bom.push(makeBomItem("SCREWS_1LB", "Screws (1lb box)", "hardware", "ea", Math.ceil(totalRails / 10), 0.90,
    `${totalRails} rails ÷ 10 rails per box`));

  // Gates
  const gateEdges = edges.filter(e => e.type === "gate");
  let singles = 0, doubles = 0;
  for (const g of gateEdges) {
    if (!g.gateSpec) continue;
    if (g.gateSpec.gateType === "single") singles++;
    else doubles++;
  }
  if (singles > 0) {
    bom.push(makeBomItem("GATE_WOOD_4FT", "Wood Walk Gate (single)", "gates", "ea", singles, 0.92, `${singles} single gates`, p("GATE_WOOD_4FT")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", singles * 2, 0.95, `2 pairs × ${singles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", singles, 0.95, `1 × ${singles}`, p("GATE_LATCH")));
  }
  if (doubles > 0) {
    bom.push(makeBomItem("GATE_WOOD_DBL", "Wood Double Drive Gate", "gates", "ea", doubles, 0.90, `${doubles} double gates`, p("GATE_WOOD_DBL")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", doubles * 4, 0.95, `2 pairs/leaf × 2 × ${doubles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", doubles * 2, 0.95, `1/leaf × ${doubles}`, p("GATE_LATCH")));
  }

  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", nodes.length, 0.90, `Wind mode: all posts`));
  }

  const totalSections = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const totalCuts = segEdges.reduce((s, e) => s + (e.sections?.filter(sec => sec.isPartial).length ?? 0), 0);
  const rackedSections = segEdges.filter(e => e.slopeMethod === "racked").reduce((s, e) => s + (e.sections?.length ?? 0), 0);

  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: nodes.length, rateHrs: 0.75, totalHrs: nodes.length * 0.75 },
    { activity: "Post Setting", count: nodes.length, rateHrs: 0.50, totalHrs: nodes.length * 0.50 },
    { activity: "Rail Installation", count: totalRails, rateHrs: 0.30, totalHrs: totalRails * 0.30 },
    { activity: "Board/Panel Nailing", count: totalSections || 1, rateHrs: 1.20, totalHrs: (totalSections || 1) * 1.20 },
    { activity: "Cutting Operations", count: totalCuts, rateHrs: 0.25, totalHrs: totalCuts * 0.25 },
    { activity: "Gate Installation", count: gateEdges.length, rateHrs: 2.00, totalHrs: gateEdges.length * 2.00 },
    { activity: "Racking (Field Fab)", count: rackedSections, rateHrs: 0.50, totalHrs: rackedSections * 0.50 },
    { activity: "Concrete Pour", count: nodes.length, rateHrs: 0.10, totalHrs: nodes.length * 0.10 },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
