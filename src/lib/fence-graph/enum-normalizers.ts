// ── Enum normalizers — DB constraint bridges ────────────────────
// Several estimator tables enforce CHECK constraints with older /
// narrower value sets than what the app-side types emit. Rather than
// sprinkle `value === "x" ? "y" : value` casts across the code, every
// mapping lives here, with a comment pointing at the constraint.
//
// When a new constraint drift appears, add the normalizer here with
// a unit test — don't inline a one-off fix at the call site. That's
// how the wood / wood_privacy bug hid for months.

// ── estimates.fence_type ────────────────────────────────────────
// Constraint `estimates_fence_type_check` allows:
//   'wood_privacy' | 'chain_link' | 'vinyl' | 'aluminum'
//
// The Advanced Estimator's FenceType union is:
//   'wood' | 'vinyl' | 'chain_link' | 'aluminum'
//
// 'wood' must alias to 'wood_privacy'. Other three are identical on
// both sides. Any new FenceType values will need either an alias here
// or a constraint migration before hitting this column.

export type EstimatesFenceType =
  | "wood_privacy"
  | "chain_link"
  | "vinyl"
  | "aluminum";

const ESTIMATES_FENCE_TYPE_ALLOWED: ReadonlyArray<EstimatesFenceType> = [
  "wood_privacy",
  "chain_link",
  "vinyl",
  "aluminum",
];

/** Map an Advanced Estimator FenceType onto the estimates table's
 *  CHECK-constraint domain. Throws on an unknown value rather than
 *  returning garbage — a silent pass-through is what hid the original
 *  wood bug. */
export function toEstimatesFenceType(fenceType: string): EstimatesFenceType {
  if (fenceType === "wood") return "wood_privacy";
  if ((ESTIMATES_FENCE_TYPE_ALLOWED as ReadonlyArray<string>).includes(fenceType)) {
    return fenceType as EstimatesFenceType;
  }
  throw new Error(
    `Unsupported fenceType "${fenceType}" for estimates.fence_type. Allowed: wood (→ wood_privacy) | ${ESTIMATES_FENCE_TYPE_ALLOWED.join(" | ")}. Update enum-normalizers or loosen the CHECK constraint before shipping a new value.`
  );
}

// ── fence_designs.soil_type ─────────────────────────────────────
// Constraint `fence_designs_soil_type_check` allows:
//   'normal' | 'sandy' | 'clay' | 'rocky'
//
// The AI-extract schema + validation schemas.ts emits:
//   'standard' | 'sandy' | 'sandy_loam' | 'rocky' | 'clay' | 'wet'
//
// Today no code path writes AI-extracted soil_type to fence_designs,
// but if a future integration wires them together, these mappings
// must exist or the insert fails the CHECK. Keep them in sync here.
//
// Mapping rationale:
//   standard    → normal     (same meaning, just different wording)
//   sandy       → sandy      (identical)
//   sandy_loam  → sandy      (sandy_loam is a sandy subtype; best available match)
//   rocky       → rocky      (identical)
//   clay        → clay       (identical)
//   wet         → clay       (wet soils are typically clay-heavy; closest constrained value)

export type FenceDesignsSoilType = "normal" | "sandy" | "clay" | "rocky";
export type AiExtractSoilType =
  | "standard"
  | "sandy"
  | "sandy_loam"
  | "rocky"
  | "clay"
  | "wet";

const SOIL_TYPE_MAP: Record<AiExtractSoilType, FenceDesignsSoilType> = {
  standard:    "normal",
  sandy:       "sandy",
  sandy_loam:  "sandy",
  rocky:       "rocky",
  clay:        "clay",
  wet:         "clay",
};

/** Map an AI-extracted / Zod-validated soilType onto the
 *  fence_designs.soil_type CHECK-constraint domain. Throws on
 *  unknown so new soil types force a conscious decision about
 *  collapsing them here. */
export function toFenceDesignsSoilType(soilType: string): FenceDesignsSoilType {
  if (soilType in SOIL_TYPE_MAP) {
    return SOIL_TYPE_MAP[soilType as AiExtractSoilType];
  }
  throw new Error(
    `Unsupported soilType "${soilType}" for fence_designs.soil_type. Allowed inputs: ${Object.keys(SOIL_TYPE_MAP).join(" | ")}. Add a mapping in enum-normalizers before ingesting new soil type values.`
  );
}

// ── fence_designs.height_ft ─────────────────────────────────────
// Constraint `fence_designs_height_ft_check` allows:
//   4 | 6 | 8
//
// AI-extract + schemas.ts allow any number in [2, 12]. If AI data
// ever flows into the Phase 1 estimator, odd heights (5, 7, 10, 12)
// will fail the CHECK. Snap to the nearest allowed value rather
// than silently dropping rows.

export type FenceDesignsHeightFt = 4 | 6 | 8;

/** Round an arbitrary height in feet to the nearest value allowed
 *  by the fence_designs.height_ft CHECK. Deterministic and
 *  idempotent — calling it on an already-valid value is a no-op. */
export function toFenceDesignsHeightFt(heightFt: number): FenceDesignsHeightFt {
  if (!Number.isFinite(heightFt) || heightFt <= 0) {
    throw new Error(
      `Unsupported heightFt ${heightFt} for fence_designs.height_ft. Expected a positive number.`
    );
  }
  if (heightFt <= 5)  return 4;
  if (heightFt <= 7)  return 6;
  return 8;
}
