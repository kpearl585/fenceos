import { describe, expect, it } from "vitest";
import { validateEstimateBeforeConvert } from "../validation";
import type { FenceEstimateResult } from "@/lib/fence-graph/engine";

function makeResult(overrides: Partial<FenceEstimateResult> = {}): FenceEstimateResult {
  return {
    projectId: "p1",
    projectName: "Test",
    graph: {
      projectId: "p1",
      productLine: {
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
      installRules: {
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
      siteConfig: {
        soilType: "standard",
        soilConcreteFactor: 1,
        hurricaneZone: false,
        floodZone: false,
        existingFenceRemoval: false,
        surfaceType: "ground",
        obstacleCt: 0,
      },
      nodes: [],
      edges: [],
      windMode: false,
      audit: {
        extractionMethod: "manual_input",
        extractionDate: new Date().toISOString(),
        overallConfidence: 0.9,
        manualOverrides: 0,
      },
    },
    bom: [{ sku: "POST", name: "Post", category: "posts", unit: "ea", qty: 1, unitCost: 10, extCost: 10, confidence: 0.95, traceability: "test" }],
    laborDrivers: [],
    totalMaterialCost: 10,
    totalLaborHrs: 1,
    totalLaborCost: 65,
    totalCost: 75,
    deterministicScrap_in: 0,
    probabilisticWastePct: 0.05,
    overallConfidence: 0.9,
    redFlagItems: [],
    auditTrail: [],
    ...overrides,
  };
}

describe("validateEstimateBeforeConvert", () => {
  it("returns null when both project name and customer name are present", () => {
    expect(
      validateEstimateBeforeConvert({
        projectName: "Smith Backyard",
        customerName: "John Smith",
      }),
    ).toBeNull();
  });

  it("flags empty project name", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "",
      customerName: "John Smith",
    });
    expect(err?.fieldId).toBe("est-project-name");
    expect(err?.message).toMatch(/name/i);
  });

  it("flags whitespace-only project name (trim)", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "   \t  ",
      customerName: "John",
    });
    expect(err?.fieldId).toBe("est-project-name");
  });

  it('rejects the default "New Estimate" placeholder (case-insensitive)', () => {
    // Without this check, users who never renamed the estimate silently
    // accumulate identical "New Estimate" entries in their list.
    expect(
      validateEstimateBeforeConvert({
        projectName: "New Estimate",
        customerName: "John",
      })?.fieldId,
    ).toBe("est-project-name");

    expect(
      validateEstimateBeforeConvert({
        projectName: "new estimate",
        customerName: "John",
      })?.fieldId,
    ).toBe("est-project-name");

    expect(
      validateEstimateBeforeConvert({
        projectName: "  New Estimate  ",
        customerName: "John",
      })?.fieldId,
    ).toBe("est-project-name");
  });

  it("a project name containing the default phrase is still valid", () => {
    // "New Estimate for Smith" is clearly renamed — don't block it.
    expect(
      validateEstimateBeforeConvert({
        projectName: "New Estimate for Smith",
        customerName: "John",
      }),
    ).toBeNull();
  });

  it("flags missing customer name when project name is valid", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "Smith Backyard",
      customerName: "",
    });
    expect(err?.fieldId).toBe("est-cust-name");
    expect(err?.message).toMatch(/customer/i);
  });

  it("flags whitespace-only customer name (trim)", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "Smith Backyard",
      customerName: "   ",
    });
    expect(err?.fieldId).toBe("est-cust-name");
  });

  it("surfaces project-name error first when both fields are invalid (order lock)", () => {
    // Contract: project-name error takes priority so the user fixes it
    // before being told about the customer. If this order ever flips,
    // the scroll-to-field behavior in useEstimateActions breaks.
    const err = validateEstimateBeforeConvert({
      projectName: "",
      customerName: "",
    });
    expect(err?.fieldId).toBe("est-project-name");
  });

  it("blocks conversion when the estimate has confidence blockers", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "Smith Backyard",
      customerName: "John Smith",
      result: makeResult({
        confidenceReviewGates: [
          {
            id: "corner-angles-missing",
            fieldId: "est-runs",
            severity: "blocker",
            message: "Add corner angles before sending the quote.",
          },
        ],
      }),
    });

    expect(err?.fieldId).toBe("est-runs");
    expect(err?.message).toMatch(/corner angles/i);
  });

  it("does not block conversion for review-only confidence prompts", () => {
    expect(
      validateEstimateBeforeConvert({
        projectName: "Smith Backyard",
        customerName: "John Smith",
        markupPct: 35,
        targetMarginPct: 35,
        result: makeResult({
          confidenceReviewGates: [
            {
              id: "site-complexity-review",
              fieldId: "est-site-complexity",
              severity: "review",
              message: "Consider adding site complexity.",
            },
          ],
        }),
      }),
    ).toBeNull();
  });

  it("blocks conversion when margin risk falls below the hard safety floor", () => {
    const err = validateEstimateBeforeConvert({
      projectName: "Smith Backyard",
      customerName: "John Smith",
      markupPct: 15,
      targetMarginPct: 35,
      result: makeResult({
        laborModelHealth: {
          siteComplexityBand: "difficult",
          adaptiveSampleCount: 0,
          learnedMultiplier: 1,
          calibrationConfidence: "low",
          notes: [],
        },
      }),
    });

    expect(err?.fieldId).toBe("est-margin-risk");
    expect(err?.message).toMatch(/hard safety floor/i);
  });

  it("does not block conversion for risky-but-not-blocked margin scenarios", () => {
    expect(
      validateEstimateBeforeConvert({
        projectName: "Smith Backyard",
        customerName: "John Smith",
        markupPct: 35,
        targetMarginPct: 35,
        result: makeResult({
          laborModelHealth: {
            siteComplexityBand: "difficult",
            adaptiveSampleCount: 1,
            learnedMultiplier: 1,
            calibrationConfidence: "low",
            notes: [],
          },
        }),
      }),
    ).toBeNull();
  });
});
