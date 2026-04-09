// ── Aluminum / Ornamental Fence BOM Generator ────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";
import { mergePrices } from "../pricing/defaultPrices";
import { calculateAllGateCosts } from "../gatePricing";

export function generateAluminumBom(
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
  const heightFt = productLine.panelHeight_in / 12;

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");
  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  bom.push(makeBomItem("ALUM_POST_2X2", "Aluminum Post 2×2 × 8ft", "posts", "ea", nodes.length, 0.95,
    `${nodes.length} posts`, p("ALUM_POST_2X2")));
  bom.push(makeBomItem("ALUM_POST_CAP", "Aluminum Post Cap", "hardware", "ea", nodes.length, 0.95,
    `1 cap × ${nodes.length} posts`, p("ALUM_POST_CAP")));

  // Panels
  const segEdges = edges.filter(e => e.type === "segment");
  let totalPanels = 0, totalCuts = 0, totalScrap = 0;
  for (const edge of segEdges) {
    if (!edge.sections) continue;
    const count = countPanelsToBuy({ sections: edge.sections, totalScrap_in: 0, cutOperations: 0, score: 0, explanation: "" });
    totalPanels += count;
    totalCuts += edge.sections.filter(s => s.isPartial).length;
    totalScrap += edge.sections.reduce((s, sec) => s + sec.scrap_in, 0);
    audit.push(`Edge ${edge.id}: ${(edge.length_in / 12).toFixed(1)}ft → ${count} panels`);
  }
  const panelSku = heightFt > 4 ? "ALUM_PANEL_6FT" : "ALUM_PANEL_4FT";
  const panelName = `Aluminum Panel ${heightFt}ft × 8ft`;
  bom.push(makeBomItem(panelSku, panelName, "panels", "ea",
    Math.ceil(totalPanels * (1 + wastePct)), 0.95,
    `${totalPanels} sections + ${Math.round(wastePct * 100)}% waste; ${totalScrap}" det. scrap`, p(panelSku)));

  // Flat rails — cutting-stock optimizer
  // Aluminum panels typically need 2 flat rails (top + bottom connectors)
  const railLengths = segEdges.map(e => e.length_in / 12);
  const allRailLengths = railLengths.flatMap(l => [l, l]); // top + bottom rail per span
  const railCutPlan = cuttingStockOptimizer(allRailLengths, 8, wastePct);
  bom.push(makeBomItem("ALUM_RAIL_FLAT", "Aluminum Flat Rail 8ft", "rails", "ea", railCutPlan.stockPiecesNeeded, 0.92,
    `2 rails/span × ${railCutPlan.explanation}`, p("ALUM_RAIL_FLAT")));

  // Concrete + gravel
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(nodes, installRules, siteConfig, wastePct);
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${nodes.length} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor})`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base × ${nodes.length} posts`));

  // Gates (deterministic pricing engine)
  const gateEdges = edges.filter(e => e.type === "gate");
  const gateSpecs = gateEdges.map(e => e.gateSpec).filter(spec => spec !== undefined);
  let totalGateLaborHours = 0;

  if (gateSpecs.length > 0) {
    const gateCosts = calculateAllGateCosts(gateSpecs, "aluminum", prices, 65);

    // Aggregate by SKU using Map
    const gateSkuMap = new Map<string, { qty: number; desc: string; unitCost: number }>();

    for (const gateCost of gateCosts.gates) {
      const hw = gateCost.hardware;

      // Gate (single 4ft or double set)
      const gateKey = hw.gateSku;
      if (!gateSkuMap.has(gateKey)) {
        const gateDesc = hw.gateQty === 2 ? "Aluminum Gate (double — 2× single)" : "Aluminum Walk Gate";
        gateSkuMap.set(gateKey, { qty: 0, desc: gateDesc, unitCost: hw.gateUnitPrice });
      }
      gateSkuMap.get(gateKey)!.qty += hw.gateQty;

      // Hinges
      const hingeKey = hw.hingeSku;
      if (!gateSkuMap.has(hingeKey)) {
        gateSkuMap.set(hingeKey, { qty: 0, desc: "Heavy Duty Hinge (pair)", unitCost: hw.hingeUnitPrice });
      }
      gateSkuMap.get(hingeKey)!.qty += hw.hingeQty;

      // Latch
      const latchKey = hw.latchSku;
      if (!gateSkuMap.has(latchKey)) {
        const latchDesc = hw.latchSku === "GATE_LATCH_POOL" ? "Pool Gate Latch (self-closing)" : "Gate Latch";
        gateSkuMap.set(latchKey, { qty: 0, desc: latchDesc, unitCost: hw.latchUnitPrice });
      }
      gateSkuMap.get(latchKey)!.qty += hw.latchQty;

      // Gate stop
      if (hw.stopSku && hw.stopQty) {
        const stopKey = hw.stopSku;
        if (!gateSkuMap.has(stopKey)) {
          gateSkuMap.set(stopKey, { qty: 0, desc: "Gate Stop (pair)", unitCost: hw.stopUnitPrice! });
        }
        gateSkuMap.get(stopKey)!.qty += hw.stopQty;
      }

      // Drop rod (for double gates)
      if (hw.dropRodSku && hw.dropRodQty) {
        const dropKey = hw.dropRodSku;
        if (!gateSkuMap.has(dropKey)) {
          gateSkuMap.set(dropKey, { qty: 0, desc: "Drop Rod (cane bolt)", unitCost: hw.dropRodUnitPrice! });
        }
        gateSkuMap.get(dropKey)!.qty += hw.dropRodQty;
      }

      // Spring closer
      if (hw.springCloserSku && hw.springCloserQty) {
        const springKey = hw.springCloserSku;
        if (!gateSkuMap.has(springKey)) {
          gateSkuMap.set(springKey, { qty: 0, desc: "Spring Closer (pool code)", unitCost: hw.springCloserUnitPrice! });
        }
        gateSkuMap.get(springKey)!.qty += hw.springCloserQty;
      }

      totalGateLaborHours += gateCost.laborHours;
    }

    // Add aggregated BOM items
    for (const [sku, data] of Array.from(gateSkuMap)) {
      bom.push(makeBomItem(sku, data.desc, "gates", "ea", data.qty, 0.95, `${gateSpecs.length} gates`, data.unitCost));
    }

    audit.push(`Gates: ${gateSpecs.length} total (deterministic pricing: $${gateCosts.totalMaterial.toFixed(2)} material, ${totalGateLaborHours}hrs labor)`);
  }

  // Set screws — lock panels to posts (4 per post; standard aluminum fence installation)
  bom.push(makeBomItem("ALUM_SET_SCREW", "Aluminum Fence Set Screw #14", "alum_hardware", "ea",
    nodes.length * 4, 0.98,
    `4 set screws per post × ${nodes.length} posts`, p("ALUM_SET_SCREW")));
  audit.push(`Aluminum set screws: ${nodes.length * 4} (${nodes.length} posts × 4)`);

  // Reinforcement
  if (windMode) {
    bom.push(makeBomItem("ALUM_INSERT", "Aluminum Post Insert", "hardware", "ea", nodes.length, 0.90, `Wind mode: all posts`));
  }

  const totalSections = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const rackedSections = segEdges.filter(e => e.slopeMethod === "racked").reduce((s, e) => s + (e.sections?.length ?? 0), 0);

  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: nodes.length, rateHrs: 0.75, totalHrs: nodes.length * 0.75 },
    { activity: "Post Setting", count: nodes.length, rateHrs: 0.50, totalHrs: nodes.length * 0.50 },
    { activity: "Panel + Rail Installation", count: totalSections, rateHrs: 1.25, totalHrs: totalSections * 1.25, notes: "Aluminum faster than vinyl — no routing" },
    { activity: "Cutting Operations", count: totalCuts, rateHrs: 0.20, totalHrs: totalCuts * 0.20, notes: "Aluminum cuts fast with chop saw" },
    { activity: "Gate Installation", count: gateSpecs.length, rateHrs: 0, totalHrs: totalGateLaborHours },
    { activity: "Racking (Field Fab)", count: rackedSections, rateHrs: 0.40, totalHrs: rackedSections * 0.40 },
    { activity: "Concrete Pour", count: nodes.length, rateHrs: 0.10, totalHrs: nodes.length * 0.10 },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
