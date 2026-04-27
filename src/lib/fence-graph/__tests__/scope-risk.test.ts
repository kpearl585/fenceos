import { describe, expect, it } from "vitest";
import { buildScopeRiskAssessment } from "../ai-extract/scopeRisk";
import type { AiExtractionResult } from "../ai-extract/types";

function makeExtraction(overrides: Partial<AiExtractionResult> = {}): AiExtractionResult {
  return {
    runs: [
      {
        linearFeet: 180,
        fenceType: "vinyl",
        productLineId: "vinyl_privacy_6ft",
        heightFt: 6,
        gates: [],
        soilType: "standard",
        slopePercent: 0,
        isWindExposed: false,
        poolCode: false,
        runLabel: "Back yard",
      },
    ],
    confidence: 0.82,
    flags: [],
    rawSummary: "180ft vinyl privacy fence",
    ...overrides,
  };
}

describe("buildScopeRiskAssessment", () => {
  it("asks for soil, demo, access, and obstacles when the input is missing them", () => {
    const assessment = buildScopeRiskAssessment(
      "180 foot vinyl privacy fence in the back yard",
      makeExtraction()
    );

    expect(assessment.questions.map((q) => q.field)).toEqual(
      expect.arrayContaining(["soilType", "demoRequired", "accessDifficulty", "obstacles"])
    );
  });

  it("suppresses questions that are already explicit in the input", () => {
    const assessment = buildScopeRiskAssessment(
      "180 foot vinyl privacy fence, full tear-out, rocky soil, tight backyard access, trees in line, HOA approval required",
      makeExtraction({
        runs: [
          {
            linearFeet: 180,
            fenceType: "vinyl",
            productLineId: "vinyl_privacy_6ft",
            heightFt: 6,
            gates: [],
            soilType: "rocky",
            slopePercent: 0,
            isWindExposed: false,
            poolCode: false,
            runLabel: "Back yard",
          },
        ],
      })
    );

    expect(assessment.questions.length).toBe(0);
  });

  it("raises permit complexity when pool signals are present", () => {
    const assessment = buildScopeRiskAssessment(
      "pool fence around back yard",
      makeExtraction({
        runs: [
          {
            linearFeet: 120,
            fenceType: "aluminum",
            productLineId: "aluminum_4ft",
            heightFt: 4,
            gates: [{ widthFt: 4, type: "pool" }],
            soilType: "standard",
            slopePercent: 0,
            isWindExposed: false,
            poolCode: true,
            runLabel: "Pool enclosure",
          },
        ],
      })
    );

    expect(assessment.questions.some((q) => q.field === "permitComplexity" && q.priority === "high")).toBe(true);
  });
});
