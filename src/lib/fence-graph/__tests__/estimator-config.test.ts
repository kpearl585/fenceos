// ── Estimator Config Tests ───────────────────────────────────────
// Tests for the org-level config merge/resolve/validation system.

import { describe, it, expect } from "vitest";
import { DEFAULT_ESTIMATOR_CONFIG } from "../config/defaults";
import {
  mergeEstimatorConfig,
  resolveEstimatorConfigFromOrgSettings,
  validateEstimatorConfig,
} from "../config/resolveEstimatorConfig";
import type { OrgEstimatorConfig, DeepPartial } from "../config/types";

// ═════════════════════════════════════════════════════════════════
// 1. Defaults resolve correctly
// ═════════════════════════════════════════════════════════════════

describe("Default config", () => {
  it("should have configVersion 1", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.configVersion).toBe(1);
  });

  it("should have corrected aluminum labor rates", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.aluminum.holeDig).toBe(0.25);
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.aluminum.postSet).toBe(0.20);
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.aluminum.panelInstall).toBe(0.45);
  });

  it("should have 80lb bag yield", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.concrete.bagYieldCuFt).toBe(0.60);
  });

  it("should have base region", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.region.key).toBe("base");
    expect(DEFAULT_ESTIMATOR_CONFIG.region.laborMultiplier).toBe(1.0);
    expect(DEFAULT_ESTIMATOR_CONFIG.region.materialMultiplier).toBe(1.0);
  });

  it("should have 5% default waste", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.waste.defaultPct).toBe(0.05);
  });

  it("should have all fence type labor sections", () => {
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.vinyl).toBeDefined();
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.wood).toBeDefined();
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.chain_link).toBeDefined();
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.aluminum).toBeDefined();
  });

  it("should pass validation with no warnings", () => {
    const warnings = validateEstimatorConfig(DEFAULT_ESTIMATOR_CONFIG);
    expect(warnings).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. Partial overrides merge correctly
// ═════════════════════════════════════════════════════════════════

describe("mergeEstimatorConfig", () => {
  it("null overrides should return defaults", () => {
    const config = mergeEstimatorConfig(null);
    expect(config.labor.vinyl.holeDig).toBe(0.25);
    expect(config.concrete.bagYieldCuFt).toBe(0.60);
  });

  it("undefined overrides should return defaults", () => {
    const config = mergeEstimatorConfig(undefined);
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("empty object overrides should return defaults", () => {
    const config = mergeEstimatorConfig({});
    expect(config.labor.vinyl.holeDig).toBe(0.25);
    expect(config.region.key).toBe("base");
  });

  it("should override a single leaf value", () => {
    const config = mergeEstimatorConfig({
      labor: {
        vinyl: {
          holeDig: 0.40,
        },
      },
    });
    expect(config.labor.vinyl.holeDig).toBe(0.40);
  });

  it("should override region key", () => {
    const config = mergeEstimatorConfig({
      region: { key: "florida" },
    });
    expect(config.region.key).toBe("florida");
    // Non-overridden siblings should keep defaults
    expect(config.region.laborMultiplier).toBe(1.0);
  });

  it("should override nested overhead values", () => {
    const config = mergeEstimatorConfig({
      overhead: {
        fixed: { setupHrs: 2.5 },
      },
    });
    expect(config.overhead.fixed.setupHrs).toBe(2.5);
    // layoutHrs should still be default
    expect(config.overhead.fixed.layoutHrs).toBe(0.75);
    // perDay should be untouched
    expect(config.overhead.perDay.cleanupHrs).toBe(0.5);
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. Nested partial overrides do not erase sibling defaults
// ═════════════════════════════════════════════════════════════════

describe("Sibling preservation", () => {
  it("overriding vinyl labor should not erase wood labor", () => {
    const config = mergeEstimatorConfig({
      labor: {
        vinyl: { holeDig: 0.50 },
      },
    });
    // Vinyl changed
    expect(config.labor.vinyl.holeDig).toBe(0.50);
    // Wood untouched
    expect(config.labor.wood.holeDig).toBe(0.25);
    expect(config.labor.wood.railInstall).toBe(0.10);
    // Chain link untouched
    expect(config.labor.chain_link.fabricStretch).toBe(1.50);
    // Aluminum untouched
    expect(config.labor.aluminum.panelInstall).toBe(0.45);
  });

  it("overriding one vinyl field should not erase other vinyl fields", () => {
    const config = mergeEstimatorConfig({
      labor: {
        vinyl: { cutting: 0.25 },
      },
    });
    expect(config.labor.vinyl.cutting).toBe(0.25);
    expect(config.labor.vinyl.holeDig).toBe(0.25);
    expect(config.labor.vinyl.postSet).toBe(0.20);
    expect(config.labor.vinyl.sectionInstall).toBe(0.50);
    expect(config.labor.vinyl.racking).toBe(0.30);
    expect(config.labor.vinyl.concretePour).toBe(0.08);
  });

  it("overriding gateLaborBase should not affect gateWidthMultipliers", () => {
    const config = mergeEstimatorConfig({
      gateLaborBase: { single: 2.0 },
    });
    expect(config.gateLaborBase.single).toBe(2.0);
    expect(config.gateLaborBase.double).toBe(3.0); // sibling preserved
    expect(config.gateWidthMultipliers.small).toBe(1.0); // unrelated preserved
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. Malformed config falls back safely
// ═════════════════════════════════════════════════════════════════

describe("Malformed config handling", () => {
  it("string where number expected should keep default", () => {
    const config = mergeEstimatorConfig({
      labor: {
        vinyl: { holeDig: "fast" as unknown as number },
      },
    });
    expect(config.labor.vinyl.holeDig).toBe(0.25); // default preserved
  });

  it("NaN should keep default", () => {
    const config = mergeEstimatorConfig({
      concrete: { bagYieldCuFt: NaN },
    });
    expect(config.concrete.bagYieldCuFt).toBe(0.60);
  });

  it("Infinity should keep default", () => {
    const config = mergeEstimatorConfig({
      concrete: { bagYieldCuFt: Infinity },
    });
    expect(config.concrete.bagYieldCuFt).toBe(0.60);
  });

  it("array where object expected should keep defaults", () => {
    const config = mergeEstimatorConfig({
      labor: [1, 2, 3] as unknown as DeepPartial<OrgEstimatorConfig>["labor"],
    });
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("null nested value should keep defaults", () => {
    const config = mergeEstimatorConfig({
      labor: {
        vinyl: null as unknown as DeepPartial<OrgEstimatorConfig>["labor"],
      },
    } as DeepPartial<OrgEstimatorConfig>);
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("completely garbage input should return defaults", () => {
    const config = mergeEstimatorConfig(
      "garbage" as unknown as DeepPartial<OrgEstimatorConfig>
    );
    expect(config.labor.vinyl.holeDig).toBe(0.25);
    expect(config.concrete.bagYieldCuFt).toBe(0.60);
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. DEFAULT_ESTIMATOR_CONFIG is not mutated
// ═════════════════════════════════════════════════════════════════

describe("Immutability", () => {
  it("merging should not mutate DEFAULT_ESTIMATOR_CONFIG", () => {
    const originalValue = DEFAULT_ESTIMATOR_CONFIG.labor.vinyl.holeDig;

    const config = mergeEstimatorConfig({
      labor: { vinyl: { holeDig: 99 } },
    });

    expect(config.labor.vinyl.holeDig).toBe(99);
    expect(DEFAULT_ESTIMATOR_CONFIG.labor.vinyl.holeDig).toBe(originalValue);
  });

  it("modifying returned config should not affect defaults", () => {
    const config = mergeEstimatorConfig(null);
    config.labor.vinyl.holeDig = 999;

    expect(DEFAULT_ESTIMATOR_CONFIG.labor.vinyl.holeDig).toBe(0.25);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. resolveEstimatorConfigFromOrgSettings
// ═════════════════════════════════════════════════════════════════

describe("resolveEstimatorConfigFromOrgSettings", () => {
  it("null orgSettings should return defaults", () => {
    const config = resolveEstimatorConfigFromOrgSettings(null);
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("missing estimator_config_json should return defaults", () => {
    const config = resolveEstimatorConfigFromOrgSettings({});
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("valid partial JSON should merge correctly", () => {
    const config = resolveEstimatorConfigFromOrgSettings({
      estimator_config_json: {
        labor: { vinyl: { holeDig: 0.35 } },
        region: { key: "florida", materialMultiplier: 1.08 },
      },
    });
    expect(config.labor.vinyl.holeDig).toBe(0.35);
    expect(config.labor.vinyl.postSet).toBe(0.20); // default preserved
    expect(config.region.key).toBe("florida");
    expect(config.region.materialMultiplier).toBe(1.08);
    expect(config.region.laborMultiplier).toBe(1.0); // default preserved
  });

  it("non-object estimator_config_json should return defaults", () => {
    const config = resolveEstimatorConfigFromOrgSettings({
      estimator_config_json: "not an object",
    });
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });

  it("number estimator_config_json should return defaults", () => {
    const config = resolveEstimatorConfigFromOrgSettings({
      estimator_config_json: 42,
    });
    expect(config.labor.vinyl.holeDig).toBe(0.25);
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. Validation
// ═════════════════════════════════════════════════════════════════

describe("validateEstimatorConfig", () => {
  it("defaults should produce zero warnings", () => {
    const config = mergeEstimatorConfig(null);
    expect(validateEstimatorConfig(config)).toEqual([]);
  });

  it("negative labor rate should produce warning", () => {
    const config = mergeEstimatorConfig(null);
    config.labor.vinyl.holeDig = -1;
    const warnings = validateEstimatorConfig(config);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("labor.vinyl.holeDig");
  });

  it("zero concrete yield should produce warning", () => {
    const config = mergeEstimatorConfig(null);
    config.concrete.bagYieldCuFt = 0;
    const warnings = validateEstimatorConfig(config);
    expect(warnings.some(w => w.includes("bagYieldCuFt"))).toBe(true);
  });

  it("extreme waste should produce warning", () => {
    const config = mergeEstimatorConfig(null);
    config.waste.defaultPct = 0.75; // 75% waste is unreasonable
    const warnings = validateEstimatorConfig(config);
    expect(warnings.some(w => w.includes("waste.defaultPct"))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. Config flows through estimator
// ═════════════════════════════════════════════════════════════════

describe("Config flows through estimateFence", () => {
  // Import here to avoid circular dependency issues at module level
  it("estimateFence should accept estimatorConfig option", async () => {
    const { estimateFence } = await import("../engine");

    const input = {
      projectName: "Test",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6 as const,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 50, startType: "end" as const, endType: "end" as const }],
      gates: [],
    };

    // Should not throw with config provided
    const result = estimateFence(input, {
      estimatorConfig: {
        labor: { vinyl: { holeDig: 0.40 } },
      },
    });

    expect(result).toBeDefined();
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("estimateFence should work without estimatorConfig (backward compat)", async () => {
    const { estimateFence } = await import("../engine");

    const input = {
      projectName: "Test",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6 as const,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 50, startType: "end" as const, endType: "end" as const }],
      gates: [],
    };

    // Old-style call (no config) should still work
    const result = estimateFence(input, 65);
    expect(result).toBeDefined();
    expect(result.totalCost).toBeGreaterThan(0);
  });
});
