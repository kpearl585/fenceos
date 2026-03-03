// ── Chain Link Fence BOM Generator ──────────────────────────────
// Chain link is fundamentally different from panel fences:
// - No segmentation optimizer (fabric/rail is LF-based)
// - Line posts at 8–10ft OC (not 8ft panel modules)
// - Terminal posts (end/corner/gate) are larger gauge
// - Top rail is continuous lineal material → cutting-stock optimizer
// - Tension wire around perimeter
// - Tie wire to attach fabric to posts and top rail

import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { makeBomItem, cuttingStockOptimizer } from "./shared";

const LINE_POST_OC_FT = 10; // line posts every 10ft (standard residential)
const TOP_RAIL_STOCK_FT = 21; // standard top rail length sold in 21ft sections
const TENSION_WIRE_SPOOL_FT = 150; // 1 spool covers 150 LF
const TIE_WIRE_BOX_USES = 200; // 1 box ≈ 200 tie points

export function generateChainLinkBom(
  graph: FenceGraph,
  wastePct: number,
  priceMap: Record<string, number> = {}
): { bom: BomItem[]; laborDrivers: LaborDriver[]; auditTrail: string[] } {
  const bom: BomItem[] = [];
  const audit: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  const p = (sku: string) => priceMap[sku];
  const heightFt = productLine.panelHeight_in / 12;
  const fabricSku = heightFt > 4 ? "CL_FABRIC_6FT" : "CL_FABRIC_4FT";
  const fabricName = heightFt > 4 ? "Chain Link Fabric 6ft" : "Chain Link Fabric 4ft";

  const segEdges = edges.filter(e => e.type === "segment");
  const gateEdges = edges.filter(e => e.type === "gate");

  // Total LF across all runs
  const totalLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
  audit.push(`Total run LF: ${totalLF.toFixed(1)}ft across ${segEdges.length} segments`);

  // Post counts
  const terminalPosts = nodes.filter(n =>
    n.type === "end" || n.type === "corner" || n.type === "gate_hinge" || n.type === "gate_latch"
  );
  // Line posts: independently calculated from run LF (not from FenceGraph line nodes)
  // because chain link uses 10ft OC, not panel-width OC
  const linePostCount = segEdges.reduce((count, edge) => {
    const runLF = edge.length_in / 12;
    const interior = Math.max(0, Math.floor(runLF / LINE_POST_OC_FT) - 1);
    return count + interior;
  }, 0);

  const totalPostCount = terminalPosts.length + linePostCount;
  audit.push(`Posts: ${terminalPosts.length} terminal + ${linePostCount} line (${LINE_POST_OC_FT}ft OC) = ${totalPostCount} total`);

  bom.push(makeBomItem("CL_POST_TERM", "Chain Link Terminal Post 2.5\" × 8ft", "posts", "ea", terminalPosts.length, 0.95,
    `${terminalPosts.length} terminal posts (end/corner/gate)`, p("CL_POST_TERM")));
  bom.push(makeBomItem("CL_POST_2IN", "Chain Link Line Post 2\" × 8ft", "posts", "ea",
    Math.ceil(linePostCount * (1 + wastePct)), 0.92,
    `${linePostCount} line posts at ${LINE_POST_OC_FT}ft OC + waste`, p("CL_POST_2IN")));

  // Fabric — sold by the linear foot
  const fabricLF = Math.ceil(totalLF * (1 + wastePct));
  bom.push(makeBomItem(fabricSku, fabricName, "fabric", "ft",
    fabricLF, 0.95,
    `${totalLF.toFixed(1)} LF + ${Math.round(wastePct * 100)}% waste`, p(fabricSku)));

  // Top rail — cutting-stock optimizer using actual run lengths
  const runLengths_ft = segEdges.map(e => e.length_in / 12);
  const railCutPlan = cuttingStockOptimizer(runLengths_ft, TOP_RAIL_STOCK_FT, wastePct);
  bom.push(makeBomItem("CL_TOPRAIL", "Chain Link Top Rail 21ft", "rails", "ea",
    railCutPlan.stockPiecesNeeded, 0.92,
    railCutPlan.explanation, p("CL_TOPRAIL")));
  audit.push(`Top rail: ${railCutPlan.explanation}`);

  // Tension wire — 1 spool per 150 LF of perimeter
  const tensionSpools = Math.max(1, Math.ceil(totalLF / TENSION_WIRE_SPOOL_FT));
  bom.push(makeBomItem("CL_TENSION_WIRE", "Tension Wire (150ft spool)", "hardware", "ea", tensionSpools, 0.90,
    `${totalLF.toFixed(1)} LF ÷ ${TENSION_WIRE_SPOOL_FT}ft per spool`, p("CL_TENSION_WIRE")));

  // Tie wire / staples — attach fabric to posts and top rail
  const tiePoints = totalPostCount + Math.ceil(totalLF / TOP_RAIL_STOCK_FT * 5); // ~5 tie points per rail section
  bom.push(makeBomItem("STAPLES_1LB", "Tie Wire Box", "hardware", "ea",
    Math.max(1, Math.ceil(tiePoints / TIE_WIRE_BOX_USES)), 0.85,
    `~${tiePoints} tie points ÷ ${TIE_WIRE_BOX_USES} per box`));

  // Concrete + gravel — uses adjusted install rules for terminal vs line posts
  const allNodes = [
    ...Array(terminalPosts.length).fill({ type: "end", reinforced: false }),
    ...Array(linePostCount).fill({ type: "line", reinforced: false }),
  ] as typeof nodes;
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(
    allNodes, installRules, siteConfig, wastePct
  );
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${totalPostCount} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor})`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base × ${totalPostCount} posts`));

  // Gates
  let singles = 0, doubles = 0;
  for (const g of gateEdges) {
    if (!g.gateSpec) continue;
    if (g.gateSpec.gateType === "single") singles++;
    else doubles++;
  }
  if (singles > 0) {
    bom.push(makeBomItem("GATE_CL_4FT", "Chain Link Walk Gate", "gates", "ea", singles, 0.92, `${singles} single gates`, p("GATE_CL_4FT")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", singles * 2, 0.95, `2 pairs × ${singles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", singles, 0.95, `1 × ${singles}`, p("GATE_LATCH")));
  }
  if (doubles > 0) {
    bom.push(makeBomItem("GATE_CL_DBL", "Chain Link Double Drive Gate", "gates", "ea", doubles, 0.90, `${doubles} double gates`, p("GATE_CL_DBL")));
    bom.push(makeBomItem("HINGE_HD", "Heavy Duty Hinge (pair)", "hardware", "ea", doubles * 4, 0.95, `2 pairs/leaf × ${doubles}`, p("HINGE_HD")));
    bom.push(makeBomItem("GATE_LATCH", "Gate Latch", "hardware", "ea", doubles * 2, 0.95, `1/leaf × ${doubles}`, p("GATE_LATCH")));
  }

  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", terminalPosts.length, 0.90, `Wind mode: terminal posts only`));
  }

  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: totalPostCount, rateHrs: 0.75, totalHrs: totalPostCount * 0.75 },
    { activity: "Post Setting", count: totalPostCount, rateHrs: 0.50, totalHrs: totalPostCount * 0.50 },
    { activity: "Top Rail Installation", count: railCutPlan.stockPiecesNeeded, rateHrs: 0.40, totalHrs: railCutPlan.stockPiecesNeeded * 0.40 },
    { activity: "Fabric Unrolling & Stretching", count: segEdges.length, rateHrs: 2.00, totalHrs: segEdges.length * 2.00, notes: "Per run" },
    { activity: "Gate Installation", count: gateEdges.length, rateHrs: 2.00, totalHrs: gateEdges.length * 2.00 },
    { activity: "Tie Wire / Fastening", count: totalPostCount, rateHrs: 0.20, totalHrs: totalPostCount * 0.20 },
    { activity: "Concrete Pour", count: totalPostCount, rateHrs: 0.10, totalHrs: totalPostCount * 0.10 },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
