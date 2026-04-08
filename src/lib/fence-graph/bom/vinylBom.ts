// ── Vinyl Fence BOM Generator ────────────────────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";
import { mergePrices } from "../pricing/defaultPrices";

export function generateVinylBom(
  graph: FenceGraph,
  wastePct: number,
  priceMap: Record<string, number> = {}
): { bom: BomItem[]; laborDrivers: LaborDriver[]; auditTrail: string[] } {
  const bom: BomItem[] = [];
  const audit: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  // Merge user prices with defaults (user prices override defaults)
  const prices = mergePrices(priceMap);
  const p = (sku: string) => prices[sku];

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");

  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  bom.push(makeBomItem("VINYL_POST_5X5", "Vinyl Post 5x5 10ft", "posts", "ea", nodes.length, 0.95,
    `${linePosts.length}L + ${endPosts.length}E + ${cornerPosts.length}C + ${gatePosts.length}G posts`, p("VINYL_POST_5X5")));
  bom.push(makeBomItem("VINYL_POST_CAP", "Vinyl Post Cap 5x5", "hardware", "ea", nodes.length, 0.95,
    `1 cap × ${nodes.length} posts`, p("VINYL_POST_CAP")));

  // Post sleeves (ground contact protection for posts in ground)
  const sleeveCount = nodes.filter(n => n.type !== "tie_in").length; // All posts except tie-ins go in ground
  bom.push(makeBomItem("POST_SLEEVE_5X5", "Vinyl Post Sleeve 48\" (ground contact)", "posts", "ea", sleeveCount, 0.98,
    `${sleeveCount} posts in ground (excludes tie-ins)`, p("POST_SLEEVE_5X5")));

  // Panels - determine if pre-fab or component-based system
  const segEdges = edges.filter(e => e.type === "segment");
  let totalPanels = 0, totalScrap = 0, totalCuts = 0;
  let totalLinearFeet = 0;
  let slopeAdjustmentFactor = 0;

  for (const edge of segEdges) {
    if (!edge.sections) continue;
    const count = countPanelsToBuy({ sections: edge.sections, totalScrap_in: 0, cutOperations: 0, score: 0, explanation: "" });
    totalPanels += count;
    totalScrap += edge.sections.reduce((s, sec) => s + sec.scrap_in, 0);
    totalCuts += edge.sections.filter(s => s.isPartial).length;
    totalLinearFeet += edge.length_in / 12;

    // Calculate slope adjustment for racked sections
    if (edge.slopeMethod === "racked" && edge.slopeDeg > 0) {
      const angleRad = (edge.slopeDeg * Math.PI) / 180;
      const hypotenuseMultiplier = 1 / Math.cos(angleRad);
      const sectionCount = edge.sections?.length ?? 0;
      slopeAdjustmentFactor += sectionCount * (hypotenuseMultiplier - 1);
      audit.push(`Edge ${edge.id}: ${edge.slopeDeg}° slope → ${(hypotenuseMultiplier * 100 - 100).toFixed(1)}% material increase`);
    }

    audit.push(`Edge ${edge.id}: ${(edge.length_in / 12).toFixed(1)}ft → ${count} panels`);
  }

  // Apply slope adjustment to panel count
  const slopeAdjustedPanels = Math.ceil(totalPanels + slopeAdjustmentFactor);

  // Component-based system: privacy fence with routed rails (pickets inserted individually)
  // Pre-fab system: picket fence or privacy with pre-assembled panels
  const isComponentSystem = productLine.panelStyle === "privacy" && productLine.railType === "routed";

  if (isComponentSystem) {
    // Component system: calculate individual pickets with slope adjustment
    const picketsPerFoot = 2; // Standard 6" on-center spacing
    const slopeAdjustedLF = totalLinearFeet * (1 + (slopeAdjustmentFactor / totalPanels));
    const picketCount = Math.ceil(slopeAdjustedLF * picketsPerFoot * (1 + wastePct + 0.05)); // +5% extra for damage

    const picketSku = productLine.panelHeight_in >= 96 ? "VINYL_PICKET_8FT" :
                      productLine.panelHeight_in >= 72 ? "VINYL_PICKET_6FT" : "VINYL_PICKET_4FT";

    const slopeNote = slopeAdjustmentFactor > 0 ? ` + ${(slopeAdjustmentFactor / totalPanels * 100).toFixed(0)}% slope adj` : "";
    bom.push(makeBomItem(
      picketSku,
      `Vinyl Privacy Picket ${productLine.panelHeight_in / 12}ft`,
      "pickets",
      "ea",
      picketCount,
      0.90,
      `${Math.round(totalLinearFeet)}ft × ${picketsPerFoot} pickets/ft${slopeNote} + ${Math.round((wastePct + 0.05) * 100)}% waste`,
      p(picketSku)
    ));

    // U-channel for picket retention (slides into routed rails)
    const channelLengthNeeded = slopeAdjustedLF * productLine.railCount;
    bom.push(makeBomItem(
      "VINYL_U_CHANNEL_8FT",
      "Vinyl U-Channel 8ft (picket retention)",
      "vinyl_hardware",
      "ea",
      Math.ceil(channelLengthNeeded / 8 * (1 + wastePct)),
      0.92,
      `${Math.round(channelLengthNeeded)}ft channel ÷ 8ft pieces + ${Math.round(wastePct * 100)}% waste`,
      p("VINYL_U_CHANNEL_8FT")
    ));

    audit.push(`Component system: ${picketCount} individual pickets (slope-adjusted), ${Math.ceil(channelLengthNeeded / 8)} U-channel pieces`);
  } else {
    // Pre-fab panels with slope adjustment
    const panelSku = productLine.panelHeight_in >= 96 ? "VINYL_PANEL_8FT" : "VINYL_PANEL_6FT";
    const finalPanelCount = Math.ceil(slopeAdjustedPanels * (1 + wastePct));
    const slopeNote = slopeAdjustmentFactor > 0 ? ` + ${Math.ceil(slopeAdjustmentFactor)} slope adj` : "";

    bom.push(makeBomItem(
      panelSku,
      `Vinyl ${productLine.panelStyle} Panel ${productLine.panelHeight_in / 12}ft`,
      "panels",
      "ea",
      finalPanelCount,
      0.95,
      `${totalPanels} sections${slopeNote} + ${Math.round(wastePct * 100)}% waste; ${totalScrap}" det. scrap`,
      p(panelSku)
    ));

    audit.push(`Pre-fab system: ${finalPanelCount} panels (${totalPanels} base + slope adj + waste)`);
  }

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

  // Concrete + gravel with slope and waste adjustments
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(nodes, installRules, siteConfig, wastePct);
  // Add slope adjustment: sloped installations need ~10% more concrete for proper setting
  const hasSlopedSections = segEdges.some(e => e.slopeDeg > 5);
  const slopeConcreteMultiplier = hasSlopedSections ? 1.10 : 1.0;
  // Add realistic waste factor for concrete (spillage, post wobble, field conditions)
  const concreteWasteFactor = 0.25; // 25% waste is industry standard
  const finalConcreteBags = Math.ceil(totalBags * slopeConcreteMultiplier * (1 + concreteWasteFactor));

  const slopeConcreteNote = hasSlopedSections ? " + 10% slope adj" : "";
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", finalConcreteBags, 0.95,
    `${nodes.length} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor})${slopeConcreteNote} + 25% waste`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base per post × ${nodes.length} posts`, p("GRAVEL_40LB")));

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
    bom.push(makeBomItem("GATE_STOP", "Gate Stop (pair)", "hardware", "ea", singles, 0.95, `1 pair × ${singles} gates`, p("GATE_STOP")));
  }
  if (doubles > 0) {
    bom.push(makeBomItem("GATE_VINYL_4FT", "Vinyl Drive Gate (double — 2× single)", "gates", "ea", doubles * 2, 0.90, `${doubles} double gates × 2 leaves`, p("GATE_VINYL_4FT")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", doubles * 4, 0.95, `2 pairs × 2 leaves × ${doubles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch (center)", "hardware", "ea", doubles, 0.95, `1 center latch × ${doubles} double gates`, p("GATE_LATCH")));
    bom.push(makeBomItem("DROP_ROD", "Drop Rod (cane bolt)", "hardware", "ea", doubles, 0.95, `1 × ${doubles} double gates (secures inactive leaf)`, p("DROP_ROD")));
    bom.push(makeBomItem("GATE_STOP", "Gate Stop (pair)", "hardware", "ea", doubles, 0.95, `1 pair × ${doubles} double gates`, p("GATE_STOP")));
  }
  if (poolGates > 0) {
    bom.push(makeBomItem("GATE_LATCH_POOL", "Pool-Code Self-Closing Latch (FL)", "hardware", "ea", poolGates, 0.95, `Florida pool code — ${poolGates} pool gates`, p("GATE_LATCH_POOL")));
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
  // Each section needs: ~20-25 screws (rail connections, panel attachments)
  // 1lb box ≈ 150 screws, so ~6 sections per box (conservative)
  const screwBoxes = Math.ceil(totalSections / 6 * (1 + wastePct));
  bom.push(makeBomItem("SCREWS_1LB", "Screws (1lb box ~150ct)", "hardware", "ea", screwBoxes, 0.90,
    `${totalSections} sections × ~25 screws/section ÷ 150/box + ${Math.round(wastePct * 100)}% waste`, p("SCREWS_1LB")));

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
