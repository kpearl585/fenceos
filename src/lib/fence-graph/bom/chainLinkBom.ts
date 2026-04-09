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
import { mergePrices } from "../pricing/defaultPrices";
import { calculateAllGateCosts } from "../gatePricing";

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

  // Merge user prices with defaults (user prices override defaults)
  const prices = mergePrices(priceMap);
  const p = (sku: string) => prices[sku];
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
    `~${tiePoints} tie points ÷ ${TIE_WIRE_BOX_USES} per box`, p("STAPLES_1LB")));

  // ── Terminal post hardware (tension bars, tension bands, brace bands, rail ends) ──
  // Each terminal post needs:
  //   1 tension bar (fabric termination)
  //   3-4 tension bands (clamp tension bar to post; 3 for 4ft, 4 for 6ft)
  //   2 brace bands (hold top rail at end posts)
  //   1 rail end fitting (where top rail meets terminal post)
  const tensionBandsPerPost = heightFt > 4 ? 4 : 3;
  bom.push(makeBomItem("CL_TENSION_BAR", "Chain Link Tension Bar", "cl_hardware", "ea",
    terminalPosts.length, 0.98,
    `1 per terminal post × ${terminalPosts.length} terminal posts`, p("CL_TENSION_BAR")));
  bom.push(makeBomItem("CL_TENSION_BAND", "Chain Link Tension Band", "cl_hardware", "ea",
    terminalPosts.length * tensionBandsPerPost, 0.98,
    `${tensionBandsPerPost} per terminal post × ${terminalPosts.length} (${heightFt}ft fence)`, p("CL_TENSION_BAND")));
  bom.push(makeBomItem("CL_BRACE_BAND", "Chain Link Brace Band", "cl_hardware", "ea",
    terminalPosts.length * 2, 0.98,
    `2 per terminal post × ${terminalPosts.length}`, p("CL_BRACE_BAND")));
  bom.push(makeBomItem("CL_RAIL_END", "Chain Link Rail End Fitting", "cl_hardware", "ea",
    terminalPosts.length, 0.98,
    `1 per terminal post × ${terminalPosts.length}`, p("CL_RAIL_END")));

  // ── Line post hardware (loop caps hold top rail on each line post) ──
  bom.push(makeBomItem("CL_LOOP_CAP", "Chain Link Loop Cap", "cl_hardware", "ea",
    linePostCount, 0.98,
    `1 per line post × ${linePostCount} line posts`, p("CL_LOOP_CAP")));
  audit.push(`CL terminal hardware: ${terminalPosts.length} tension bars, ${terminalPosts.length * tensionBandsPerPost} tension bands, ${terminalPosts.length * 2} brace bands, ${terminalPosts.length} rail ends`);

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
    `4" gravel base × ${totalPostCount} posts`, p("GRAVEL_40LB")));

  // Gates (deterministic pricing engine)
  const gateSpecs = gateEdges.map(e => e.gateSpec).filter(spec => spec !== undefined);
  let totalGateLaborHours = 0;

  if (gateSpecs.length > 0) {
    const gateCosts = calculateAllGateCosts(gateSpecs, "chain_link", prices, 65);

    // Aggregate by SKU using Map
    const gateSkuMap = new Map<string, { qty: number; desc: string; unitCost: number }>();

    for (const gateCost of gateCosts.gates) {
      const hw = gateCost.hardware;

      // Gate (single 4ft or double set)
      const gateKey = hw.gateSku;
      if (!gateSkuMap.has(gateKey)) {
        const gateDesc = hw.gateQty === 2 ? "Chain Link Double Drive Gate" : "Chain Link Walk Gate";
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

  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", terminalPosts.length, 0.90, `Wind mode: terminal posts only`, p("REBAR_4_3FT")));
  }

  // Labor rates adjusted to realistic contractor baselines (0.8-1.3 hrs per 10 LF)
  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: totalPostCount, rateHrs: 0.25, totalHrs: totalPostCount * 0.25 },
    { activity: "Post Setting", count: totalPostCount, rateHrs: 0.20, totalHrs: totalPostCount * 0.20 },
    { activity: "Top Rail Installation", count: railCutPlan.stockPiecesNeeded, rateHrs: 0.20, totalHrs: railCutPlan.stockPiecesNeeded * 0.20 },
    { activity: "Fabric Unrolling & Stretching", count: segEdges.length, rateHrs: 1.50, totalHrs: segEdges.length * 1.50, notes: "Per run" },
    { activity: "Gate Installation", count: gateSpecs.length, rateHrs: 0, totalHrs: totalGateLaborHours },
    { activity: "Tie Wire / Fastening", count: totalPostCount, rateHrs: 0.15, totalHrs: totalPostCount * 0.15 },
    { activity: "Concrete Pour", count: totalPostCount, rateHrs: 0.10, totalHrs: totalPostCount * 0.10 },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
