// Draft persistence helpers for the Advanced Estimator.
//
// Pure serialize/parse functions live here so they're unit-testable
// without mounting the component. The client component owns the
// useEffect wiring (timing, localStorage I/O); this file owns the
// shape contract and field-by-field validation.
//
// The key is versioned — bumping DRAFT_KEY invalidates all existing
// drafts rather than attempting a risky forward-migration.

export const DRAFT_KEY = "fep-estimator-draft-v1";
export const DRAFT_SAVE_DEBOUNCE_MS = 600;

export interface EstimatorDraft {
  projectName: string;
  fenceType: string;
  productLineId: string;
  woodStyle: string;
  soilType: string;
  laborRate: number;
  wastePct: number;
  markupPct: number;
  windMode: boolean;
  existingFenceRemoval: boolean;
  laborEfficiency: number;
  permitCost: number;
  inspectionCost: number;
  engineeringCost: number;
  surveyCost: number;
  customer: { name: string; address: string; city: string; phone: string; email: string };
}

export function serializeDraft(draft: EstimatorDraft): string {
  return JSON.stringify(draft);
}

// Returns a partial draft containing only the fields that pass type-narrowing.
// A field that's missing or wrong-typed is dropped — the caller falls back to
// its default. Corrupt JSON / non-object input returns null so the restore
// path can silently ignore it.
export function parseDraft(raw: string | null | undefined): Partial<EstimatorDraft> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;
  const out: Partial<EstimatorDraft> = {};

  if (typeof d.projectName === "string") out.projectName = d.projectName;
  if (typeof d.fenceType === "string") out.fenceType = d.fenceType;
  if (typeof d.productLineId === "string") out.productLineId = d.productLineId;
  if (typeof d.woodStyle === "string") out.woodStyle = d.woodStyle;
  if (typeof d.soilType === "string") out.soilType = d.soilType;
  if (typeof d.laborRate === "number" && Number.isFinite(d.laborRate)) out.laborRate = d.laborRate;
  if (typeof d.wastePct === "number" && Number.isFinite(d.wastePct)) out.wastePct = d.wastePct;
  if (typeof d.markupPct === "number" && Number.isFinite(d.markupPct)) out.markupPct = d.markupPct;
  if (typeof d.windMode === "boolean") out.windMode = d.windMode;
  if (typeof d.existingFenceRemoval === "boolean") out.existingFenceRemoval = d.existingFenceRemoval;
  if (typeof d.laborEfficiency === "number" && Number.isFinite(d.laborEfficiency)) {
    out.laborEfficiency = d.laborEfficiency;
  }
  if (typeof d.permitCost === "number" && Number.isFinite(d.permitCost)) out.permitCost = d.permitCost;
  if (typeof d.inspectionCost === "number" && Number.isFinite(d.inspectionCost)) {
    out.inspectionCost = d.inspectionCost;
  }
  if (typeof d.engineeringCost === "number" && Number.isFinite(d.engineeringCost)) {
    out.engineeringCost = d.engineeringCost;
  }
  if (typeof d.surveyCost === "number" && Number.isFinite(d.surveyCost)) out.surveyCost = d.surveyCost;
  if (d.customer && typeof d.customer === "object" && !Array.isArray(d.customer)) {
    const c = d.customer as Record<string, unknown>;
    out.customer = {
      name: typeof c.name === "string" ? c.name : "",
      address: typeof c.address === "string" ? c.address : "",
      city: typeof c.city === "string" ? c.city : "",
      phone: typeof c.phone === "string" ? c.phone : "",
      email: typeof c.email === "string" ? c.email : "",
    };
  }
  return out;
}
