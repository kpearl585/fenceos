// ── Picket Count Calculation Utilities ──────────────────────────────
// Handles both gap-based and overlap-based picket calculations

/**
 * Calculate picket count using overlap formula for board-on-board systems
 *
 * Formula: pickets = ceil((fenceLength - picketWidth) / (picketWidth - overlap) + 1)
 *
 * @param lengthInches - Total fence length in inches
 * @param picketWidthInches - Width of individual picket in inches
 * @param overlapInches - Amount of overlap between adjacent pickets in inches
 * @param wastePct - Waste percentage (e.g., 0.05 for 5%)
 * @returns Total picket count including waste
 */
export function calculateOverlapPicketCount(
  lengthInches: number,
  picketWidthInches: number,
  overlapInches: number,
  wastePct: number
): number {
  // Edge case: If no overlap (gap-based), fall back to simple division
  if (overlapInches <= 0) {
    const picketsPerInch = 1 / picketWidthInches;
    return Math.ceil(lengthInches * picketsPerInch * (1 + wastePct));
  }

  // Overlap formula: Number of pickets needed to cover length with overlap
  // First picket covers picketWidth
  // Each subsequent picket adds (picketWidth - overlap) to coverage
  // Total coverage = picketWidth + (n-1) × (picketWidth - overlap)
  // Solving for n: n = (length - picketWidth) / (picketWidth - overlap) + 1

  const baseCount = (lengthInches - picketWidthInches) / (picketWidthInches - overlapInches) + 1;
  const countWithWaste = baseCount * (1 + wastePct);

  return Math.ceil(countWithWaste);
}

/**
 * Calculate default overlap amount as percentage of picket width
 * Industry standard for board-on-board is 20-25% overlap
 *
 * @param picketWidthInches - Width of picket in inches
 * @param overlapPct - Overlap percentage (default: 0.24 = 24%)
 * @returns Overlap amount in inches
 */
export function calculateDefaultOverlap(
  picketWidthInches: number,
  overlapPct: number = 0.24
): number {
  return picketWidthInches * overlapPct;
}

/**
 * Calculate picket count for board-on-board fence
 * Board-on-board uses two layers of overlapping pickets
 *
 * @param lengthInches - Total fence length in inches
 * @param picketWidthInches - Width of individual picket (typically 5.5" for 1×6)
 * @param overlapPct - Overlap percentage (default: 0.24 = 24%)
 * @param wastePct - Waste percentage (e.g., 0.05 for 5%)
 * @returns Object with frontCount, backCount, and total
 */
export function calculateBoardOnBoardCount(
  lengthInches: number,
  picketWidthInches: number = 5.5,
  overlapPct: number = 0.24,
  wastePct: number = 0.05
): { frontCount: number; backCount: number; total: number; overlapInches: number } {
  const overlapInches = calculateDefaultOverlap(picketWidthInches, overlapPct);
  const frontCount = calculateOverlapPicketCount(lengthInches, picketWidthInches, overlapInches, wastePct);

  // Board-on-board uses same count front and back (alternating pattern)
  const backCount = frontCount;
  const total = frontCount + backCount;

  return {
    frontCount,
    backCount,
    total,
    overlapInches
  };
}

/**
 * Calculate picket count using gap-based spacing (traditional picket fence)
 *
 * @param lengthFeet - Total fence length in feet
 * @param picketsPerFoot - Number of pickets per linear foot (e.g., 3 for 4" spacing)
 * @param wastePct - Waste percentage (e.g., 0.05 for 5%)
 * @returns Total picket count including waste
 */
export function calculateGapBasedPicketCount(
  lengthFeet: number,
  picketsPerFoot: number,
  wastePct: number
): number {
  return Math.ceil(lengthFeet * picketsPerFoot * (1 + wastePct));
}

/**
 * Helper: Convert feet to inches
 */
export function feetToInches(feet: number): number {
  return feet * 12;
}

/**
 * Helper: Convert inches to feet
 */
export function inchesToFeet(inches: number): number {
  return inches / 12;
}
