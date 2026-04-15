// ── Closeout + Calibration Audit Regression Tests ───────────────
// Locks in the six findings from the deep closeout integrity audit:
//   C1 deriveActualTotal requires material+labor + dataCompleteness
//   C2 Dedupe labor signals when both cost+hours provided
//   C3 Regulatory category now emits calibration signals
//   C4 Cold-start damping on updateWasteCalibration EWMA
//   C5 whatWentRight fallback doesn't frame losses as wins
//   C6 Concrete signal uses concrete_overestimate type + real direction

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { analyzeEstimateCloseout } from "../closeout/analyzeCloseout";
import { updateWasteCalibration, DEFAULT_WASTE_CALIBRATION } from "../bom/shared";
import type { FenceProjectInput } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Closeout audit",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "end" }],
    gates: [],
    ...overrides,
  };
}

function getEstimate() {
  return estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
}

// ═════════════════════════════════════════════════════════════════
// C1 — deriveActualTotal does not fabricate totals from partials
// ═════════════════════════════════════════════════════════════════

describe("C1 • Partial closeout actuals no longer fabricate a bogus total", () => {
  it("providing ONLY equipment cost falls back to the estimate (not $100 vs $3000)", () => {
    const est = getEstimate();
    const rawCost = est.commercialSummary!.rawEstimatedCost;

    // The buggy path used to return actualFinalJobCost = 100 and a -97% variance.
    const analysis = analyzeEstimateCloseout(est, { actualEquipmentCost: 100 });

    expect(analysis.costVariance.actualFinalJobCost).toBe(rawCost);
    expect(analysis.costVariance.varianceAmount).toBe(0);
    expect(analysis.costVariance.variancePct).toBe(0);
    expect(analysis.costVariance.dataCompleteness).toBe("partial");
  });

  it("providing ONLY material cost falls back to the estimate", () => {
    const est = getEstimate();
    const rawCost = est.commercialSummary!.rawEstimatedCost;

    const analysis = analyzeEstimateCloseout(est, { actualMaterialCost: 1500 });

    // Not enough to derive (missing labor) — falls back safely.
    expect(analysis.costVariance.actualFinalJobCost).toBe(rawCost);
    expect(analysis.costVariance.varianceAmount).toBe(0);
    expect(analysis.costVariance.dataCompleteness).toBe("partial");
  });

  it("providing BOTH material AND labor derives a real total", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: 1500,
      actualLaborCost: 800,
    });

    expect(analysis.costVariance.actualFinalJobCost).toBe(2300);
    expect(analysis.costVariance.dataCompleteness).toBe("complete");
  });

  it("providing material+labor+regulatory sums all three", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: 1500,
      actualLaborCost: 800,
      actualRegulatoryCost: 250,
    });

    expect(analysis.costVariance.actualFinalJobCost).toBe(2550);
    expect(analysis.costVariance.dataCompleteness).toBe("complete");
  });

  it("providing explicit actualFinalJobCost is always complete", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, { actualFinalJobCost: 3500 });

    expect(analysis.costVariance.actualFinalJobCost).toBe(3500);
    expect(analysis.costVariance.dataCompleteness).toBe("complete");
  });

  it("completely empty actuals reports dataCompleteness=none with zero variance", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {});

    expect(analysis.costVariance.dataCompleteness).toBe("none");
    expect(analysis.costVariance.varianceAmount).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// C2 — Labor signal dedupe when both cost + hours provided
// ═════════════════════════════════════════════════════════════════

describe("C2 • Labor signals are not emitted twice", () => {
  it("one labor signal when both actualLaborCost and actualLaborHours are over", () => {
    const est = getEstimate();
    const estLaborCost = est.commercialSummary!.laborCostSubtotal;
    const estLaborHrs = est.totalLaborHrs;

    // Both 30% over estimate.
    const analysis = analyzeEstimateCloseout(est, {
      actualLaborCost: Math.round(estLaborCost * 1.30),
      actualLaborHours: estLaborHrs * 1.30,
    });

    const laborSignals = analysis.calibrationSignals.filter(
      s => s.type === "labor_underestimate" || s.type === "labor_overestimate",
    );
    // Pre-fix: two signals (one from category loop, one from hours loop).
    // Post-fix: exactly one, preferring the hours-based granular signal.
    expect(laborSignals).toHaveLength(1);
  });

  it("still emits a labor signal when only actualLaborCost is provided", () => {
    const est = getEstimate();
    const estLaborCost = est.commercialSummary!.laborCostSubtotal;

    const analysis = analyzeEstimateCloseout(est, {
      actualLaborCost: Math.round(estLaborCost * 1.30),
    });

    const laborSignals = analysis.calibrationSignals.filter(
      s => s.type === "labor_underestimate" || s.type === "labor_overestimate",
    );
    expect(laborSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("still emits a labor signal when only actualLaborHours is provided", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {
      actualLaborHours: est.totalLaborHrs * 1.30,
    });

    const laborSignals = analysis.calibrationSignals.filter(
      s => s.type === "labor_underestimate" || s.type === "labor_overestimate",
    );
    expect(laborSignals.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════
// C3 — Regulatory category emits calibration signals
// ═════════════════════════════════════════════════════════════════

describe("C3 • Regulatory surprises trigger calibration signals", () => {
  it("regulatory_missing fires when estimate had $0 regulatory but actual > $0", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: est.totalMaterialCost,
      actualLaborCost: est.totalLaborCost,
      actualRegulatoryCost: 500,
    });

    const regSignal = analysis.calibrationSignals.find(s => s.type === "regulatory_missing");
    expect(regSignal).toBeDefined();
    expect(regSignal!.recommendedDirection).toBe("review");
    expect(regSignal!.message).toContain("$500");
  });

  it("regulatory_missing at $500+ is high severity", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: est.totalMaterialCost,
      actualLaborCost: est.totalLaborCost,
      actualRegulatoryCost: 750,
    });
    const regSignal = analysis.calibrationSignals.find(s => s.type === "regulatory_missing");
    expect(regSignal!.severity).toBe("high");
  });

  it("small regulatory miss (<$500) is medium severity", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: est.totalMaterialCost,
      actualLaborCost: est.totalLaborCost,
      actualRegulatoryCost: 120,
    });
    const regSignal = analysis.calibrationSignals.find(s => s.type === "regulatory_missing");
    expect(regSignal!.severity).toBe("medium");
  });

  it("regulatory_underestimate fires when estimate > 0 and actual is higher", () => {
    const est = estimateFence(
      makeInput({ permitCost: 200 }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} },
    );

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: est.totalMaterialCost,
      actualLaborCost: est.totalLaborCost,
      actualRegulatoryCost: 600,
    });

    const regSignal = analysis.calibrationSignals.find(s => s.type === "regulatory_underestimate");
    expect(regSignal).toBeDefined();
    expect(regSignal!.recommendedDirection).toBe("increase");
  });
});

// ═════════════════════════════════════════════════════════════════
// C4 — Cold-start damping on updateWasteCalibration
// ═════════════════════════════════════════════════════════════════

describe("C4 • EWMA cold-start damping prevents overreaction on sparse data", () => {
  it("first-sample update (n=0) moves less than a mature EWMA update would", () => {
    const freshCal = { ...DEFAULT_WASTE_CALIBRATION, currentFactor: 0.05, sampleCount: 0 };
    const matureCal = { ...DEFAULT_WASTE_CALIBRATION, currentFactor: 0.05, sampleCount: 100 };

    // Feed the same anomalous sample into both calibrations.
    const freshAfter = updateWasteCalibration(freshCal, 0.20);
    const matureAfter = updateWasteCalibration(matureCal, 0.20);

    // Fresh calibration must move LESS than the mature one.
    const freshDelta = freshAfter.currentFactor - 0.05;
    const matureDelta = matureAfter.currentFactor - 0.05;
    expect(freshDelta).toBeLessThan(matureDelta);
  });

  it("first sample of 0.20 moves a fresh calibration less than 0.03 (half of naive α·Δ)", () => {
    const freshCal = { ...DEFAULT_WASTE_CALIBRATION, currentFactor: 0.05, sampleCount: 0 };
    const after = updateWasteCalibration(freshCal, 0.20);

    // Naive α=0.2 on Δ=0.15 would move 0.03. Damped first sample should be ~0.015.
    const delta = after.currentFactor - 0.05;
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(0.025); // well below the undamped 0.03
  });

  it("sample count increments normally", () => {
    const cal = { ...DEFAULT_WASTE_CALIBRATION, sampleCount: 0 };
    const after = updateWasteCalibration(cal, 0.06);
    expect(after.sampleCount).toBe(1);
  });

  it("effective alpha approaches configured alpha as sample count grows", () => {
    // Feed 50 identical samples and verify the calibration converges.
    let cal = { ...DEFAULT_WASTE_CALIBRATION };
    for (let i = 0; i < 50; i++) {
      cal = updateWasteCalibration(cal, 0.10);
    }
    // After 50 samples, effective α ≈ configured α, so currentFactor should
    // be very close to the incoming 0.10.
    expect(cal.currentFactor).toBeGreaterThan(0.095);
    expect(cal.currentFactor).toBeLessThanOrEqual(0.10);
    expect(cal.sampleCount).toBe(50);
  });

  it("respects min/max clamp bounds", () => {
    // Sanity: clamping still works after damping change.
    const cal = { ...DEFAULT_WASTE_CALIBRATION, currentFactor: 0.05 };
    const extreme = updateWasteCalibration(cal, 0.99);
    expect(extreme.currentFactor).toBeGreaterThanOrEqual(DEFAULT_WASTE_CALIBRATION.minFactor);
    expect(extreme.currentFactor).toBeLessThanOrEqual(DEFAULT_WASTE_CALIBRATION.maxFactor);
  });
});

// ═════════════════════════════════════════════════════════════════
// C5 — whatWentRight does not frame losses as wins
// ═════════════════════════════════════════════════════════════════

describe("C5 • Learning summary does not claim losses as wins", () => {
  it("whatWentRight is empty when no category is within ±5%", () => {
    const est = getEstimate();
    const estMat = est.commercialSummary!.materialCostSubtotal;
    const estLab = est.commercialSummary!.laborCostSubtotal;

    // Both categories 15% over — nothing is within ±5%.
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: Math.round(estMat * 1.15),
      actualLaborCost: Math.round(estLab * 1.15),
    });

    expect(analysis.learningSummary.whatWentRight).toEqual([]);
  });

  it("whatWentRight includes on-target categories when they exist", () => {
    const est = getEstimate();
    const estMat = est.commercialSummary!.materialCostSubtotal;
    const estLab = est.commercialSummary!.laborCostSubtotal;

    // Material spot-on, labor way over.
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: Math.round(estMat * 1.01),
      actualLaborCost: Math.round(estLab * 1.30),
    });

    expect(analysis.learningSummary.whatWentRight).toHaveLength(1);
    expect(analysis.learningSummary.whatWentRight[0]).toContain("Materials");
  });
});

// ═════════════════════════════════════════════════════════════════
// C6 — Concrete direction uses real direction, not dead ternary
// ═════════════════════════════════════════════════════════════════

describe("C6 • Concrete signal uses concrete_overestimate when fewer bags used", () => {
  it("using FEWER bags than estimated emits concrete_overestimate with decrease direction", () => {
    const est = getEstimate();
    const estBags = est.bom.find(b => b.sku === "CONCRETE_80LB")!.qty;

    const analysis = analyzeEstimateCloseout(est, {
      actualConcreteBags: Math.max(1, Math.floor(estBags * 0.60)), // 40% under
    });

    const concreteSignal = analysis.calibrationSignals.find(
      s => s.type === "concrete_overestimate" || s.type === "concrete_underestimate",
    );
    expect(concreteSignal).toBeDefined();
    expect(concreteSignal!.type).toBe("concrete_overestimate");
    expect(concreteSignal!.recommendedDirection).toBe("decrease");
  });

  it("using MORE bags than estimated emits concrete_underestimate with increase direction", () => {
    const est = getEstimate();
    const estBags = est.bom.find(b => b.sku === "CONCRETE_80LB")!.qty;

    const analysis = analyzeEstimateCloseout(est, {
      actualConcreteBags: Math.round(estBags * 1.40), // 40% over
    });

    const concreteSignal = analysis.calibrationSignals.find(
      s => s.type === "concrete_underestimate" || s.type === "concrete_overestimate",
    );
    expect(concreteSignal).toBeDefined();
    expect(concreteSignal!.type).toBe("concrete_underestimate");
    expect(concreteSignal!.recommendedDirection).toBe("increase");
  });
});
