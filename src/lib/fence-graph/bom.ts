// ── BOM Generator ────────────────────────────────────────────────
// Transforms a FenceGraph into a traceable Bill of Materials.
// Every quantity has an explanation of exactly why it's there.

import type {
  FenceGraph, FenceNode, FenceEdge, BomItem,
  LaborDriver, FenceEstimateResult,
} from "./types";
import { calcTotalConcrete } from "./concrete";
import { countPanelsToBuy } from "./segmentation";

const WASTE_PCT_DEFAULT = 0.05;

// Labor rates (hours per unit of activity)
const LABOR_RATES = {
  hole_digging: { rateHrs: 0.75, unit: "holes", label: "Hole Digging" },
  post_setting: { rateHrs: 0.50, unit: "posts", label: "Post Setting" },
  section_install: { rateHrs: 1.50, unit: "sections", label: "Section Installation" },
  cutting_ops: { rateHrs: 0.25, unit: "cuts", label: "Cutting Operations" },
  gate_install: { rateHrs: 2.00, unit: "gates", label: "Gate Installation" },
  racking: { rateHrs: 0.50, unit: "racked sections", label: "Racking (Field Fabrication)" },
  concrete_pour: { rateHrs: 0.10, unit: "posts", label: "Concrete Pour" },
  tieIn_drill: { rateHrs: 1.00, unit: "tie-ins", label: "Masonry Tie-In Drilling" },
};

function makeBomItem(
  sku: string, name: string, category: string, unit: string,
  qty: number, confidence: number, traceability: string,
  unitCost?: number
): BomItem {
  return {
    sku, name, category, unit,
    qty: Math.ceil(qty),
    unitCost,
    extCost: unitCost ? Math.ceil(qty) * unitCost : undefined,
    confidence,
    traceability,
  };
}

export function generateBom(
  graph: FenceGraph,
  laborRatePerHr = 65,
  wastePct = WASTE_PCT_DEFAULT
): FenceEstimateResult {
  const bom: BomItem[] = [];
  const auditTrail: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  // ── Count post types ────────────────────────────────────────────
  const linePosts = nodes.filter((n) => n.type === "line");
  const endPosts = nodes.filter((n) => n.type === "end");
  const cornerPosts = nodes.filter((n) => n.type === "corner");
  const gateHinge = nodes.filter((n) => n.type === "gate_hinge");
  const gateLatch = nodes.filter((n) => n.type === "gate_latch");
  const tieIn = nodes.filter((n) => n.type === "tie_in");
  const allGatePosts = [...gateHinge, ...gateLatch];
  const allPosts = nodes;

  const postSku = productLine.postSize === "5x5" ? "VINYL_POST_5X5" : "VINYL_POST_4X4";
  const postName = productLine.postSize === "5x5" ? "Vinyl Post 5x5 10ft" : "Vinyl Post 4x4 8ft";
  const postCapSku = productLine.postSize === "5x5" ? "VINYL_POST_CAP_5X5" : "VINYL_POST_CAP_4X4";

  auditTrail.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${allGatePosts.length} gate = ${allPosts.length} total`);

  bom.push(makeBomItem(
    postSku, postName, "posts", "ea", allPosts.length, 0.95,
    `${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${allGatePosts.length} gate posts`
  ));

  bom.push(makeBomItem(
    postCapSku, `Vinyl Post Cap ${productLine.postSize}`, "hardware", "ea",
    allPosts.length, 0.95,
    `1 cap per post × ${allPosts.length} posts`
  ));

  // ── Panels ──────────────────────────────────────────────────────
  const segmentEdges = edges.filter((e) => e.type === "segment");
  let totalPanelsToBuy = 0;
  let totalScrap_in = 0;
  let totalCutOps = 0;

  for (const edge of segmentEdges) {
    if (!edge.sections) continue;
    const panelCount = countPanelsToBuy({ sections: edge.sections, totalScrap_in: 0, cutOperations: 0, score: 0, explanation: "" });
    totalPanelsToBuy += panelCount;
    totalScrap_in += edge.sections.reduce((s, sec) => s + sec.scrap_in, 0);
    totalCutOps += edge.sections.filter((s) => s.isPartial).length;
    auditTrail.push(`Edge ${edge.id}: ${(edge.length_in / 12).toFixed(1)}ft → ${panelCount} panels (${edge.sections.filter(s => s.isPartial).length} partial)`);
  }

  const panelSku = `VINYL_PANEL_${productLine.panelHeight_in === 72 ? "6FT" : productLine.panelHeight_in === 96 ? "8FT" : "6FT"}`;
  const panelName = `Vinyl Privacy Panel ${productLine.panelHeight_in / 12}ft × 8ft`;

  bom.push(makeBomItem(
    panelSku, panelName, "panels", "ea",
    Math.ceil(totalPanelsToBuy * (1 + wastePct)), 0.95,
    `${totalPanelsToBuy} sections (${totalScrap_in}" deterministic scrap) + ${Math.round(wastePct * 100)}% waste`
  ));

  // ── Concrete + Gravel ──────────────────────────────────────────
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(
    allPosts, installRules, siteConfig, wastePct
  );

  bom.push(makeBomItem(
    "CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${allPosts.length} posts × ~${perPostCalc.bagsNeeded} bags (vol: ${perPostCalc.concreteVolume_cu_ft.toFixed(3)} cu ft each, soil factor ${siteConfig.soilConcreteFactor}×) + ${Math.round(wastePct * 100)}% waste`
  ));

  bom.push(makeBomItem(
    "GRAVEL_40LB", "Gravel Drainage Bag 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base per post hole (${allPosts.length} posts)`
  ));

  // ── Gates ──────────────────────────────────────────────────────
  const gateEdges = edges.filter((e) => e.type === "gate");
  let singleGates = 0, doubleGates = 0, poolGates = 0;

  for (const gate of gateEdges) {
    if (!gate.gateSpec) continue;
    if (gate.gateSpec.gateType === "single") singleGates++;
    else doubleGates++;
    if (gate.gateSpec.isPoolGate) poolGates++;
  }

  if (singleGates > 0) {
    bom.push(makeBomItem("GATE_VINYL_SINGLE", "Vinyl Walk Gate (single)", "gates", "ea", singleGates, 0.92, `${singleGates} single gate(s) from run input`));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", singleGates * 2, 0.95, `2 hinge pairs per single gate × ${singleGates}`));
    bom.push(makeBomItem("GATE_LATCH_STD", "Gate Latch (standard)", "hardware", "ea", singleGates, 0.95, `1 latch per single gate × ${singleGates}`));
  }

  if (doubleGates > 0) {
    bom.push(makeBomItem("GATE_VINYL_DOUBLE", "Vinyl Drive Gate (double)", "gates", "ea", doubleGates, 0.90, `${doubleGates} double gate(s) from run input`));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", doubleGates * 4, 0.95, `2 hinge pairs per leaf × 2 leaves × ${doubleGates} double gates`));
    bom.push(makeBomItem("GATE_LATCH_STD", "Gate Latch", "hardware", "ea", doubleGates * 2, 0.95, `1 latch per leaf × ${doubleGates} double gates`));
    bom.push(makeBomItem("DROP_ROD", "Drop Rod / Cane Bolt", "hardware", "ea", doubleGates, 0.95, `Required for all double gates to secure inactive leaf`));
  }

  if (poolGates > 0) {
    bom.push(makeBomItem("GATE_LATCH_POOL", "Pool-Code Self-Closing Latch (FL code)", "hardware", "ea", poolGates, 0.95, `Florida pool code: self-closing, self-latching, 54"+ height latch — ${poolGates} pool gate(s)`));
  }

  // ── Aluminum inserts for reinforced posts ──────────────────────
  const reinforcedPosts = allPosts.filter((n) => n.reinforced);
  if (reinforcedPosts.length > 0) {
    bom.push(makeBomItem(
      "ALUM_INSERT", "Aluminum Post Insert (reinforcement)", "hardware", "ea",
      reinforcedPosts.length, 0.90,
      `${reinforcedPosts.length} reinforced posts (corner/gate/end${windMode ? "/wind mode" : ""})`
    ));
  }

  // ── Wind kit extras ────────────────────────────────────────────
  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", allPosts.length, 0.90, `Wind mode: 1 rebar per post for all ${allPosts.length} posts`));
    auditTrail.push("Wind mode active: aluminum inserts + rebar added to all posts; hole depth = 36\" min");
  }

  // ── Masonry tie-ins ────────────────────────────────────────────
  if (tieIn.length > 0) {
    bom.push(makeBomItem("TAPCON_SCREWS", "Tapcon Screws #14×3\" (10-pack)", "hardware", "ea", Math.ceil(tieIn.length * 0.5), 0.80, `${tieIn.length} masonry tie-in posts × ~5 screws each`));
    bom.push(makeBomItem("ANCHOR_BRACKET", "Masonry Anchor Bracket", "hardware", "ea", tieIn.length, 0.80, `1 bracket per tie-in post × ${tieIn.length}`));
  }

  // ── Fasteners ──────────────────────────────────────────────────
  const totalSections = segmentEdges.reduce((sum, e) => sum + (e.sections?.length ?? 0), 0);
  const fastenerBoxes = Math.ceil(totalSections / 8); // ~50 screws per section, 400/box
  bom.push(makeBomItem("SCREWS_2_5", "Screws 2.5\" #8 (400-count box)", "hardware", "ea", fastenerBoxes, 0.90, `${totalSections} sections ÷ 8 sections per box`));

  // ── Labor Drivers ──────────────────────────────────────────────
  const rackedSections = segmentEdges.filter((e) => e.slopeMethod === "racked").reduce((sum, e) => sum + (e.sections?.length ?? 0), 0);

  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: allPosts.length, rateHrs: 0.75, totalHrs: allPosts.length * 0.75, notes: "45 min avg per post" },
    { activity: "Post Setting", count: allPosts.length, rateHrs: 0.50, totalHrs: allPosts.length * 0.50, notes: "Plumb + brace" },
    { activity: "Section Installation", count: totalSections + gateEdges.length, rateHrs: 1.50, totalHrs: (totalSections + gateEdges.length) * 1.50, notes: "Rails + panels + fasteners + trim" },
    { activity: "Cutting Operations", count: totalCutOps, rateHrs: 0.25, totalHrs: totalCutOps * 0.25, notes: "Each partial panel requires a cut" },
    { activity: "Gate Installation", count: gateEdges.length, rateHrs: 2.00, totalHrs: gateEdges.length * 2.00, notes: "Hang, adjust, test" },
    { activity: "Racking (Field Fab)", count: rackedSections, rateHrs: 0.50, totalHrs: rackedSections * 0.50, notes: "Angled panel installation" },
    { activity: "Concrete Pour", count: allPosts.length, rateHrs: 0.10, totalHrs: allPosts.length * 0.10, notes: "Batch mixing" },
    ...(tieIn.length > 0 ? [{ activity: "Masonry Tie-In Drilling", count: tieIn.length, rateHrs: 1.00, totalHrs: tieIn.length * 1.00, notes: "Masonry anchor drilling" }] : []),
  ];

  const totalLaborHrs = laborDrivers.reduce((s, l) => s + l.totalHrs, 0);
  const totalLaborCost = Math.round(totalLaborHrs * laborRatePerHr);
  const totalMaterialCost = bom.reduce((s, item) => s + (item.extCost ?? 0), 0);
  const redFlagItems = bom.filter((item) => item.confidence < 0.80);
  const overallConfidence = bom.reduce((s, item) => s + item.confidence, 0) / bom.length;

  return {
    projectId: graph.projectId,
    projectName: "Estimate",
    graph,
    bom,
    laborDrivers,
    totalMaterialCost,
    totalLaborHrs: Math.round(totalLaborHrs * 10) / 10,
    totalLaborCost,
    totalCost: totalMaterialCost + totalLaborCost,
    deterministicScrap_in: totalScrap_in,
    probabilisticWastePct: wastePct,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    redFlagItems,
    auditTrail,
  };
}
