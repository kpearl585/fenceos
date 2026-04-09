// ── Wood Fence BOM Generator ─────────────────────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";
import { mergePrices } from "../pricing/defaultPrices";
import { calculateAllGateCosts } from "../gatePricing";
import { calculateBoardOnBoardCount, calculateGapBasedPicketCount, feetToInches } from "./picketCalculation";

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

  // Merge user prices with defaults (user prices override defaults)
  const prices = mergePrices(priceMap);
  const p = (sku: string) => prices[sku];
  const heightFt = productLine.panelHeight_in / 12;
  const isHeavy = heightFt > 6; // 6x6 posts for 8ft+ fence
  const railCount = heightFt <= 5 ? 2 : heightFt <= 6 ? 3 : 4;
  const isPicket = style === "picket";
  const isBoardOnBoard = style === "board_on_board";

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");

  // Pricing class indicator
  if (isBoardOnBoard) {
    audit.push(`Pricing Class: PREMIUM BOARD-ON-BOARD SYSTEM (+82% vs pre-fab)`);
  } else if (isPicket) {
    audit.push(`Pricing Class: PREMIUM PICKET SYSTEM (+82% vs pre-fab)`);
  } else {
    audit.push(`Pricing Class: STANDARD PRE-FAB SYSTEM (baseline)`);
  }

  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  // Posts
  const postSku = isHeavy ? "WOOD_POST_6X6_8" : (heightFt > 6 ? "WOOD_POST_4X4_10" : "WOOD_POST_4X4_8");
  const postName = isHeavy ? "Wood Post 6x6 8ft" : (heightFt > 6 ? "Wood Post 4x4 10ft" : "Wood Post 4x4 8ft");
  bom.push(makeBomItem(postSku, postName, "posts", "ea", nodes.length, 0.95,
    `${nodes.length} posts (${heightFt}ft fence → ${postSku})`, p(postSku)));
  bom.push(makeBomItem("POST_CAP_4X4", "Wood Post Cap", "hardware", "ea", nodes.length, 0.90,
    `1 cap × ${nodes.length} posts`, p("POST_CAP_4X4")));

  // Rails — 2x4 pressure treated, cutting-stock optimizer
  const segEdges = edges.filter(e => e.type === "segment");
  const railLengths = segEdges.map(e => e.length_in / 12);
  const allRailLengths = railLengths.flatMap(l => Array(railCount).fill(l));
  const railCutPlan = cuttingStockOptimizer(allRailLengths, 8, wastePct);
  bom.push(makeBomItem("WOOD_RAIL_2X4_8", "Pressure Treated 2x4x8 Rail", "rails", "ea", railCutPlan.stockPiecesNeeded, 0.92,
    `${railCount} rails/span × ${railCutPlan.explanation}`, p("WOOD_RAIL_2X4_8")));

  // Bottom rail for privacy (prevents animals/debris under)
  // Not needed for picket or board-on-board styles
  if (!isPicket && !isBoardOnBoard) {
    bom.push(makeBomItem("WOOD_RAIL_BOT_8", "Bottom Rail / Kick Board 1x6x8", "rails", "ea",
      Math.ceil(segEdges.reduce((s, e) => s + e.length_in / 12, 0) / 8 * (1 + wastePct)), 0.90,
      `Kick board: total run LF ÷ 8ft stock + ${Math.round(wastePct * 100)}% waste`, p("WOOD_RAIL_BOT_8")));
  }

  // Boards/pickets
  if (isBoardOnBoard) {
    // Board-on-board: Overlapping boards on alternating sides
    const totalRunLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
    const totalRunInches = feetToInches(totalRunLF);
    const picketSku = heightFt > 6 ? "WOOD_PICKET_8FT" : "WOOD_PICKET_6FT";

    // Board-on-board uses wider boards (typically 1×6 = 5.5" actual width)
    const picketWidth = 5.5; // 1×6 board actual width
    const overlapPct = 0.24; // 24% overlap (industry standard ~1.32")

    const { frontCount, backCount, total, overlapInches } = calculateBoardOnBoardCount(
      totalRunInches,
      picketWidth,
      overlapPct,
      wastePct
    );

    bom.push(makeBomItem(picketSku, `Wood Board 1×6 ${heightFt}ft (Board-on-Board)`, "panels", "ea", total, 0.92,
      `${totalRunLF.toFixed(1)} LF → ${frontCount} front + ${backCount} back = ${total} boards (${overlapInches.toFixed(2)}" overlap)`,
      p(picketSku)));
    audit.push(`Board-on-board: ${totalRunLF.toFixed(1)} LF → ${frontCount} front + ${backCount} back = ${total} boards`);
    audit.push(`Overlap calculation: ${picketWidth}" width - ${overlapInches.toFixed(2)}" overlap = ${(picketWidth - overlapInches).toFixed(2)}" effective coverage per board`);
  } else if (isPicket) {
    // Standard gap-based picket fence
    const totalRunLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
    const picketSku = heightFt > 6 ? "WOOD_PICKET_8FT" : "WOOD_PICKET_6FT";
    // Standard pickets: 3.5" wide, 0.5" gap → ~4" per picket → 3 per LF
    const picketCount = calculateGapBasedPicketCount(totalRunLF, 3, wastePct);
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
    `4" gravel base × ${nodes.length} posts`, p("GRAVEL_40LB")));

  // Fasteners
  const totalRails = railCutPlan.stockPiecesNeeded;
  bom.push(makeBomItem("SCREWS_1LB", "Screws (1lb box)", "hardware", "ea", Math.ceil(totalRails / 10), 0.90,
    `${totalRails} rails ÷ 10 rails per box`, p("SCREWS_1LB")));

  // Hurricane ties / joist hangers — structural rail-to-post connection (2 per rail piece, each end)
  // Florida building code requires for wind resistance; best practice everywhere
  const hurricaneTies = totalRails * 2;
  bom.push(makeBomItem("WOOD_HURRICANE_TIE", "Hurricane Tie / Joist Hanger", "wood_hardware", "ea",
    hurricaneTies, 0.98,
    `${totalRails} rail pieces × 2 connections each (both ends)`, p("WOOD_HURRICANE_TIE")));
  audit.push(`Hurricane ties: ${hurricaneTies} (${totalRails} rails × 2 ends)`);

  // Gates (deterministic pricing engine)
  const gateEdges = edges.filter(e => e.type === "gate");
  const gateSpecs = gateEdges.map(e => e.gateSpec).filter(spec => spec !== undefined);
  let totalGateLaborHours = 0;

  if (gateSpecs.length > 0) {
    const gateCosts = calculateAllGateCosts(gateSpecs, "wood", prices, 65);

    // Aggregate by SKU using Map
    const gateSkuMap = new Map<string, { qty: number; desc: string; unitCost: number }>();

    for (const gateCost of gateCosts.gates) {
      const hw = gateCost.hardware;

      // Gate (single 4ft or double set)
      const gateKey = hw.gateSku;
      if (!gateSkuMap.has(gateKey)) {
        const gateDesc = hw.gateQty === 2 ? "Wood Double Drive Gate" : "Wood Walk Gate (single)";
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

  // Carriage bolts for gate frame assembly (4 per gate leaf — corner braces + Z-brace connections)
  const totalGateLeaves = gateSpecs.reduce((sum, spec) => sum + (spec.gateType === "double" ? 2 : 1), 0);
  if (totalGateLeaves > 0) {
    bom.push(makeBomItem("WOOD_CARRIAGE_BOLT", "Carriage Bolt 3/8\"×3.5\" w/ Nut", "wood_hardware", "ea",
      totalGateLeaves * 4, 0.98,
      `4 bolts per gate leaf × ${totalGateLeaves} leaf/leaves`, p("WOOD_CARRIAGE_BOLT")));
    audit.push(`Gate carriage bolts: ${totalGateLeaves * 4} (${totalGateLeaves} leaves × 4)`);
  }

  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", nodes.length, 0.90, `Wind mode: all posts`, p("REBAR_4_3FT")));
  }

  const totalSections = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const totalCuts = segEdges.reduce((s, e) => s + (e.sections?.filter(sec => sec.isPartial).length ?? 0), 0);
  const rackedSections = segEdges.filter(e => e.slopeMethod === "racked").reduce((s, e) => s + (e.sections?.length ?? 0), 0);

  // Labor rates adjusted to realistic contractor baselines (1.5-2.5 hrs per 10 LF)
  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: nodes.length, rateHrs: 0.25, totalHrs: nodes.length * 0.25 },
    { activity: "Post Setting", count: nodes.length, rateHrs: 0.20, totalHrs: nodes.length * 0.20 },
    { activity: "Rail Installation", count: totalRails, rateHrs: 0.10, totalHrs: totalRails * 0.10 },
  ];

  // Board/panel installation labor varies by style
  if (isBoardOnBoard) {
    // Board-on-board: Install boards on both sides, more labor-intensive
    // Approximately 0.06 hrs per board (front + back installation + alignment)
    const totalRunLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
    const totalRunInches = feetToInches(totalRunLF);
    const { total: totalBoards } = calculateBoardOnBoardCount(totalRunInches, 5.5, 0.24, wastePct);
    laborDrivers.push({ activity: "Board-on-Board Installation", count: totalBoards, rateHrs: 0.06, totalHrs: totalBoards * 0.06 });
  } else if (isPicket || totalSections > 0) {
    // Standard picket or panel nailing
    laborDrivers.push({ activity: "Board/Panel Nailing", count: totalSections || 1, rateHrs: 0.40, totalHrs: (totalSections || 1) * 0.40 });
  }

  laborDrivers.push({ activity: "Cutting Operations", count: totalCuts, rateHrs: 0.15, totalHrs: totalCuts * 0.15 });
  laborDrivers.push({ activity: "Gate Installation", count: gateSpecs.length, rateHrs: 0, totalHrs: totalGateLaborHours });
  laborDrivers.push({ activity: "Racking (Field Fab)", count: rackedSections, rateHrs: 0.30, totalHrs: rackedSections * 0.30 });
  laborDrivers.push({ activity: "Concrete Pour", count: nodes.length, rateHrs: 0.08, totalHrs: nodes.length * 0.08 });

  return { bom, laborDrivers, auditTrail: audit };
}
