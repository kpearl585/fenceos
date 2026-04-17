import { describe, expect, it } from "vitest";
import { validateEstimateBeforeConvert } from "../validation";

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
});
