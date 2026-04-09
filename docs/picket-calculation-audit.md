# Picket Calculation Audit - Current Logic

**Date:** April 9, 2026  
**Purpose:** Audit current picket counting logic before implementing overlap-based calculations

---

## Executive Summary

**Current Approach:** Simple linear feet (LF) based estimation  
**Method:** Fixed pickets-per-foot multiplier  
**Accuracy:** Adequate for standard spacing, but inaccurate for overlap systems

**Systems Affected:**
- Wood picket fences
- Vinyl component systems (privacy with individual pickets)
- Board-on-board (defined but not specially handled)

---

## Current Implementation

### Wood Picket Calculation

**File:** `src/lib/fence-graph/bom/woodBom.ts` (lines 67-74)

**Logic:**
```typescript
if (isPicket) {
  const totalRunLF = segEdges.reduce((s, e) => s + e.length_in / 12, 0);
  const picketSku = heightFt > 6 ? "WOOD_PICKET_8FT" : "WOOD_PICKET_6FT";
  // Standard pickets: 3.5" wide, 0.5" gap → ~4" per picket → 3 per LF
  const picketCount = Math.ceil(totalRunLF * 3 * (1 + wastePct));
  bom.push(makeBomItem(picketSku, `Wood Picket ${heightFt}ft`, "panels", "ea", picketCount, 0.92,
    `${totalRunLF.toFixed(1)} LF × 3 pickets/ft + ${Math.round(wastePct * 100)}% waste`, p(picketSku)));
  audit.push(`Picket fence: ${totalRunLF.toFixed(1)} LF → ${picketCount} pickets`);
}
```

**Assumptions:**
- Picket width: 3.5 inches
- Gap between pickets: 0.5 inches
- Spacing: 4 inches per picket (3.5" + 0.5" gap)
- **Pickets per foot:** 3 (12" ÷ 4" = 3)

**Formula:**
```
picketCount = ceil(totalRunLF × 3 × (1 + wastePct))
```

**Issues:**
- ❌ Does NOT account for overlap (board-on-board style)
- ❌ Assumes gap-based spacing, not overlap-based
- ❌ Board-on-board style defined but not implemented
- ✅ Works for standard picket fences with gaps

---

### Vinyl Component System Calculation

**File:** `src/lib/fence-graph/bom/vinylBom.ts` (lines 92-109)

**Logic:**
```typescript
if (isComponentSystem) {
  // Component system: calculate individual pickets with slope adjustment
  const picketsPerFoot = 2; // Standard 6" on-center spacing
  const slopeAdjustedLF = totalLinearFeet * (1 + (slopeAdjustmentFactor / totalPanels));
  const picketCount = Math.ceil(slopeAdjustedLF * picketsPerFoot * (1 + wastePct + 0.05)); // +5% extra for damage

  const picketSku = productLine.panelHeight_in >= 96 ? "VINYL_PICKET_8FT" :
                    productLine.panelHeight_in >= 72 ? "VINYL_PICKET_6FT" : "VINYL_PICKET_4FT";

  bom.push(makeBomItem(
    picketSku,
    `Vinyl Privacy Picket ${productLine.panelHeight_in / 12}ft`,
    "pickets",
    "ea",
    picketCount,
    0.90,
    `${Math.round(totalLinearFeet)}ft × ${picketsPerFoot} pickets/ft${slopeNote} + ${Math.round((wastePct + 0.05) * 100)}% waste`,
    p(picketSku)
  ));
}
```

**Assumptions:**
- On-center spacing: 6 inches
- **Pickets per foot:** 2 (12" ÷ 6" = 2)
- Slope adjustment included
- Extra 5% damage allowance

**Formula:**
```
slopeAdjustedLF = totalLinearFeet × (1 + slopeAdjustmentFactor / totalPanels)
picketCount = ceil(slopeAdjustedLF × 2 × (1 + wastePct + 0.05))
```

**Issues:**
- ❌ Does NOT account for overlap
- ❌ Assumes on-center spacing
- ✅ Includes slope adjustment
- ✅ Includes damage allowance

---

## Wood Style Types

**Defined Styles:** `src/lib/fence-graph/bom/woodBom.ts:9`

```typescript
export type WoodStyle = "dog_ear_privacy" | "flat_top_privacy" | "picket" | "board_on_board";
```

**Current Handling:**
- `dog_ear_privacy`: Uses panel-based calculation
- `flat_top_privacy`: Uses panel-based calculation
- `picket`: Uses LF-based calculation (3 per foot)
- `board_on_board`: **DEFINED BUT NOT SPECIALLY HANDLED** ⚠️

**Issue:** `board_on_board` currently falls through to the same logic as regular picket fences, which is incorrect because board-on-board requires overlapping pickets, not gaps.

---

## Mathematical Comparison

### Current Method (Gap-Based)

**Example:** 100 LF fence, 3.5" pickets, 0.5" gap

```
Spacing per picket = 3.5" + 0.5" = 4"
Pickets per foot = 12" ÷ 4" = 3
Total pickets = 100 LF × 3 = 300 pickets
```

**Correct for:** Standard picket fences with visible gaps

---

### Overlap Method (Needed for Board-on-Board)

**Example:** 100 LF fence, 5.5" pickets, 1" overlap

**Correct Formula:**
```
pickets = ceil((fenceLength - picketWidth) / (picketWidth - overlap) + 1)
pickets = ceil((1200" - 5.5") / (5.5" - 1") + 1)
pickets = ceil(1194.5 / 4.5 + 1)
pickets = ceil(265.4 + 1)
pickets = 266 pickets
```

**Comparison:**
- Current method (gap-based): Would use 3 per foot = 300 pickets
- Overlap method: 266 pickets
- **Difference:** 34 pickets (11.3% over-estimation)

**Issue:** Current method would over-estimate material for overlap systems

---

## Board-on-Board Characteristics

**What is Board-on-Board:**
- Two layers of pickets on alternating sides of rails
- Pickets overlap by 0.5-1.5 inches (typically ~24% of width)
- Creates privacy while allowing air flow
- No visible gaps when viewed straight-on

**Typical Dimensions:**
- Picket width: 5.5" - 6" (standard 1×6 board)
- Overlap: 1" - 1.5" (approximately 18-25% of width)
- **Effective coverage per picket:** Width - Overlap

**Material Count:**
- Front pickets: Calculated using overlap formula
- Back pickets: Same count as front pickets
- **Total:** 2× front picket count (for both sides)

---

## Identified Issues

### Issue #1: Board-on-Board Not Implemented

**Severity:** HIGH

**Description:** `board_on_board` is defined as a WoodStyle type but not specially handled in the BOM generation logic.

**Current Behavior:** Falls through to standard picket calculation (3 per foot gap-based)

**Expected Behavior:** Should use overlap-based calculation with 2× multiplier for front + back boards

**Impact:** 
- Incorrect material counts
- Over-estimation of pickets needed
- Wrong pricing for board-on-board projects

---

### Issue #2: No Overlap Support for Any Picket Type

**Severity:** MEDIUM

**Description:** None of the picket systems support overlap-based calculation, even though some installations use overlapping pickets.

**Affected Systems:**
- Wood picket (could use overlap)
- Vinyl component privacy (uses tight-fit, not overlap)
- Board-on-board (requires overlap)

**Impact:**
- Inaccurate material counts for overlap installations
- Cannot correctly price board-on-board fences

---

### Issue #3: Hardcoded Pickets-Per-Foot

**Severity:** LOW

**Description:** Pickets per foot is hardcoded (3 for wood, 2 for vinyl) rather than calculated from picket width and spacing.

**Issues:**
- Cannot adapt to different picket widths
- Cannot support custom spacing requirements
- Less flexible for future material types

**Current Code:**
```typescript
// Wood
const picketCount = Math.ceil(totalRunLF * 3 * (1 + wastePct));

// Vinyl
const picketsPerFoot = 2; // Standard 6" on-center spacing
```

**Better Approach:** Calculate from dimensions
```typescript
const effectiveSpacing = picketWidth + gap; // For gap-based
const effectiveSpacing = picketWidth - overlap; // For overlap-based
const picketsPerFoot = 12 / effectiveSpacing;
```

---

## Validation Against Test Suite

### Wood Picket Jobs in Validation

**Job #5: Wood Picket 4ft - 220LF**
- Current calculation: 220 LF × 3 = 660 pickets (with waste: ~693)
- Actual BOM should match this for standard gap-based picket fence
- ✅ Likely correct for standard picket (not board-on-board)

**Job #31: Wood Picket Short Run - 100LF**
- Current calculation: 100 LF × 3 = 300 pickets (with waste: ~315)
- ✅ Likely correct for standard picket (not board-on-board)

**Status:** Current tests use standard gap-based picket fences, so current logic is likely correct for those specific jobs.

---

## Recommended Changes

### Change #1: Implement Overlap Calculation Function

Create a new function to calculate picket count using overlap formula:

```typescript
function calculatePicketCount(
  lengthInches: number,
  picketWidth: number,
  overlap: number,
  wastePct: number
): number {
  // Formula: pickets = ceil((L - W) / (W - O) + 1)
  const baseCount = Math.ceil((lengthInches - picketWidth) / (picketWidth - overlap) + 1);
  return Math.ceil(baseCount * (1 + wastePct));
}
```

---

### Change #2: Add Board-on-Board Support

Detect and handle `board_on_board` style:

```typescript
const isBoardOnBoard = style === "board_on_board";

if (isBoardOnBoard) {
  // Use overlap calculation
  const picketWidth = 5.5; // Standard 1×6 board
  const overlap = picketWidth * 0.24; // ~24% overlap (1.32")
  const frontCount = calculatePicketCount(totalRunInches, picketWidth, overlap, wastePct);
  const totalCount = frontCount * 2; // Front + back boards
  
  // Add to BOM
  bom.push(makeBomItem(...));
  audit.push(`Board-on-board: ${frontCount} front + ${frontCount} back = ${totalCount} total pickets`);
}
```

---

### Change #3: Preserve Existing Gap-Based Logic

Keep current logic for standard picket fences:

```typescript
else if (isPicket) {
  // Existing gap-based logic (3 per foot for wood)
  const picketCount = Math.ceil(totalRunLF * 3 * (1 + wastePct));
  // ... existing code
}
```

---

## System Integration Plan

### Apply Overlap Logic To:

1. **Wood Board-on-Board** ✅
   - Style: `"board_on_board"`
   - Picket width: 5.5" (1×6 board)
   - Default overlap: 24% (1.32")
   - Count: 2× (front + back)

2. **Future: Custom Overlap Picket** (optional)
   - Could add flag or parameter for overlap vs gap
   - Would allow flexibility for different installation styles

### Do NOT Apply To:

1. **Pre-fab Panels** ❌
   - Vinyl panels
   - Wood panels
   - These are sold as complete units

2. **Standard Gap Picket** ❌
   - Current wood picket with gaps (style: "picket")
   - Current vinyl picket (pre-fab panels)
   - Keep existing logic for backward compatibility

3. **Chain Link** ❌
   - Uses fabric, not pickets
   - No changes needed

4. **Aluminum** ❌
   - Uses panels or pickets with different spacing
   - No changes needed

---

## Impact Analysis

### Material Count Changes

**Board-on-Board (100 LF fence):**
- Current (incorrect): ~300 pickets (gap-based 3/ft)
- Correct (overlap): ~266 pickets per side × 2 = 532 total
- **Difference:** +232 pickets (+77%) 🔺

**Pricing Impact:**
- Current pricing likely underestimates board-on-board
- More accurate material count will increase estimates
- Labor should also increase (2× installation work)

### Backward Compatibility

**No Changes To:**
- Existing picket fence calculations (gap-based)
- Vinyl component systems (unless specifically board-on-board)
- Pre-fab panels
- All other fence types

**New Functionality:**
- Board-on-board wood fences now correctly calculated
- Future: Could add overlap option to other picket systems

---

## Conclusion

**Current State:**
- ✅ Gap-based picket calculation works correctly for standard picket fences
- ❌ Board-on-board defined but not implemented
- ❌ No overlap calculation support
- ❌ Would under-estimate board-on-board material needs

**Required Changes:**
1. Implement overlap-based calculation formula
2. Add board-on-board style detection and handling
3. Preserve existing gap-based logic for standard pickets
4. Add audit trail notes for transparency

**Validation Needed:**
- Re-run existing picket tests (should not change)
- Create board-on-board test cases
- Verify material counts and pricing

---

**Audit Complete:** April 9, 2026  
**Next Phase:** Implement overlap formula and board-on-board support
