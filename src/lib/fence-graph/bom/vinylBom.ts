// ── Vinyl Fence BOM Generator ────────────────────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";

export function generateVinylBom(
  graph: FenceGraph,
  wastePct: number,
  priceMap: Record<string, number> = {}
): { bom: BomItem[]; laborDrivers: LaborDriver[]; auditTrail: string[] } {
  const bom: BomItem[] = [];
  const audit: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  const p = (sku: string) => priceMap[sku];

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");

  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  bom.push(makeBomItem("VINYL_POST_5X5", "Vinyl Post 5x5 10ft", "posts", "ea", nodes.length, 0.95,
    `${linePosts.length}L + ${endPosts.length}E + ${cornerPosts.length}C + ${gatePosts.length}G posts`, p("VINYL_POST_5X5")));
  bom.push(makeBomItem("VINYL_POST_CAP", "Vinyl Post Cap 5x5", "hardware", "ea", nodes.length, 0.95,
    `1 cap × ${nodes.length} posts`, p("VINYL_POST_CAP")));

  // Panels
  const segEdges = edges.filter(e => e.type === "segment");
  let totalPanels = 0, totalScrap = 0, totalCuts = 0;
  for (const edge of segEdges) {
    if (!edge.sections) continue;
    const count = countPanelsToBuy({ sections: edge.sections, totalScrap_in: 0, cutOperations: 0, score: 0, explanation: "" });
    totalPanels += count;
    totalScrap += edge.sections.reduce((s, sec) => s + sec.scrap_in, 0);
    totalCuts += edge.sections.filter(s => s.isPartial).length;
    audit.push(`Edge ${edge.id}: ${(edge.length_in / 12).toFixed(1)}ft → ${count} panels`);
  }
  const panelSku = productLine.panelHeight_in >= 90 ? "VINYL_PANEL_8FT" : "VINYL_PANEL_6FT";
  bom.push(makeBomItem(panelSku, `Vinyl Privacy Panel ${productLine.panelHeight_in / 12}ft`, "panels", "ea",
    Math.ceil(totalPanels * (1 + wastePct)), 0.95,
    `${totalPanels} sections + ${Math.round(wastePct * 100)}% waste; ${totalScrap}"  det. scrap`, p(panelSku)));

  // Rails — cutting-stock optimizer
  const railLengths_ft = segEdges.map(e => e.length_in / 12);
  const railCutPlan = cuttingStockOptimizer(railLengths_ft.flatMap(l => Array(productLine.railCount).fill(l)), 8, wastePct);
  bom.push(makeBomItem("VINYL_RAIL_8FT", "Vinyl Rail 8ft", "rails", "ea", railCutPlan.stockPiecesNeeded, 0.92,
    railCutPlan.explanation, p("VINYL_RAIL_8FT")));

  // Rail brackets — only for plain-rail (picket) systems; routed privacy rails slot into posts (no brackets)
  // Each section has railCount rails, each rail needs 2 brackets (one at each post end)
  if (productLine.railType === "plain") {
    const totalSectionsForBrackets = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
    const bracketCount = totalSectionsForBrackets * productLine.railCount * 2;
    bom.push(makeBomItem("VINYL_RAIL_BRACKET", "Vinyl Rail Bracket (L-bracket)", "vinyl_hardware", "ea",
      bracketCount, 0.98,
      `${totalSectionsForBrackets} sections × ${productLine.railCount} rails × 2 ends (plain-rail system)`, p("VINYL_RAIL_BRACKET")));
    audit.push(`Vinyl picket plain-rail: ${bracketCount} L-brackets needed`);
  }

  // Concrete + gravel
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(nodes, installRules, siteConfig, wastePct);
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${nodes.length} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor})`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base per post × ${nodes.length} posts`));

  // Gates
  const gateEdges = edges.filter(e => e.type === "gate");
  let singles = 0, doubles = 0, poolGates = 0;
  for (const g of gateEdges) {
    if (!g.gateSpec) continue;
    if (g.gateSpec.gateType === "single") singles++;
    else doubles++;
    if (g.gateSpec.isPoolGate) poolGates++;
  }
  if (singles > 0) {
    bom.push(makeBomItem("GATE_VINYL_4FT", "Vinyl Walk Gate", "gates", "ea", singles, 0.92, `${singles} single gates`, p("GATE_VINYL_4FT")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", singles * 2, 0.95, `2 pairs × ${singles} gates`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", singles, 0.95, `1 × ${singles} single gates`, p("GATE_LATCH")));
  }
  if (doubles > 0) {
    bom.push(makeBomItem("GATE_VINYL_4FT", "Vinyl Drive Gate (double — 2× single)", "gates", "ea", doubles * 2, 0.90, `${doubles} double gates × 2 leaves`, p("GATE_VINYL_4FT")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", doubles * 4, 0.95, `2 pairs × 2 leaves × ${doubles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", doubles * 2, 0.95, `1 per leaf × ${doubles} doubles`, p("GATE_LATCH")));
  }
  if (poolGates > 0) {
    bom.push(makeBomItem("GATE_LATCH", "Pool-Code Self-Closing Latch (FL)", "hardware", "ea", poolGates, 0.95, `Florida pool code — ${poolGates} pool gates`, p("GATE_LATCH")));
  }

  // Reinforcement
  const reinforced = nodes.filter(n => n.reinforced);
  if (reinforced.length > 0) {
    bom.push(makeBomItem("ALUM_INSERT", "Aluminum Post Insert", "hardware", "ea", reinforced.length, 0.90, `${reinforced.length} reinforced posts`));
  }
  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", nodes.length, 0.90, `Wind mode: all ${nodes.length} posts`));
  }

  // Fasteners
  const totalSections = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  bom.push(makeBomItem("SCREWS_1LB", "Screws (1lb box)", "hardware", "ea", Math.ceil(totalSections / 8), 0.90, `${totalSections} sections ÷ 8 per box`));

  // Labor
  const rackedSections = segEdges.filter(e => e.slopeMethod === "racked").reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: nodes.length, rateHrs: 0.75, totalHrs: nodes.length * 0.75 },
    { activity: "Post Setting", count: nodes.length, rateHrs: 0.50, totalHrs: nodes.length * 0.50 },
    { activity: "Section Installation", count: totalSections, rateHrs: 1.50, totalHrs: totalSections * 1.50 },
    { activity: "Cutting Operations", count: totalCuts, rateHrs: 0.25, totalHrs: totalCuts * 0.25 },
    { activity: "Gate Installation", count: gateEdges.length, rateHrs: 2.00, totalHrs: gateEdges.length * 2.00 },
    { activity: "Racking (Field Fab)", count: rackedSections, rateHrs: 0.50, totalHrs: rackedSections * 0.50 },
    { activity: "Concrete Pour", count: nodes.length, rateHrs: 0.10, totalHrs: nodes.length * 0.10 },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
