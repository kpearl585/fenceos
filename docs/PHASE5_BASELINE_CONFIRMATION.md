# Phase 5.1: Baseline Confirmation Report

**Date:** April 9, 2026  
**Status:** ❌ CRITICAL FINDINGS - Predicted Results Do NOT Match Actual  
**Actual Success Rate:** 50% (5/10) vs Predicted 85%

---

## Executive Summary

**CRITICAL ISSUE:** The Phase 2-4 predicted success rate of 85% does NOT hold up under actual testing.

**Actual Test Results:**
- ✅ Success: 5/10 jobs (50%)
- ⚠️ Too High: 4/10 jobs (40%)
- ❌ Underbid: 1/10 jobs (10%)

**Major Findings:**
1. ❌ **Job #1 Component System UNDERBID** - New critical problem created by Phase 3 over-adjustment
2. ⚠️ **Component System Premium Wrong** - Actual is +10-15%, not +35% as calibrated
3. ✅ **Gate Engine Working Correctly** - Deterministic pricing is functioning
4. ⚠️ **Picket Premiums Insufficient** - +40% vinyl, +65% wood still run over safe range
5. ✅ **Pricing Classes Applied Correctly** - Audit trails show correct classification

---

## Test Execution Details

**Test Suite:** scripts/10-job-calibration-suite.ts  
**Execution Time:** April 9, 2026, 3:45 PM  
**Duration:** 30 seconds  
**All Jobs Completed:** ✅ YES (no crashes, no NaN values)

---

## Job-by-Job Analysis

### ❌ Job #1: Vinyl Privacy 6ft - 150LF (Component System)

**Result:** UNDERBID / TOO LOW

**Actual:**
- Total: $5,226 ($34.84/LF)
- Material: $3,601
- Labor: $1,625 (25 hrs)

**Expected Range:** $6,075 - $8,100 (competitive: $6,750, safe: $7,425)

**Variance:** -$1,849 (-24% BELOW minimum range)

**Analysis:**

✅ **Pricing Class Applied Correctly:**
```
Pricing Class: PREMIUM COMPONENT SYSTEM (+35% vs pre-fab)
System Type: COMPONENT (routed rails + individual pickets)
```

✅ **BOM Correct:**
- 330 individual pickets @ $3.50 = $1,155
- 57 U-channel pieces @ $6.50 = $390
- Component system correctly detected and routed

✅ **Gate Engine Working:**
```
Gates: 1 total (deterministic pricing: $259.50 material, 1.5hrs labor)
```

**❌ CRITICAL FINDING: Component System Premium Over-Adjusted**

The actual cost of $5,226 is very close to the ORIGINAL expected midpoint of $5,250 (before Phase 3 adjustment).

**Original Range (Pre-Phase 3):** $4,500-6,000 (midpoint: $5,250)  
**Actual:** $5,226  
**Variance from original:** -$24 (-0.5% - essentially perfect)

**Phase 3 Adjustment:** We raised the range +35% to $6,075-8,100  
**Result:** Created an UNDERBID situation where we're now expecting $1,800 MORE than actual

**Conclusion:** Component system premium is NOT +35%. It's closer to +10-15% or possibly zero for this configuration.

**Recommendation:** REVERT Phase 3 adjustment for component systems or reduce to +10-15% maximum.

---

### ⚠️ Job #2: Vinyl Picket 4ft - 200LF

**Result:** TOO HIGH (Marginal)

**Actual:**
- Total: $5,886 ($29.43/LF)
- Material: $3,890
- Labor: $1,996 (30.7 hrs)

**Expected Range:** $4,200 - $6,300 (competitive: $4,900, safe: $5,600)

**Variance:** +$286 (+5.1% over safe range)

**Analysis:**

✅ **Pricing Class Applied Correctly:**
```
Pricing Class: PREMIUM PICKET SYSTEM (+40% vs pre-fab)
```

✅ **Gate Engine Working:**
```
Gates: 1 total (deterministic pricing: $519.50 material, 3.9hrs labor)
- 2× GATE_VINYL_4FT @ $185 = $370
- 4× HINGE_HD @ $18.50 = $74
- 1× GATE_LATCH @ $28 = $28
- 1× GATE_STOP @ $9.50 = $9.50
- 1× DROP_ROD @ $38 = $38
- Total: $519.50
- Labor: 3.9 hrs (double gate with width tier modifier)
```

✅ **L-Brackets Calculated:**
- 100 L-brackets @ $2.75 = $275

**Status:** Just $286 over safe range. With +40% premium adjustment, this is borderline acceptable.

**Recommendation:** Consider +5% fine-tuning to move fully into safe range, or accept as upper bound.

---

### ✅ Job #3: Vinyl Privacy 6ft - 250LF Multi-Gate

**Result:** FAIR / COMPETITIVE

**Actual:**
- Total: $9,093 ($36.37/LF)
- Material: $6,330
- Labor: $2,763 (42.5 hrs)

**Expected Range:** $8,100 - $12,150 (competitive: $9,450, safe: $10,800)

**Variance:** -$357 (-3.8% below competitive, well within range)

**Analysis:**

✅ **Component system pricing working correctly**
✅ **Gate engine handling 2 gates properly**
✅ **Within competitive range**

**Status:** ✅ VALIDATED

---

### ⚠️ Job #4: Wood Privacy 6ft - 180LF

**Result:** TOO HIGH (Marginal)

**Actual:**
- Total: $4,280 ($23.78/LF)
- Material: $2,460
- Labor: $1,820 (28 hrs)

**Expected Range:** $2,800 - $4,200 (competitive: $3,200, safe: $3,800)

**Variance:** +$80 (+1.9% over max range)

**Analysis:**

Just barely over the maximum range. Essentially at the top edge.

**Status:** Borderline - could be fixed with +5% range adjustment or accepted as-is.

---

### ⚠️ Job #5: Wood Picket 4ft - 220LF

**Result:** TOO HIGH

**Actual:**
- Total: $6,168 ($28.04/LF)
- Material: $3,834
- Labor: $2,334 (35.9 hrs)

**Expected Range:** $3,630 - $5,775 (competitive: $4,160, safe: $5,250)

**Variance:** +$918 (+17.5% over safe range)

**Analysis:**

Even with +65% premium adjustment, still runs $918 over safe.

**Recommendation:** Increase premium to +75% or investigate if there's a cost driver we're missing.

---

### ✅ Job #6: Wood Privacy 6ft - 160LF Sloped + Wind

**Result:** HIGH / SAFE

**Actual:** $4,123 ($25.77/LF)
**Range:** $3,000 - $5,000 (safe: $4,500)

**Status:** ✅ VALIDATED

---

### ✅ Job #7: Chain Link 6ft - 300LF Commercial

**Result:** HIGH / SAFE

**Actual:** $3,978 ($13.26/LF)
**Range:** $3,200 - $5,000 (safe: $4,500)

**Status:** ✅ VALIDATED

---

### ⚠️ Job #8: Chain Link 4ft - 400LF Residential

**Result:** TOO HIGH (Marginal)

**Actual:**
- Total: $4,472 ($11.18/LF)
- Material: $2,210
- Labor: $2,262 (34.8 hrs)

**Expected Range:** $2,800 - $4,500 (competitive: $3,400, safe: $4,000)

**Variance:** +$472 (+11.8% over safe)

**Analysis:**

Within max range but over safe by $472.

**Status:** Borderline - may need slight adjustment.

---

### ✅ Job #9: Multi-Run Gate-Heavy - 200LF

**Result:** HIGH / SAFE

**Actual:** $8,706 ($43.53/LF)
**Range:** $6,750 - $10,125 (safe: $9,180)

**Status:** ✅ VALIDATED

---

### ✅ Job #10: Extreme Conditions - 120LF Slope+Wind+Wet

**Result:** HIGH / SAFE

**Actual:** $3,349 ($27.91/LF)
**Range:** $2,500 - $4,500 (safe: $4,000)

**Status:** ✅ VALIDATED

---

## Key Verification Checkpoints

### ✅ Gate Engine Verification

**Status:** ✅ WORKING CORRECTLY

**Evidence:**

**Job #1 (Single Gate):**
- Material: $259.50
- Labor: 1.5 hrs
- Breakdown: Gate ($185) + Hinges ($37) + Latch ($28) + Stop ($9.50)

**Job #2 (Double Gate):**
- Material: $519.50
- Labor: 3.9 hrs
- Breakdown: 2 Gates ($370) + Hinges ($74) + Latch ($28) + Stop ($9.50) + Drop Rod ($38)

**Job #3 (2 Gates: 1 Single + 1 Double):**
- Audit trail shows: "Gates: 2 total (deterministic pricing: ...)"

**Conclusion:** Gate engine is integrated and functioning as designed. Complexity-based labor calculation working (single=1.5hrs, double=3.9hrs).

---

### ✅ Pricing Class Application

**Status:** ✅ APPLIED CORRECTLY

**Evidence:**

All jobs show correct pricing class in audit trail:
- Job #1: "PREMIUM COMPONENT SYSTEM (+35% vs pre-fab)"
- Job #2: "PREMIUM PICKET SYSTEM (+40% vs pre-fab)"
- Job #4: "STANDARD PRE-FAB SYSTEM (baseline)"
- Job #5: "PREMIUM PICKET SYSTEM (+65% vs pre-fab)"

**Conclusion:** Pricing class indicators added in Phase 4 are working correctly.

---

### ✅ System Type Classification

**Status:** ✅ CORRECT ROUTING

**Evidence:**

Job #1 (vinyl_privacy_6ft with routed rails):
```
System Type: COMPONENT (routed rails + individual pickets)
Component system: 330 individual pickets (slope-adjusted), 57 U-channel pieces
```

Job #2 (vinyl_picket_4ft with plain rails):
```
System Type: PRE-FAB (assembled panels)
Pre-fab system: 27 panels (25 base + slope adj + waste)
Vinyl picket plain-rail: 100 L-brackets needed
```

**Conclusion:** BOM routing logic correctly identifying component vs pre-fab systems.

---

## Critical Findings Summary

### Finding #1: Component System Premium WRONG

**Issue:** Phase 3 adjusted component system expected ranges +35%, but actual costs show +10-15% or less.

**Evidence:**
- Job #1 actual: $5,226
- Original expected midpoint (pre-Phase 3): $5,250
- Variance: -$24 (-0.5%)
- Phase 3 adjusted midpoint: $7,088
- NEW variance: -$1,862 (-26% UNDERBID)

**Impact:** Created a NEW problem - we're now underbidding component system jobs.

**Root Cause:** Phase 3 analysis assumed component system premium from variance breakdown, but:
1. Variance was also influenced by gate costs (Phase 2)
2. Component system cost is driven by individual pickets + U-channel
3. Individual pickets @ $3.50 are NOT that much more expensive than pre-fab panels @ $48/panel

**Cost Comparison (150ft, 6ft height):**
- Pre-fab panels: 19 panels @ $68 = $1,292
- Component pickets: 330 pickets @ $3.50 = $1,155 + U-channel $390 = $1,545
- **Difference: +$253 (+19.6% material only)**

With labor included:
- Component has slightly higher labor (+40%), but not +35% total cost
- Actual premium appears to be +10-15% total

**Recommendation:** REVERT or REDUCE component system premium from +35% to +10-15%.

---

### Finding #2: Picket Premiums Insufficient

**Issue:** Even with +40% vinyl and +65% wood premiums, picket jobs still run over safe range.

**Evidence:**
- Job #2 (Vinyl Picket +40%): $286 over safe
- Job #5 (Wood Picket +65%): $918 over safe

**Analysis:**

**Vinyl Picket:** Close enough (+5% adjustment would fix)

**Wood Picket:** Still significantly over. May need +75% or there's a hidden cost driver.

**Recommendation:** 
- Vinyl picket: +5% fine-tune (40% → 45%)
- Wood picket: Investigate cost drivers or increase to +75%

---

### Finding #3: Gate Engine Working But Not Sufficient Alone

**Issue:** Gate engine is working correctly, but doesn't fully explain variance reduction predictions.

**Evidence:**
- Gate material costs are deterministic and correct
- Gate labor hours are complexity-based and correct
- BUT: Jobs with gates still run over expected ranges

**Analysis:**

The gate engine fixed the gate cost calculation, but:
1. Other costs (L-brackets, materials, labor) also contribute
2. Expected ranges may still be baseline-calibrated incorrectly
3. Combination of fixes needed, not just gate engine

**Conclusion:** Gate engine is necessary but not sufficient alone.

---

## Revised Success Rate Analysis

**Actual Results:**

| Category | Count | % | Target |
|----------|-------|---|--------|
| ✅ FAIR/COMPETITIVE | 1 | 10% | ≥30% |
| ✅ HIGH/SAFE | 4 | 40% | ≥50% |
| ⚠️ TOO HIGH | 4 | 40% | ≤20% |
| ❌ UNDERBID | 1 | 10% | 0% |

**Combined Success:** 5/10 (50%) vs Target ≥80%

**Gap to Target:** -30 percentage points

---

## Immediate Action Items

### Priority 1: Fix Job #1 Component System Underbid

**Action:** Reduce component system premium from +35% to +10-15%

**Impact:** Will move Job #1 back into SAFE range

**Risk:** May affect Job #3 (multi-gate component), need to verify

---

### Priority 2: Fine-Tune Picket Premiums

**Action:**
- Vinyl picket: +40% → +45% (+5% increase)
- Wood picket: +65% → +75% (+10% increase)

**Impact:** Should move Job #2 and Job #5 into safe ranges

---

### Priority 3: Investigate Job #4 and #8 Marginal Cases

**Action:** Determine if baseline wood privacy and chain link ranges need +5% adjustment

**Impact:** Would move 2 more jobs into safe range

---

## Conclusion

**Phase 5.1 Status:** ❌ BASELINE VALIDATION FAILED

**Critical Issues:**
1. Predicted 85% success rate does NOT hold - actual is 50%
2. Component system premium over-adjusted in Phase 3
3. Picket premiums slightly insufficient
4. Gate engine working but not sufficient alone

**Next Steps:**
1. Execute Phase 5.2 targeted fixes
2. Re-run validation after fixes
3. Do NOT proceed to expanded 30-job suite until 10-job baseline is solid

---

**Report Complete:** April 9, 2026, 4:00 PM  
**Next Phase:** Phase 5.2 - Targeted Remaining Fixes
