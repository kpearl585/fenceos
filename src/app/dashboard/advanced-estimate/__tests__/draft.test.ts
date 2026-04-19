import { describe, expect, it } from "vitest";
import { maxIdSuffix, parseDraft, serializeDraft, type EstimatorDraft } from "../draft";

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
  runsMode: "advanced",
  simpleTotalFeet: 120,
  simpleCorners: 2,
  simpleShape: "open",
  runs: [
    { id: "run_1", linearFeet: 40, startType: "end", endType: "corner", slopeDeg: 0 },
    { id: "run_2", linearFeet: 40, startType: "corner", endType: "corner", slopeDeg: 5, slopeMethod: "racked" },
    { id: "run_3", linearFeet: 40, startType: "corner", endType: "end", notes: "shady side" },
  ],
  gates: [
    { id: "gate_1", afterRunId: "run_2", gateType: "single", widthFt: 4, isPoolGate: false },
    { id: "gate_2", afterRunId: "run_3", gateType: "double", widthFt: 10, isPoolGate: true },
  ],
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

  // v1 drafts saved before runs/gates/mode fields existed should still
  // restore cleanly — new fields are optional and simply absent.
  it("accepts v1 drafts without runs/gates/mode fields", () => {
    const v1 = JSON.stringify({
      projectName: "v1 draft",
      laborRate: 55,
      customer: { name: "Jane", address: "", city: "", phone: "", email: "" },
    });
    const parsed = parseDraft(v1);
    expect(parsed?.projectName).toBe("v1 draft");
    expect(parsed?.runs).toBeUndefined();
    expect(parsed?.gates).toBeUndefined();
    expect(parsed?.runsMode).toBeUndefined();
  });

  it("drops invalid runs[] items individually without nuking the whole array", () => {
    const raw = JSON.stringify({
      runs: [
        { id: "run_1", linearFeet: 40, startType: "end", endType: "corner" }, // keep
        { id: "run_2", linearFeet: "40", startType: "end", endType: "end" }, // linearFeet is string — drop
        { id: "", linearFeet: 10, startType: "end", endType: "end" }, // empty id — drop
        { id: "run_4", linearFeet: 20, startType: "bogus", endType: "end" }, // bad enum — drop
        { id: "run_5", linearFeet: 25, startType: "corner", endType: "end", slopeDeg: NaN }, // keep but drop slopeDeg
        "not an object", // drop
      ],
    });
    const parsed = parseDraft(raw);
    expect(parsed?.runs).toHaveLength(2);
    expect(parsed?.runs?.[0].id).toBe("run_1");
    expect(parsed?.runs?.[1].id).toBe("run_5");
    expect(parsed?.runs?.[1].slopeDeg).toBeUndefined();
  });

  it("drops invalid gates[] items individually", () => {
    const raw = JSON.stringify({
      gates: [
        { id: "gate_1", afterRunId: "run_1", gateType: "single", widthFt: 4, isPoolGate: false }, // keep
        { id: "gate_2", afterRunId: "run_2", gateType: "triple", widthFt: 10, isPoolGate: false }, // bad enum
        { id: "gate_3", afterRunId: "", gateType: "single", widthFt: 4, isPoolGate: false }, // empty afterRunId
        { id: "gate_4", afterRunId: "run_3", gateType: "single", widthFt: 4, isPoolGate: "yes" }, // bad bool
      ],
    });
    const parsed = parseDraft(raw);
    expect(parsed?.gates).toHaveLength(1);
    expect(parsed?.gates?.[0].id).toBe("gate_1");
  });

  it("rejects non-array runs/gates", () => {
    const raw = JSON.stringify({
      runs: { fake: "object" },
      gates: "not an array",
    });
    const parsed = parseDraft(raw);
    expect(parsed?.runs).toBeUndefined();
    expect(parsed?.gates).toBeUndefined();
  });

  it("drops invalid runsMode / simpleShape enum values", () => {
    const raw = JSON.stringify({
      runsMode: "hybrid",
      simpleShape: "triangle",
      simpleTotalFeet: "120", // string, not number
    });
    const parsed = parseDraft(raw);
    expect(parsed?.runsMode).toBeUndefined();
    expect(parsed?.simpleShape).toBeUndefined();
    expect(parsed?.simpleTotalFeet).toBeUndefined();
  });
});

describe("maxIdSuffix", () => {
  it("returns the highest numeric suffix for a given prefix", () => {
    expect(maxIdSuffix([{ id: "run_1" }, { id: "run_3" }, { id: "run_2" }], "run")).toBe(3);
  });

  it("ignores items that don't match the prefix pattern", () => {
    expect(maxIdSuffix([{ id: "run_1" }, { id: "gate_5" }, { id: "simple_9" }], "run")).toBe(1);
  });

  it("returns 0 when no items match", () => {
    expect(maxIdSuffix([{ id: "simple_0" }, { id: "other_7" }], "run")).toBe(0);
    expect(maxIdSuffix([], "run")).toBe(0);
  });

  it("ignores non-numeric suffixes", () => {
    expect(maxIdSuffix([{ id: "run_abc" }, { id: "run_" }, { id: "run_2" }], "run")).toBe(2);
  });
});
