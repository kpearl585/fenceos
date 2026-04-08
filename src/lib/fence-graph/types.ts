// ── FenceGraph Types ─────────────────────────────────────────────
// Production-grade vinyl fence estimation engine
// Based on: FenceEstimatePro Engineering Packet (March 2026)

export type PostType =
  | "end"           // Start/terminus of a fence run (degree = 1)
  | "line"          // Interior post in a straight run
  | "corner"        // Direction change (angle < 170° or > 190°)
  | "gate_hinge"    // Left-side gate post (receives hinges)
  | "gate_latch"    // Right-side gate post (receives latch)
  | "tie_in";       // Masonry/wall attachment (requires anchor brackets)

export type PanelStyle = "privacy" | "picket" | "semi_privacy" | "lattice_top";
export type SlopeMethod = "racked" | "stepped" | "level";
export type GateType = "single" | "double";
export type PostSize = "4x4" | "5x5";
export type PanelHeight = 4 | 5 | 6 | 8;
export type SoilType = "sandy" | "sandy_loam" | "clay" | "rocky" | "wet";

export interface FenceNode {
  id: string;
  type: PostType;
  x: number;           // position (inches from origin)
  y: number;
  reinforced: boolean; // aluminum insert required
  postSize: PostSize;
  holeDepth_in: number;
  holeDiameter_in: number;
  concreteBags: number;
  confidence: number;  // 0–1
  source: string;      // "user_input" | "auto_derived"
  notes?: string;
}

export interface FenceEdge {
  id: string;
  from: string;         // node id
  to: string;           // node id
  type: "segment" | "gate";
  length_in: number;
  panelStyle: PanelStyle;
  slopeDeg: number;
  slopeMethod: SlopeMethod;
  confidence: number;
  // Computed by segmentation engine
  sections?: Section[];
  gateSpec?: GateSpec;
}

export interface Section {
  width_in: number;     // actual width of this section
  isFull: boolean;      // true if == nominal width
  isPartial: boolean;   // true if cut required
  scrap_in: number;     // nominal - actual (waste)
}

export interface GateSpec {
  gateType: GateType;
  openingWidth_in: number;        // Clear opening between posts (user input)
  leftLeafWidth_in: number;       // Actual gate leaf to order (opening - gaps)
  rightLeafWidth_in?: number;     // Double gates only
  totalOpening_in: number;        // Total space including all gaps
  hingeGap_in: number;            // Hinge-side gap
  latchGap_in: number;            // Latch-side gap
  centerGap_in?: number;          // Center gap for double gates
  dropRodRequired: boolean;
  isPoolGate: boolean;
}

export interface FenceGraph {
  projectId: string;
  productLine: ProductLineConfig;
  installRules: InstallRules;
  siteConfig: SiteConfig;
  nodes: FenceNode[];
  edges: FenceEdge[];
  windMode: boolean;
  audit: AuditTrail;
}

export interface ProductLineConfig {
  name: string;
  panelStyle: PanelStyle;
  panelHeight_in: number;    // 48 | 60 | 72 | 96
  nominalWidth_in: number;   // 96 (standard 8ft panel)
  minReducedWidth_in: number; // 24 (min acceptable partial)
  postSize: PostSize;
  railCount: number;         // 2 = 4ft–5ft, 3 = 6ft, 4 = 8ft
  railType: "routed" | "plain";
  windKitAvailable: boolean;
}

export interface InstallRules {
  maxPostCenters_in: number;       // 96 (standard)
  preferredPostCenters_in: number; // 96
  holeDiameter_in: number;         // 10 for 5x5, 8 for 4x4
  holeDepth_in: number;            // 30 standard, 36 wind, 42 Florida sandy
  gravelBase_in: number;           // 4
  groundClearance_in: number;      // 2
  thermalGap_in: number;           // 0.25
  maxRackAngle_deg: number;        // 18
  slopeThresholdForStepped_deg: number; // 18
}

export interface SiteConfig {
  soilType: SoilType;
  soilConcreteFactor: number;  // 1.0 clay, 1.25 sandy_loam, 1.5 sandy, 1.75 wet
  hurricaneZone: boolean;
  floodZone: boolean;
  existingFenceRemoval: boolean;
  surfaceType: "ground" | "concrete" | "pavers";
  obstacleCt: number;          // trees/roots
}

export interface AuditTrail {
  sourceFile?: string;
  extractionMethod: "manual_input" | "dxf" | "pdf_vector" | "raster";
  extractionDate: string;
  overallConfidence: number;
  manualOverrides: number;
}

// ── User Input Types (what the contractor fills in) ──────────────

export interface RunInput {
  id: string;
  linearFeet: number;
  startType: "end" | "corner" | "gate";
  endType: "end" | "corner" | "gate";
  cornerAngle?: number;   // 45 | 90 | custom (default 90)
  slopeDeg?: number;      // 0 = flat
  slopeMethod?: SlopeMethod;
  panelStyle?: PanelStyle; // defaults to product line default
  notes?: string;
}

export interface GateInput {
  id: string;
  afterRunId: string;      // which run this gate follows
  gateType: GateType;
  widthFt: number;         // total opening width
  isPoolGate: boolean;
}

export interface FenceProjectInput {
  projectName: string;
  productLineId: string;   // "classic_privacy_6ft" etc.
  fenceHeight: PanelHeight;
  postSize: PostSize;
  soilType: SoilType;
  windMode: boolean;
  runs: RunInput[];
  gates: GateInput[];
}

// ── BOM Output Types ──────────────────────────────────────────────

export interface BomItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  unitCost?: number;
  extCost?: number;
  confidence: number;    // 0–1
  traceability: string;  // human-readable explanation of why this qty
}

export interface LaborDriver {
  activity: string;
  count: number;
  rateHrs: number;
  totalHrs: number;
  notes?: string;
}

export interface FenceEstimateResult {
  projectId: string;
  projectName: string;
  graph: FenceGraph;
  bom: BomItem[];
  laborDrivers: LaborDriver[];
  totalMaterialCost: number;
  totalLaborHrs: number;
  totalLaborCost: number;
  totalCost: number;
  // Waste summary
  deterministicScrap_in: number;
  probabilisticWastePct: number;
  // Confidence
  overallConfidence: number;
  redFlagItems: BomItem[];  // items with confidence < 0.8
  // Audit
  auditTrail: string[];
}

// ── Product Line Presets ──────────────────────────────────────────

export const PRODUCT_LINES: Record<string, ProductLineConfig> = {
  // ── Vinyl ──────────────────────────────────────────────────────
  vinyl_privacy_6ft: {
    name: "Vinyl Privacy 6ft",
    panelStyle: "privacy",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "5x5",
    railCount: 3,
    railType: "routed",
    windKitAvailable: true,
  },
  vinyl_privacy_8ft: {
    name: "Vinyl Privacy 8ft",
    panelStyle: "privacy",
    panelHeight_in: 96,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "5x5",
    railCount: 4,
    railType: "routed",
    windKitAvailable: true,
  },
  vinyl_picket_4ft: {
    name: "Vinyl Picket 4ft",
    panelStyle: "picket",
    panelHeight_in: 48,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 2,
    railType: "plain",
    windKitAvailable: false,
  },
  vinyl_picket_6ft: {
    name: "Vinyl Picket 6ft",
    panelStyle: "picket",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "5x5",
    railCount: 3,
    railType: "plain",
    windKitAvailable: true,
  },
  // ── Wood ───────────────────────────────────────────────────────
  wood_privacy_6ft: {
    name: "Wood Privacy 6ft",
    panelStyle: "privacy",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 3,
    railType: "plain",
    windKitAvailable: false,
  },
  wood_privacy_8ft: {
    name: "Wood Privacy 8ft",
    panelStyle: "privacy",
    panelHeight_in: 96,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 4,
    railType: "plain",
    windKitAvailable: false,
  },
  wood_picket_4ft: {
    name: "Wood Picket 4ft",
    panelStyle: "picket",
    panelHeight_in: 48,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 2,
    railType: "plain",
    windKitAvailable: false,
  },
  // ── Chain Link ─────────────────────────────────────────────────
  chain_link_4ft: {
    name: "Chain Link 4ft",
    panelStyle: "privacy",
    panelHeight_in: 48,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 1,
    railType: "plain",
    windKitAvailable: false,
  },
  chain_link_6ft: {
    name: "Chain Link 6ft",
    panelStyle: "privacy",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 1,
    railType: "plain",
    windKitAvailable: false,
  },
  // ── Aluminum ───────────────────────────────────────────────────
  aluminum_4ft: {
    name: "Aluminum Ornamental 4ft",
    panelStyle: "picket",
    panelHeight_in: 48,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 2,
    railType: "plain",
    windKitAvailable: true,
  },
  aluminum_6ft: {
    name: "Aluminum Ornamental 6ft",
    panelStyle: "picket",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "4x4",
    railCount: 3,
    railType: "plain",
    windKitAvailable: true,
  },
  // Legacy aliases
  classic_privacy_6ft: {
    name: "Vinyl Privacy 6ft",
    panelStyle: "privacy",
    panelHeight_in: 72,
    nominalWidth_in: 96,
    minReducedWidth_in: 24,
    postSize: "5x5",
    railCount: 3,
    railType: "routed",
    windKitAvailable: true,
  },
};

export const INSTALL_RULES: Record<PostSize, InstallRules> = {
  "5x5": {
    maxPostCenters_in: 96,
    preferredPostCenters_in: 96,
    holeDiameter_in: 10,
    holeDepth_in: 30,
    gravelBase_in: 4,
    groundClearance_in: 2,
    thermalGap_in: 0.25,
    maxRackAngle_deg: 18,
    slopeThresholdForStepped_deg: 18,
  },
  "4x4": {
    maxPostCenters_in: 96,
    preferredPostCenters_in: 96,
    holeDiameter_in: 8,
    holeDepth_in: 30,
    gravelBase_in: 4,
    groundClearance_in: 2,
    thermalGap_in: 0.25,
    maxRackAngle_deg: 18,
    slopeThresholdForStepped_deg: 18,
  },
};

export const SOIL_CONCRETE_FACTORS: Record<SoilType, number> = {
  clay: 1.0,
  rocky: 1.0,
  sandy_loam: 1.25,
  sandy: 1.5,
  wet: 1.75,
};

export const FLORIDA_DEPTH_OVERRIDE_IN = 42; // sandy Florida soil min depth
