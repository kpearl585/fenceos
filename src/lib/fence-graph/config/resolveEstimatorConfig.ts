// ── Estimator Config Resolver ────────────────────────────────────
// Deep-merges org-level overrides over DEFAULT_ESTIMATOR_CONFIG.
// Invalid or malformed values fall back to defaults per-field.

import type { OrgEstimatorConfig, DeepPartial } from "./types";
import { DEFAULT_ESTIMATOR_CONFIG } from "./defaults";

// ── Deep merge utility ───────────────────────────────────────────
// Recursively merges `overrides` into `base`. Only valid values
// (matching the base type at each leaf) are applied. Everything
// else falls back to the default.

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function deepMergeSafe<T extends Record<string, unknown>>(
  base: T,
  overrides: unknown
): T {
  if (!isPlainObject(overrides)) return base;

  const result = { ...base };

  for (const key of Object.keys(base)) {
    const baseVal = base[key];
    const overrideVal = (overrides as Record<string, unknown>)[key];

    // Skip if override doesn't provide this key
    if (overrideVal === undefined || overrideVal === null) continue;

    if (isPlainObject(baseVal)) {
      // Recurse into nested objects
      result[key as keyof T] = deepMergeSafe(
        baseVal as Record<string, unknown>,
        overrideVal
      ) as T[keyof T];
    } else if (typeof baseVal === "number") {
      // Only accept finite numbers for number fields
      if (typeof overrideVal === "number" && Number.isFinite(overrideVal)) {
        result[key as keyof T] = overrideVal as T[keyof T];
      }
      // else: keep base default (malformed override ignored)
    } else if (typeof baseVal === "string") {
      if (typeof overrideVal === "string" && overrideVal.length > 0) {
        result[key as keyof T] = overrideVal as T[keyof T];
      }
    }
    // Other types (boolean, etc.) — extend here if needed
  }

  return result;
}

function diffFromBase<T extends Record<string, unknown>>(
  base: T,
  current: T
): Partial<T> {
  const diff: Partial<T> = {};

  for (const key of Object.keys(base) as Array<keyof T>) {
    const baseVal = base[key];
    const currentVal = current[key];

    if (isPlainObject(baseVal) && isPlainObject(currentVal)) {
      const child = diffFromBase(
        baseVal as Record<string, unknown>,
        currentVal as Record<string, unknown>
      );
      if (Object.keys(child).length > 0) {
        diff[key] = child as T[keyof T];
      }
      continue;
    }

    if (currentVal !== baseVal) {
      diff[key] = currentVal;
    }
  }

  return diff;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Merge partial org overrides over DEFAULT_ESTIMATOR_CONFIG.
 * Invalid/missing fields fall back to defaults.
 * Never mutates DEFAULT_ESTIMATOR_CONFIG.
 */
export function mergeEstimatorConfig(
  overrides?: DeepPartial<OrgEstimatorConfig> | null
): OrgEstimatorConfig {
  if (!overrides) return { ...structuredClone(DEFAULT_ESTIMATOR_CONFIG) };

  return deepMergeSafe(
    structuredClone(DEFAULT_ESTIMATOR_CONFIG) as unknown as Record<string, unknown>,
    overrides
  ) as unknown as OrgEstimatorConfig;
}

/**
 * Apply a patch onto an already-resolved config.
 * Useful when auto-tuning wants to adjust the live config rather than
 * re-merging from defaults.
 */
export function mergeResolvedEstimatorConfig(
  base: OrgEstimatorConfig,
  overrides?: DeepPartial<OrgEstimatorConfig> | null
): OrgEstimatorConfig {
  if (!overrides) return structuredClone(base);

  return deepMergeSafe(
    structuredClone(base) as unknown as Record<string, unknown>,
    overrides
  ) as unknown as OrgEstimatorConfig;
}

/**
 * Convert a resolved config back into sparse overrides relative to defaults.
 * Keeps org_settings.estimator_config_json lean and forward-compatible.
 */
export function extractEstimatorOverrides(
  config: OrgEstimatorConfig
): DeepPartial<OrgEstimatorConfig> {
  return diffFromBase(
    structuredClone(DEFAULT_ESTIMATOR_CONFIG) as unknown as Record<string, unknown>,
    structuredClone(config) as unknown as Record<string, unknown>
  ) as DeepPartial<OrgEstimatorConfig>;
}

/**
 * Resolve config from an org_settings row.
 * Handles missing, null, or malformed estimator_config_json gracefully.
 */
export function resolveEstimatorConfigFromOrgSettings(
  orgSettings?: { estimator_config_json?: unknown } | null
): OrgEstimatorConfig {
  if (!orgSettings) return mergeEstimatorConfig(null);

  const raw = orgSettings.estimator_config_json;

  // Must be a plain object to be useful
  if (!isPlainObject(raw)) return mergeEstimatorConfig(null);

  return mergeEstimatorConfig(raw as DeepPartial<OrgEstimatorConfig>);
}

/**
 * Validate that a resolved config has sane values.
 * Returns a list of warnings (does not throw).
 * Useful for admin/debug UI.
 */
export function validateEstimatorConfig(
  config: OrgEstimatorConfig
): string[] {
  const warnings: string[] = [];

  // Check all labor rates are positive
  for (const [fenceType, rates] of Object.entries(config.labor)) {
    for (const [activity, value] of Object.entries(rates as unknown as Record<string, number>)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        warnings.push(`labor.${fenceType}.${activity}: invalid value ${value}`);
      }
    }
  }

  // Check concrete yields are positive
  if (config.concrete.bagYieldCuFt <= 0) {
    warnings.push(`concrete.bagYieldCuFt must be > 0, got ${config.concrete.bagYieldCuFt}`);
  }
  if (config.concrete.gravelBagCuFt <= 0) {
    warnings.push(`concrete.gravelBagCuFt must be > 0, got ${config.concrete.gravelBagCuFt}`);
  }

  // Check multipliers are positive
  if (config.laborEfficiency.baseMultiplier <= 0) {
    warnings.push(`laborEfficiency.baseMultiplier must be > 0`);
  }
  if (config.region.laborMultiplier <= 0) {
    warnings.push(`region.laborMultiplier must be > 0`);
  }
  if (config.region.materialMultiplier <= 0) {
    warnings.push(`region.materialMultiplier must be > 0`);
  }

  // Check gate labor is positive
  if (config.gateLaborBase.single <= 0 || config.gateLaborBase.double <= 0) {
    warnings.push(`gateLaborBase values must be > 0`);
  }

  // Check waste is in reasonable range
  if (config.waste.defaultPct < 0 || config.waste.defaultPct > 0.5) {
    warnings.push(`waste.defaultPct should be 0-0.50, got ${config.waste.defaultPct}`);
  }

  for (const [fenceType, buckets] of Object.entries(config.adaptiveLabor.byFenceType)) {
    for (const [band, bucket] of Object.entries(buckets)) {
      if (bucket.multiplier <= 0 || !Number.isFinite(bucket.multiplier)) {
        warnings.push(`adaptiveLabor.byFenceType.${fenceType}.${band}.multiplier must be > 0`);
      }
      if (bucket.sampleCount < 0 || !Number.isFinite(bucket.sampleCount)) {
        warnings.push(`adaptiveLabor.byFenceType.${fenceType}.${band}.sampleCount must be >= 0`);
      }
    }
  }

  return warnings;
}
