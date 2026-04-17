import { describe, expect, it } from "vitest";
import { parseDraft, serializeDraft, type EstimatorDraft } from "../draft";

const fullDraft: EstimatorDraft = {
  projectName: "Smith — backyard",
  fenceType: "vinyl",
  productLineId: "vinyl_privacy_6ft",
  woodStyle: "dog_ear_privacy",
  soilType: "sandy_loam",
  laborRate: 55,
  wastePct: 8,
  markupPct: 35,
  windMode: false,
  existingFenceRemoval: true,
  laborEfficiency: 1.0,
  permitCost: 125,
  inspectionCost: 50,
  engineeringCost: 0,
  surveyCost: 0,
  customer: {
    name: "John Smith",
    address: "123 Elm",
    city: "Austin",
    phone: "512-555-0100",
    email: "js@example.com",
  },
};

describe("draft serialize/parse roundtrip", () => {
  it("round-trips a full draft without losing any field", () => {
    const raw = serializeDraft(fullDraft);
    const parsed = parseDraft(raw);
    expect(parsed).toEqual(fullDraft);
  });

  it("returns null for null / empty / undefined input", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft(undefined)).toBeNull();
    expect(parseDraft("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft("null")).toBeNull();
    // Primitive JSON is valid but not a draft object.
    expect(parseDraft('"just a string"')).toBeNull();
    expect(parseDraft("42")).toBeNull();
  });

  it("drops fields with wrong runtime types instead of blowing up", () => {
    // A corrupted draft where numbers were stringified and a bool flipped
    // to a number. Each bad field should be dropped; good fields retained.
    const corrupted = JSON.stringify({
      projectName: "OK",
      laborRate: "55", // string, not number — drop
      wastePct: NaN, // not finite — drop
      windMode: 1, // number, not boolean — drop
      customer: "not an object", // drop entire customer
      fenceType: "vinyl", // keep
    });
    const parsed = parseDraft(corrupted);
    expect(parsed).not.toBeNull();
    expect(parsed?.projectName).toBe("OK");
    expect(parsed?.fenceType).toBe("vinyl");
    expect(parsed?.laborRate).toBeUndefined();
    expect(parsed?.wastePct).toBeUndefined();
    expect(parsed?.windMode).toBeUndefined();
    expect(parsed?.customer).toBeUndefined();
  });

  it("fills missing customer sub-fields with empty strings rather than leaking undefined", () => {
    // A draft saved before a customer field existed — restore should
    // yield a complete customer object with blanks, not partial undefineds
    // (keeps the controlled <input value={...}> contract clean).
    const raw = JSON.stringify({
      customer: { name: "Only name saved" },
    });
    const parsed = parseDraft(raw);
    expect(parsed?.customer).toEqual({
      name: "Only name saved",
      address: "",
      city: "",
      phone: "",
      email: "",
    });
  });

  it("rejects customer as an array (would otherwise pass typeof object)", () => {
    const raw = JSON.stringify({ customer: ["nope"] });
    const parsed = parseDraft(raw);
    expect(parsed?.customer).toBeUndefined();
  });

  it("ignores unknown extra fields (forward-compat)", () => {
    const raw = JSON.stringify({
      projectName: "Keep",
      futureField: "ignore me",
      anotherUnknown: { nested: true },
    });
    const parsed = parseDraft(raw);
    expect(parsed?.projectName).toBe("Keep");
    expect(parsed).not.toHaveProperty("futureField");
    expect(parsed).not.toHaveProperty("anotherUnknown");
  });
});
