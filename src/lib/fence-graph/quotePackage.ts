// ── Quote Package Builder ────────────────────────────────────────
// Generates quote metadata, customer proposal summary, terms,
// and shopping-list grouping from a completed estimate result.

import type {
  FenceEstimateResult, FenceGraph, BomItem,
  QuoteMetadata, CustomerProposalSummary, ShoppingListGroup,
} from "./types";
import type { FenceType } from "./bom/index";

// ── Default Terms Template ───────────────────────────────────────

const DEFAULT_TERMS: string[] = [
  "Payment: 50% deposit due upon acceptance, balance due upon completion.",
  "This quote is valid for 30 days from the date shown above.",
  "Scope changes, additions, or modifications after acceptance may result in additional charges and schedule adjustments.",
  "Permitting is the responsibility of the property owner unless explicitly included in this quote.",
  "Contractor is not responsible for underground utilities, irrigation lines, or other subsurface obstructions. Customer must call 811 for utility locates prior to installation.",
  "Material prices are subject to supplier availability and may adjust if significant market changes occur before project start.",
  "Warranty: Workmanship warranted for 1 year from completion. Material warranties per manufacturer terms.",
  "Landscaping, grading, or irrigation restoration is not included unless explicitly listed.",
  "Project timeline is weather-dependent. Delays due to weather, permit processing, or utility locates are not grounds for cancellation.",
];

// ── Fence Type Labels ────────────────────────────────────────────

const FENCE_TYPE_LABELS: Record<FenceType, string> = {
  vinyl: "Vinyl",
  wood: "Wood",
  chain_link: "Chain Link",
  aluminum: "Aluminum / Ornamental",
};

// ── Shopping List Category Rules ─────────────────────────────────

const SHOPPING_LIST_RULES: { group: string; categories: string[]; skuPrefixes: string[] }[] = [
  {
    group: "Fence Supplier",
    categories: ["posts", "panels", "pickets", "rails", "gates", "fabric", "vinyl_hardware", "cl_hardware", "alum_hardware", "wood_hardware"],
    skuPrefixes: ["VINYL_", "WOOD_", "CL_", "ALUM_", "CHAIN_", "GATE_", "HINGE_", "DROP_ROD", "GATE_LATCH", "GATE_STOP", "GATE_SPRING", "POST_"],
  },
  {
    group: "Hardware Store",
    categories: ["concrete", "hardware"],
    skuPrefixes: ["CONCRETE_", "GRAVEL_", "SCREWS_", "NAILS_", "STAPLES_", "REBAR_", "ALUM_INSERT"],
  },
  {
    group: "Rental Yard",
    categories: ["equipment"],
    skuPrefixes: ["EQUIP_"],
  },
  {
    group: "Disposal / Haul-Away",
    categories: ["disposal"],
    skuPrefixes: ["DISPOSAL_"],
  },
  {
    group: "Regulatory",
    categories: ["regulatory"],
    skuPrefixes: ["REG_"],
  },
  {
    group: "Logistics",
    categories: ["logistics"],
    skuPrefixes: ["DELIVERY_"],
  },
];

// ── Public API ───────────────────────────────────────────────────

export function buildQuoteMetadata(validityDays = 30): QuoteMetadata {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + validityDays);

  return {
    createdAt: now.toISOString(),
    quoteValidUntil: validUntil.toISOString().split("T")[0], // YYYY-MM-DD
    quoteVersion: 1,
  };
}

export function buildCustomerProposal(
  result: FenceEstimateResult,
  fenceType: FenceType,
  quoteValidUntil: string
): CustomerProposalSummary {
  const graph = result.graph;
  const productLine = graph.productLine;
  const heightFt = Math.round(productLine.panelHeight_in / 12);

  const segEdges = graph.edges.filter(e => e.type === "segment");
  const totalLF = Math.round(segEdges.reduce((s, e) => s + e.length_in / 12, 0));
  const gateCount = graph.edges.filter(e => e.type === "gate").length;

  const estimatedInstallDays = Math.max(1, Math.ceil(result.totalLaborHrs / 8));

  const finalQuotedTotal = result.commercialSummary?.finalQuotedTotal ?? result.totalCost;

  // Build scope summary
  const fenceLabel = FENCE_TYPE_LABELS[fenceType] || fenceType;
  const styleLabel = productLine.panelStyle === "privacy" ? "privacy" : productLine.panelStyle;
  const gatePart = gateCount > 0
    ? ` with ${gateCount} gate${gateCount > 1 ? "s" : ""}`
    : "";
  const removalPart = graph.siteConfig.existingFenceRemoval
    ? " including existing fence removal"
    : "";
  const shortScopeSummary = `Install ${totalLF} LF of ${heightFt} ft ${fenceLabel.toLowerCase()} ${styleLabel} fence${gatePart}${removalPart}.`;

  // Build exclusions (what is NOT included)
  const exclusions: string[] = [];
  const hasPermit = result.bom.some(b => b.sku === "REG_PERMIT");
  const hasSurvey = result.bom.some(b => b.sku === "REG_SURVEY");
  const hasEngineering = result.bom.some(b => b.sku === "REG_ENGINEERING");
  const hasRemoval = graph.siteConfig.existingFenceRemoval;

  if (!hasPermit) exclusions.push("Building permits and associated fees");
  if (!hasSurvey) exclusions.push("Property survey or boundary verification");
  if (!hasEngineering) exclusions.push("Engineering stamps or wind load certifications");
  if (!hasRemoval) exclusions.push("Removal or disposal of existing fence");
  exclusions.push("Unforeseen subsurface conditions (rock, roots, unmarked utilities)");
  exclusions.push("Utility locate delays beyond contractor's control");
  exclusions.push("Landscaping, irrigation, or grade restoration");

  return {
    fenceTypeLabel: fenceLabel,
    productLineLabel: productLine.name,
    totalLinearFeet: totalLF,
    gateCount,
    estimatedInstallDays,
    finalQuotedTotal,
    quoteValidUntil,
    shortScopeSummary,
    exclusionsSummary: exclusions,
  };
}

export function buildTermsAndConditions(
  customTerms?: string[] | null
): string[] {
  if (customTerms && customTerms.length > 0) return customTerms;
  return [...DEFAULT_TERMS];
}

export function groupBomIntoShoppingList(bom: BomItem[]): ShoppingListGroup[] {
  const assigned = new Set<number>();
  const groups: ShoppingListGroup[] = [];

  for (const rule of SHOPPING_LIST_RULES) {
    const items: BomItem[] = [];

    bom.forEach((item, idx) => {
      if (assigned.has(idx)) return;

      const matchesCat = rule.categories.includes(item.category);
      const matchesSku = rule.skuPrefixes.some(p => item.sku.startsWith(p));

      if (matchesCat || matchesSku) {
        items.push(item);
        assigned.add(idx);
      }
    });

    if (items.length > 0) {
      groups.push({
        group: rule.group,
        items,
        subtotal: items.reduce((s, i) => s + (i.extCost ?? 0), 0),
      });
    }
  }

  // Anything unassigned goes to "Other"
  const unassigned = bom.filter((_, idx) => !assigned.has(idx));
  if (unassigned.length > 0) {
    groups.push({
      group: "Other",
      items: unassigned,
      subtotal: unassigned.reduce((s, i) => s + (i.extCost ?? 0), 0),
    });
  }

  return groups;
}

export { DEFAULT_TERMS };
