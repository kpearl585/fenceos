// ── Vinyl Fence BOM Generator ────────────────────────────────────
import type { FenceGraph, BomItem, LaborDriver } from "../types";
import { calcTotalConcrete } from "../concrete";
import { countPanelsToBuy } from "../segmentation";
import { makeBomItem, cuttingStockOptimizer } from "./shared";
import { mergePrices } from "../pricing/defaultPrices";
import { calculateAllGateCosts } from "../gatePricing";
import type { OrgEstimatorConfig } from "../config/types";
import { DEFAULT_ESTIMATOR_CONFIG } from "../config/defaults";

export function generateVinylBom(
  graph: FenceGraph,
  wastePct: number,
  priceMap: Record<string, number> = {},
  config: OrgEstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): { bom: BomItem[]; laborDrivers: LaborDriver[]; auditTrail: string[] } {
  const bom: BomItem[] = [];
  const audit: string[] = [];
  const { nodes, edges, productLine, installRules, siteConfig, windMode } = graph;

  // Merge user prices with defaults (user prices override defaults, region applied)
  const prices = mergePrices(priceMap, (config.region.key as import("../pricing/defaultPrices").Region) || "base");
  const p = (sku: string) => prices[sku];

  const linePosts = nodes.filter(n => n.type === "line");
  const endPosts = nodes.filter(n => n.type === "end");
  const cornerPosts = nodes.filter(n => n.type === "corner");
  const gatePosts = nodes.filter(n => n.type === "gate_hinge" || n.type === "gate_latch");

  // Determine system type early for audit trail
  const isComponentSystem = productLine.panelStyle === "privacy" && productLine.railType === "routed";
  const isPicketSystem = productLine.panelStyle === "picket";

  // Pricing class indicator
  if (isComponentSystem) {
    audit.push(`Pricing Class: PREMIUM COMPONENT SYSTEM (+15% vs pre-fab)`);
  } else if (isPicketSystem) {
    audit.push(`Pricing Class: PREMIUM PICKET SYSTEM (+45% vs pre-fab)`);
  } else {
    audit.push(`Pricing Class: STANDARD PRE-FAB SYSTEM (baseline)`);
  }

  audit.push(`System Type: ${isComponentSystem ? "COMPONENT (routed rails + individual pickets)" : "PRE-FAB (assembled panels)"}`);
  audit.push(`Posts: ${linePosts.length} line + ${endPosts.length} end + ${cornerPosts.length} corner + ${gatePosts.length} gate = ${nodes.length} total`);

  // Determine post SKU based on product line post size
  const is4x4 = productLine.postSize === "4x4";
  const postSku = is4x4 ? "VINYL_POST_4X4" : "VINYL_POST_5X5";
  const postLabel = is4x4 ? "4x4" : "5x5";
  const sleeveSku = is4x4 ? "POST_SLEEVE_4X4" : "POST_SLEEVE_5X5";

  bom.push(makeBomItem(postSku, `Vinyl Post ${postLabel} 10ft`, "posts", "ea", nodes.length, 0.95,
    `${linePosts.length}L + ${endPosts.length}E + ${cornerPosts.length}C + ${gatePosts.length}G posts`, p(postSku)));
  bom.push(makeBomItem("VINYL_POST_CAP", `Vinyl Post Cap ${postLabel}`, "hardware", "ea", nodes.length, 0.95,
    `1 cap × ${nodes.length} posts`, p("VINYL_POST_CAP")));

  // Post sleeves (ground contact protection for posts in ground)
  const sleeveCount = nodes.filter(n => n.type !== "tie_in").length; // All posts except tie-ins go in ground
  bom.push(makeBomItem(sleeveSku, `Vinyl Post Sleeve 48\" (ground contact)`, "posts", "ea", sleeveCount, 0.98,
    `${sleeveCount} posts in ground (excludes tie-ins)`, p(sleeveSku)));

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
  if (isComponentSystem) {
    // Component system: calculate individual pickets with slope adjustment
    const picketsPerFoot = config.material.vinylPicketsPerFoot;
    // Guard divide-by-zero when no panels (degenerate input): fall back to
    // unadjusted LF rather than NaN-propagating through the BOM.
    const slopeFactor = totalPanels > 0 ? (slopeAdjustmentFactor / totalPanels) : 0;
    const slopeAdjustedLF = totalLinearFeet * (1 + slopeFactor);
    const picketCount = Math.ceil(slopeAdjustedLF * picketsPerFoot * (1 + wastePct + 0.05)); // +5% extra for damage

    const picketSku = productLine.panelHeight_in >= 96 ? "VINYL_PICKET_8FT" :
                      productLine.panelHeight_in >= 72 ? "VINYL_PICKET_6FT" : "VINYL_PICKET_4FT";

    const slopeNote = slopeAdjustmentFactor > 0 && totalPanels > 0
      ? ` + ${(slopeFactor * 100).toFixed(0)}% slope adj`
      : "";
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
    const panelSku = productLine.panelHeight_in >= 96 ? "VINYL_PANEL_8FT" :
                      productLine.panelHeight_in >= 72 ? "VINYL_PANEL_6FT" : "VINYL_PANEL_4FT";
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

  // Rails — cutting-stock optimizer using section widths (post-to-post spans), not run lengths
  const sectionWidths_ft: number[] = [];
  for (const edge of segEdges) {
    if (!edge.sections) continue;
    for (const sec of edge.sections) {
      // Each section needs railCount rails, each rail = section width
      for (let r = 0; r < productLine.railCount; r++) {
        sectionWidths_ft.push(sec.width_in / 12);
      }
    }
  }
  const railCutPlan = cuttingStockOptimizer(sectionWidths_ft, 8, wastePct);
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

  // Concrete + gravel — waste already applied inside calcTotalConcrete()
  const { totalBags, totalGravelBags, perPostCalc } = calcTotalConcrete(nodes, installRules, siteConfig, wastePct, config.concrete);
  bom.push(makeBomItem("CONCRETE_80LB", "Concrete Bag 80lb", "concrete", "bag", totalBags, 0.95,
    `${nodes.length} posts × ~${perPostCalc.bagsNeeded} bags (soil ×${siteConfig.soilConcreteFactor}) + ${Math.round(wastePct * 100)}% waste`, p("CONCRETE_80LB")));
  bom.push(makeBomItem("GRAVEL_40LB", "Gravel Drainage 40lb", "concrete", "bag", totalGravelBags, 0.90,
    `4" gravel base per post × ${nodes.length} posts`, p("GRAVEL_40LB")));

  // Gates - Using deterministic gate pricing engine
  const gateEdges = edges.filter(e => e.type === "gate");
  const gateSpecs = gateEdges.map(e => e.gateSpec).filter(spec => spec !== undefined);

  let totalGateLaborHours = 0;

  if (gateSpecs.length > 0) {
    const gateCosts = calculateAllGateCosts(gateSpecs, "vinyl", prices, 65, config);

    // Add gate material to BOM (aggregated by SKU)
    const gateSkuMap = new Map<string, { qty: number; desc: string; unitCost: number }>();

    for (const gateCost of gateCosts.gates) {
      const hw = gateCost.hardware;

      // Gate panels
      const gateKey = hw.gateSku;
      if (!gateSkuMap.has(gateKey)) {
        gateSkuMap.set(gateKey, { qty: 0, desc: `Vinyl Gate ${hw.gateQty > 1 ? '(double)' : '(single)'}`, unitCost: hw.gateUnitPrice });
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
        gateSkuMap.set(latchKey, { qty: 0, desc: hw.latchSku === "GATE_LATCH_POOL" ? "Pool-Code Self-Closing Latch" : "Gate Latch", unitCost: hw.latchUnitPrice });
      }
      gateSkuMap.get(latchKey)!.qty += hw.latchQty;

      // Stop
      if (hw.stopSku && hw.stopQty) {
        const stopKey = hw.stopSku;
        if (!gateSkuMap.has(stopKey)) {
          gateSkuMap.set(stopKey, { qty: 0, desc: "Gate Stop (pair)", unitCost: hw.stopUnitPrice! });
        }
        gateSkuMap.get(stopKey)!.qty += hw.stopQty;
      }

      // Drop rod
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

  // Reinforcement
  const reinforced = nodes.filter(n => n.reinforced);
  if (reinforced.length > 0) {
    bom.push(makeBomItem("ALUM_INSERT", "Aluminum Post Insert", "hardware", "ea", reinforced.length, 0.90, `${reinforced.length} reinforced posts`, p("ALUM_INSERT")));
  }
  if (windMode) {
    bom.push(makeBomItem("REBAR_4_3FT", "Rebar #4 3ft", "hardware", "ea", nodes.length, 0.90, `Wind mode: all ${nodes.length} posts`, p("REBAR_4_3FT")));
  }

  // Fasteners — screws per section from config
  const totalSections = segEdges.reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const screwsPerSec = config.material.screwsPerSection;
  const screwsNeeded = totalSections * screwsPerSec;
  const screwBoxes = Math.ceil(screwsNeeded / 150 * (1 + wastePct)); // ~150 screws per 1lb box
  bom.push(makeBomItem("SCREWS_1LB", "Screws (1lb box ~150ct)", "hardware", "ea", screwBoxes, 0.90,
    `${totalSections} sections × ${screwsPerSec} screws/section ÷ 150/box + ${Math.round(wastePct * 100)}% waste`, p("SCREWS_1LB")));

  // Labor — rates from org config
  const rackedSections = segEdges.filter(e => e.slopeMethod === "racked").reduce((s, e) => s + (e.sections?.length ?? 0), 0);
  const vl = config.labor.vinyl;
  const laborDrivers: LaborDriver[] = [
    { activity: "Hole Digging", count: nodes.length, rateHrs: vl.holeDig, totalHrs: nodes.length * vl.holeDig },
    { activity: "Post Setting", count: nodes.length, rateHrs: vl.postSet, totalHrs: nodes.length * vl.postSet },
    { activity: "Section Installation", count: totalSections, rateHrs: vl.sectionInstall, totalHrs: totalSections * vl.sectionInstall },
    { activity: "Cutting Operations", count: totalCuts, rateHrs: vl.cutting, totalHrs: totalCuts * vl.cutting },
    { activity: "Gate Installation", count: gateSpecs.length, rateHrs: 0, totalHrs: totalGateLaborHours },
    { activity: "Racking (Field Fab)", count: rackedSections, rateHrs: vl.racking, totalHrs: rackedSections * vl.racking },
    { activity: "Concrete Pour", count: nodes.length, rateHrs: vl.concretePour, totalHrs: nodes.length * vl.concretePour },
  ];

  return { bom, laborDrivers, auditTrail: audit };
}
