// ── FenceGraph Builder ───────────────────────────────────────────
// Transforms contractor-entered run/gate inputs into a
// semantically typed FenceGraph with post types, positions,
// slope methods, and gate specifications.

import type {
  FenceProjectInput, FenceGraph, FenceNode, FenceEdge,
  RunInput, GateInput, PostType, SlopeMethod,
  GateSpec, Section, InstallRules,
} from "./types";
import {
  PRODUCT_LINES, INSTALL_RULES, SOIL_CONCRETE_FACTORS,
  FLORIDA_DEPTH_OVERRIDE_IN,
} from "./types";
import { segmentRun, countPanelsToBuy } from "./segmentation";
import { calcConcretePerPost } from "./concrete";

let nodeCounter = 0;
let edgeCounter = 0;
function nextNodeId(): string { return `P${String(++nodeCounter).padStart(3, "0")}`; }
function nextEdgeId(): string { return `E${String(++edgeCounter).padStart(3, "0")}`; }

function chooseSlopeMethod(slopeDeg: number, maxRackAngle: number): SlopeMethod {
  if (slopeDeg === 0) return "level";
  if (slopeDeg <= maxRackAngle) return "racked";
  return "stepped";
}

function buildGateSpec(gate: GateInput): GateSpec {
  const totalWidth_in = gate.widthFt * 12;
  if (gate.gateType === "single") {
    return {
      gateType: "single",
      leftLeafWidth_in: totalWidth_in,
      totalOpening_in: totalWidth_in + 0.75 + 0.5, // hinge + latch gap
      hingeGap_in: 0.75,
      latchGap_in: 0.5,
      dropRodRequired: false,
      isPoolGate: gate.isPoolGate,
    };
  } else {
    const leafWidth = totalWidth_in / 2;
    return {
      gateType: "double",
      leftLeafWidth_in: leafWidth,
      rightLeafWidth_in: leafWidth,
      totalOpening_in: totalWidth_in + 0.75 + 0.5 + 1.0, // gaps
      hingeGap_in: 0.75,
      latchGap_in: 0.5,
      dropRodRequired: true,
      isPoolGate: gate.isPoolGate,
    };
  }
}

function makeNode(
  type: PostType,
  x: number,
  y: number,
  rules: InstallRules,
  site: { soilConcreteFactor: number; soilType: string },
  windMode: boolean,
  reinforced: boolean,
  postSize: "4x4" | "5x5"
): FenceNode {
  const isGate = type === "gate_hinge" || type === "gate_latch";
  const isStructural = type === "corner" || type === "end" || isGate;

  // Florida-specific depth
  let holeDepth = rules.holeDepth_in;
  if (site.soilType === "sandy" || site.soilType === "wet") {
    holeDepth = Math.max(holeDepth, FLORIDA_DEPTH_OVERRIDE_IN);
  }
  if (isGate) holeDepth = Math.max(holeDepth, holeDepth + 6);
  if (windMode) holeDepth = Math.max(holeDepth, 36);

  // Pass isGatePost=false because we already adjusted holeDepth above;
  // calcConcretePerPost would double-add the gate depth otherwise.
  const concreteCalc = calcConcretePerPost(
    { ...rules, holeDepth_in: holeDepth },
    { soilConcreteFactor: site.soilConcreteFactor, soilType: site.soilType as never, hurricaneZone: windMode, floodZone: false, existingFenceRemoval: false, surfaceType: "ground", obstacleCt: 0 },
    false
  );

  return {
    id: nextNodeId(),
    type,
    x,
    y,
    reinforced: reinforced || isStructural || windMode,
    postSize: windMode && postSize === "4x4" ? "5x5" : postSize,
    holeDepth_in: holeDepth,
    holeDiameter_in: rules.holeDiameter_in,
    concreteBags: concreteCalc.bagsNeeded,
    confidence: 0.95,
    source: "user_input",
  };
}

export function buildFenceGraph(input: FenceProjectInput): FenceGraph {
  nodeCounter = 0;
  edgeCounter = 0;

  const productLine = PRODUCT_LINES[input.productLineId];
  if (!productLine) throw new Error(`Unknown product line: ${input.productLineId}`);

  const rules: InstallRules = { ...INSTALL_RULES[input.postSize] };
  const soilFactor = SOIL_CONCRETE_FACTORS[input.soilType];
  const site = {
    soilType: input.soilType,
    soilConcreteFactor: soilFactor,
    hurricaneZone: input.windMode,
    floodZone: false,
    existingFenceRemoval: false,
    surfaceType: "ground" as const,
    obstacleCt: 0,
  };

  // Florida sandy soil: force depth
  if (input.soilType === "sandy" || input.soilType === "wet") {
    rules.holeDepth_in = Math.max(rules.holeDepth_in, FLORIDA_DEPTH_OVERRIDE_IN);
  }

  const nodes: FenceNode[] = [];
  const edges: FenceEdge[] = [];
  const auditLog: string[] = [];

  // Build a position cursor — lay fence out linearly for simplicity
  // In future, we'll use actual x/y from drawing input
  let cursor = 0;

  // Track last node id for connecting runs
  let lastNodeId: string | null = null;

  for (const run of input.runs) {
    const length_in = run.linearFeet * 12;
    const slopeDeg = run.slopeDeg ?? 0;
    const slopeMethod = run.slopeMethod ?? chooseSlopeMethod(slopeDeg, rules.maxRackAngle_deg);

    // Create start node (if not shared from previous run)
    let startNode: FenceNode;
    if (lastNodeId) {
      // Start node is shared from last run — update type if needed
      const existingNode = nodes.find((n) => n.id === lastNodeId)!;
      if (run.startType === "gate") {
        existingNode.type = "gate_latch"; // last node becomes gate latch if gate follows
      } else if (run.startType === "corner") {
        existingNode.type = "corner";
        existingNode.reinforced = true;
      }
      startNode = existingNode;
    } else {
      // First run — create start node
      const startType: PostType =
        run.startType === "gate" ? "gate_hinge" :
        run.startType === "corner" ? "corner" : "end";
      startNode = makeNode(startType, cursor, 0, rules, site, input.windMode, false, input.postSize);
      nodes.push(startNode);
      auditLog.push(`Run ${run.id}: start node ${startNode.id} (${startType}) at position ${cursor}"`);
    }

    // Create end node
    const endX = cursor + length_in;
    const endType: PostType =
      run.endType === "gate" ? "gate_hinge" :
      run.endType === "corner" ? "corner" : "end";
    const endNode = makeNode(endType, endX, 0, rules, site, input.windMode, false, input.postSize);
    nodes.push(endNode);

    // Count interior (line) posts
    const totalPostsInRun = Math.ceil(length_in / rules.maxPostCenters_in) + 1;
    const interiorPosts = Math.max(0, totalPostsInRun - 2); // subtract start + end
    const linePostSpacing = length_in / (interiorPosts + 1);

    for (let i = 1; i <= interiorPosts; i++) {
      const lineNode = makeNode(
        "line",
        cursor + linePostSpacing * i, 0,
        rules, site, input.windMode, false, input.postSize
      );
      nodes.push(lineNode);
    }

    // Segmentation for this run
    const plan = segmentRun(
      length_in,
      productLine.nominalWidth_in,
      productLine.minReducedWidth_in,
      rules.maxPostCenters_in
    );

    // Create segment edge
    const edge: FenceEdge = {
      id: nextEdgeId(),
      from: startNode.id,
      to: endNode.id,
      type: "segment",
      length_in,
      panelStyle: run.panelStyle ?? productLine.panelStyle,
      slopeDeg,
      slopeMethod,
      confidence: 0.95,
      sections: plan.sections,
    };
    edges.push(edge);

    auditLog.push(
      `Run ${run.id}: ${run.linearFeet}ft (${length_in}"), ${interiorPosts} line posts, ${plan.explanation}`
    );

    // Handle gates at run boundaries
    const gatesAfterRun = input.gates.filter((g) => g.afterRunId === run.id);
    for (const gate of gatesAfterRun) {
      const gateSpec = buildGateSpec(gate);
      const gateLength_in = gate.widthFt * 12;

      // Gate hinge post (already endNode if run.endType === "gate")
      const hingeNode = endNode;
      hingeNode.type = "gate_hinge";
      hingeNode.reinforced = true;

      // Gate latch post
      const latchNode = makeNode(
        "gate_latch",
        endX + gateLength_in, 0,
        rules, site, input.windMode, true, input.postSize
      );
      nodes.push(latchNode);

      const gateEdge: FenceEdge = {
        id: nextEdgeId(),
        from: hingeNode.id,
        to: latchNode.id,
        type: "gate",
        length_in: gateLength_in,
        panelStyle: run.panelStyle ?? productLine.panelStyle,
        slopeDeg: 0,
        slopeMethod: "level",
        confidence: 0.90,
        gateSpec,
      };
      edges.push(gateEdge);

      cursor = endX + gateLength_in;
      lastNodeId = latchNode.id;
      auditLog.push(
        `Gate ${gate.id}: ${gate.gateType} ${gate.widthFt}ft, hinge=${hingeNode.id}, latch=${latchNode.id}`
      );
    }

    if (gatesAfterRun.length === 0) {
      cursor = endX;
      lastNodeId = endNode.id;
    }
  }

  return {
    projectId: `proj_${Date.now()}`,
    productLine,
    installRules: rules,
    siteConfig: site,
    nodes,
    edges,
    windMode: input.windMode,
    audit: {
      extractionMethod: "manual_input",
      extractionDate: new Date().toISOString(),
      overallConfidence: 0.95,
      manualOverrides: 0,
    },
  };
}
