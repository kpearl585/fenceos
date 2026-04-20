import { describe, expect, it } from "vitest";
import {
  toEstimatesFenceType,
  toFenceDesignsSoilType,
  toFenceDesignsHeightFt,
} from "../enum-normalizers";

describe("toEstimatesFenceType", () => {
  it("aliases 'wood' to 'wood_privacy'", () => {
    expect(toEstimatesFenceType("wood")).toBe("wood_privacy");
  });

  it.each(["vinyl", "chain_link", "aluminum", "wood_privacy"] as const)(
    "passes %s through untouched",
    (value) => {
      expect(toEstimatesFenceType(value)).toBe(value);
    }
  );

  it("throws on an unrecognized value", () => {
    expect(() => toEstimatesFenceType("wrought_iron")).toThrow(
      /Unsupported fenceType/
    );
  });

  it("throws on empty string", () => {
    expect(() => toEstimatesFenceType("")).toThrow(/Unsupported fenceType/);
  });
});

describe("toFenceDesignsSoilType", () => {
  it.each([
    ["standard",   "normal"],
    ["sandy",      "sandy"],
    ["sandy_loam", "sandy"],
    ["rocky",      "rocky"],
    ["clay",       "clay"],
    ["wet",        "clay"],
  ] as const)("maps %s → %s", (input, expected) => {
    expect(toFenceDesignsSoilType(input)).toBe(expected);
  });

  it("throws on an unknown soil type", () => {
    expect(() => toFenceDesignsSoilType("muddy")).toThrow(
      /Unsupported soilType/
    );
  });
});

describe("toFenceDesignsHeightFt", () => {
  it.each([
    [2,  4],
    [3,  4],
    [4,  4],
    [5,  4],
    [6,  6],
    [7,  6],
    [8,  8],
    [9,  8],
    [10, 8],
    [12, 8],
  ])("rounds %d ft → %d ft (nearest allowed)", (input, expected) => {
    expect(toFenceDesignsHeightFt(input)).toBe(expected);
  });

  it("handles fractional heights by cutoff (≤5 → 4, ≤7 → 6, else → 8)", () => {
    expect(toFenceDesignsHeightFt(4.9)).toBe(4);
    expect(toFenceDesignsHeightFt(5.0)).toBe(4);
    expect(toFenceDesignsHeightFt(5.5)).toBe(6);
    expect(toFenceDesignsHeightFt(6.4)).toBe(6);
    expect(toFenceDesignsHeightFt(7.0)).toBe(6);
    expect(toFenceDesignsHeightFt(7.1)).toBe(8);
  });

  it("throws on non-positive input", () => {
    expect(() => toFenceDesignsHeightFt(0)).toThrow(/Unsupported heightFt/);
    expect(() => toFenceDesignsHeightFt(-3)).toThrow(/Unsupported heightFt/);
    expect(() => toFenceDesignsHeightFt(NaN)).toThrow(/Unsupported heightFt/);
  });
});
