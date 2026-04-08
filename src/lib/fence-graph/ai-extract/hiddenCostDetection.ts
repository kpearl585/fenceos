// ── Hidden Cost Detection ────────────────────────────────────────────
// Simple rule-based detection of potential additional costs

import type { AiExtractionResult } from "./types";

export function detectHiddenCosts(
  userInput: string,
  extraction: AiExtractionResult
): string[] {
  const flags: string[] = [];
  const input = userInput.toLowerCase();

  // 1. Difficult Access
  if (
    input.includes("tight") ||
    input.includes("narrow") ||
    input.includes("no access") ||
    input.includes("no gate") ||
    input.includes("small gate") ||
    input.includes("hand-carry") ||
    input.includes("carry materials")
  ) {
    flags.push("Difficult access may require hand-carrying materials (+$200–$400)");
  }

  // 2. Tree Removal / Obstacles
  if (
    input.includes("tree") ||
    input.includes("trees") ||
    input.includes("roots") ||
    input.includes("bush") ||
    input.includes("bushes") ||
    input.includes("shrub") ||
    input.includes("obstacle")
  ) {
    flags.push("Tree/obstacle removal may be required (+$300–$900)");
  }

  // 3. Wet Soil / Concrete Required
  const hasWetSoil = extraction.runs.some(run => run.soilType === "wet");
  if (hasWetSoil || input.includes("wet") || input.includes("swamp") || input.includes("soggy")) {
    flags.push("Wet soil may require concrete-set posts (+$8–$12 per post)");
  }

  // 4. Rocky Soil / Difficult Digging
  const hasRockySoil = extraction.runs.some(run => run.soilType === "rocky");
  if (hasRockySoil || input.includes("rock") || input.includes("rocks") || input.includes("hard soil")) {
    flags.push("Rocky soil may require specialized equipment (+$150–$400)");
  }

  // 5. Steep Slope / Complex Installation
  const hasSteepSlope = extraction.runs.some(run => run.slopePercent > 10);
  if (hasSteepSlope) {
    flags.push("Steep slope increases labor complexity (+10–25% labor cost)");
  }

  // 6. Pool Code Compliance
  const hasPoolCode = extraction.runs.some(run => run.poolCode);
  if (hasPoolCode) {
    flags.push("Pool code compliance may require additional inspections");
  }

  // 7. Wind Exposure / Reinforcement
  const hasWindExposure = extraction.runs.some(run => run.isWindExposed);
  if (hasWindExposure) {
    flags.push("Wind exposure may require reinforced posts/concrete (+$100–$300)");
  }

  // 8. HOA Approval
  if (
    input.includes("hoa") ||
    input.includes("homeowner") ||
    input.includes("association") ||
    input.includes("approval required")
  ) {
    flags.push("HOA approval required (2–4 week delay risk)");
  }

  // 9. Utility Locate
  if (
    input.includes("underground") ||
    input.includes("utility") ||
    input.includes("811") ||
    input.includes("gas line") ||
    input.includes("electric")
  ) {
    flags.push("Utility location required before digging (3–5 day delay)");
  }

  // 10. Large Property / Site Challenges
  const totalFeet = extraction.runs.reduce((sum, run) => sum + run.linearFeet, 0);
  if (totalFeet > 500) {
    flags.push("Large property may require additional equipment/crew");
  }

  // 11. Gate Count Issues
  const totalGates = extraction.runs.reduce((sum, run) => sum + run.gates.length, 0);
  if (totalGates > 3) {
    flags.push(`Multiple gates (${totalGates}) increase material and labor costs`);
  }

  // 12. Mixed Heights / Complex Design
  const heights = extraction.runs.map(run => run.heightFt);
  const hasMultipleHeights = new Set(heights).size > 1;
  if (hasMultipleHeights) {
    flags.push("Mixed fence heights increase installation complexity");
  }

  // 13. Commercial Property
  if (
    input.includes("commercial") ||
    input.includes("parking lot") ||
    input.includes("warehouse") ||
    input.includes("business")
  ) {
    flags.push("Commercial property may require permits and business insurance");
  }

  // Deduplicate flags (in case multiple rules trigger the same flag)
  return Array.from(new Set(flags));
}
