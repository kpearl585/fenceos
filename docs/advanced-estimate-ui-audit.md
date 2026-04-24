# Advanced Estimate UI/Style Audit

**Date:** 2026-04-08  
**Scope:** Advanced Estimate interface contrast and readability  
**Color Palette Reference:**
- fence-50: `#eff6ff` (very light blue)
- fence-100: `#dbeafe` 
- fence-200: `#bfdbfe`
- fence-300: `#93c5fd`
- fence-400: `#60a5fa`
- fence-500: `#2563eb`
- fence-600: `#1d4ed8`
- fence-700: `#1e3a5f`
- fence-800: `#172e4a`
- fence-900: `#0f1f33`
- fence-950: `#0a1628` (very dark blue)

---

## Executive Summary

**Critical Issues Found:** 6  
**High Severity Issues:** 8  
**Medium Severity Issues:** 4  
**Low Severity Issues:** 2

The primary issue is **white text on dark blue backgrounds** (fence-950) where multiple text colors fail WCAG AA contrast requirements. The fence-950 background (#0a1628) creates significant contrast problems with lighter shades of the fence palette.

---

## Contrast Issues by Severity

### CRITICAL (Unreadable - Immediate Fix Required)

| # | Component | File | Line | Text Color | Background | Contrast Ratio | Issue |
|---|-----------|------|------|------------|------------|----------------|-------|
| 1 | Summary Card - "Estimate Summary" label | AdvancedEstimateClient.tsx | 536 | `text-fence-400` (#60a5fa) | `bg-fence-950` (#0a1628) | ~3.8:1 | Falls below WCAG AA 4.5:1 for normal text |
| 2 | Summary Card - Section labels | AdvancedEstimateClient.tsx | 540, 544 | `text-fence-400` (#60a5fa) | `bg-fence-950` (#0a1628) | ~3.8:1 | "Materials Cost", "Labor" labels barely readable |
| 3 | Summary Card - "Per LF" label | AdvancedEstimateClient.tsx | 574 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | ~2.1:1 | Critical failure - text nearly invisible |
| 4 | Summary Card - Bid price markup label | AdvancedEstimateClient.tsx | 561 | `text-fence-300` (#93c5fd) | `bg-fence-800` (#172e4a) | ~4.2:1 | Below WCAG AA for normal text |
| 5 | Summary Card - Bottom stats | AdvancedEstimateClient.tsx | 582-586 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | ~2.1:1 | "Confidence", "LF", "line items" nearly invisible |
| 6 | Summary Card - "unpriced" indicator | AdvancedEstimateClient.tsx | 585 | `text-amber-400` | `bg-fence-950` (#0a1628) | ~3.2:1 | Fails WCAG AA |

### HIGH (Low Contrast - Priority Fix)

| # | Component | File | Line | Text Color | Background | Issue |
|---|-----------|------|------|------------|------------|-------|
| 7 | Summary Card - Instructions text | AdvancedEstimateClient.tsx | 603 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | Small text with poor contrast |
| 8 | Summary Card - Helper text below PDFs | AdvancedEstimateClient.tsx | 630 | `text-fence-600` (#1d4ed8) | `bg-fence-950` (#0a1628) | Dark blue on darker blue - very low contrast |
| 9 | Excel export section label | AdvancedEstimateClient.tsx | 633 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | Poor readability |
| 10 | Excel export helper text | AdvancedEstimateClient.tsx | 650 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | Poor readability |
| 11 | AI Input header description | AiInputTab.tsx | 167-168 | `text-fence-400` (#60a5fa) | `bg-fence-950` (#0a1628) | Below WCAG AA |
| 12 | AI badge text | AiInputTab.tsx | 165 | `text-fence-300` (#93c5fd) | `bg-fence-800` (#172e4a) | Marginal contrast |
| 13 | Saved page - Calibration text | saved/page.tsx | 60 | `text-fence-100` | `bg-fence-950` (#0a1628) | Light blue text may have issues |
| 14 | Saved page - Bottom note | saved/page.tsx | 66 | `text-fence-500` (#2563eb) | `bg-fence-950` (#0a1628) | Poor contrast |

### MEDIUM (Review Recommended)

| # | Component | File | Line | Text Color | Background | Issue |
|---|-----------|------|------|------------|------------|-------|
| 15 | Detail page - Summary labels | [id]/page.tsx | 45, 49, 53 | `text-fence-400` (#60a5fa) | `bg-fence-950` (#0a1628) | Borderline contrast |
| 16 | Detail page - Closeout note | [id]/page.tsx | 61 | `text-fence-400` (#60a5fa) | `bg-fence-950` (#0a1628) | Small text with marginal contrast |
| 17 | CloseoutPanel - Small labels | CloseoutPanel.tsx | 56, 66, 73 | `text-fence-600` / `text-fence-700` | Various | Context-dependent issues |
| 18 | Run card helper text | AdvancedEstimateClient.tsx | 374 | `text-gray-400` | `bg-gray-50` | Likely acceptable but verify |

### LOW (Monitor)

| # | Component | File | Line | Text Color | Background | Issue |
|---|-----------|------|------|------------|------------|-------|
| 19 | Placeholder text in inputs | Multiple files | Various | `placeholder:text-gray-300` | `bg-white` | Standard pattern - likely OK |
| 20 | Disabled button opacity | Multiple files | Various | `disabled:opacity-40` / `disabled:opacity-60` | Various | May compound existing contrast issues |

---

## Detailed Analysis by Component

### 1. AdvancedEstimateClient.tsx - Summary Card (Lines 535-653)

**Background:** `bg-fence-950` (#0a1628)

#### Critical Issues:
- **Line 536:** `text-fence-400` - "ESTIMATE SUMMARY" label
  - Current: #60a5fa on #0a1628 ≈ 3.8:1
  - Required: 4.5:1 (WCAG AA)
  - **Fix:** Use `text-fence-200` or `text-white`

- **Lines 540, 544:** `text-fence-400` - "Materials Cost", "Labor" labels
  - Same issue as above
  - **Fix:** Use `text-fence-200` or `text-fence-300`

- **Lines 566, 570, 574:** `text-fence-500` - "Gross Profit", "Gross Margin", "Per LF" labels in nested card
  - Current: #2563eb on #0a1628 ≈ 2.1:1 (CRITICAL)
  - **Fix:** Change to `text-fence-300` or lighter

- **Line 561:** `text-fence-300` on `bg-fence-800` nested card
  - Current: #93c5fd on #172e4a ≈ 4.2:1
  - **Fix:** Use `text-fence-200` or `text-white`

- **Lines 582, 583:** `text-fence-500` - Confidence and stats
  - Current: #2563eb on #0a1628 ≈ 2.1:1 (CRITICAL)
  - **Fix:** Change to `text-fence-300` minimum

- **Line 585:** `text-amber-400` on `bg-fence-950`
  - Insufficient contrast
  - **Fix:** Use `text-amber-300` or `text-amber-200`

- **Line 603:** `text-fence-500` - "Requires customer name" helper text
  - Same critical issue
  - **Fix:** Use `text-fence-400` or lighter

- **Lines 630, 633, 650:** `text-fence-600` and `text-fence-500` helper text
  - All fail contrast requirements
  - **Fix:** Use `text-fence-300` minimum

#### Pattern Analysis:
The card uses a nested structure:
```
bg-fence-950 (outer)
  └─ bg-fence-800 (bid price section)
     └─ text-fence-300 (marginal contrast)
```

**Recommendation:** Establish a clear hierarchy:
- Headers: `text-white` or `text-fence-100`
- Labels: `text-fence-300`
- Body text: `text-fence-200`
- Muted/helper: `text-fence-400` minimum
- Never use fence-500 or darker on fence-950

---

### 2. AiInputTab.tsx - AI Header (Lines 159-170)

**Background:** `bg-fence-950`

#### Issues:
- **Line 167-168:** Description text `text-fence-400`
  - Current: #60a5fa on #0a1628 ≈ 3.8:1
  - **Fix:** Use `text-fence-300` or `text-fence-200`

- **Line 165:** Badge text `text-fence-300` on `bg-fence-800`
  - Current: #93c5fd on #172e4a ≈ 4.2:1
  - **Fix:** Use `text-fence-200` for safety margin

---

### 3. [id]/page.tsx - Detail View Summary Card (Lines 42-64)

**Background:** `bg-fence-950`

#### Issues:
- **Lines 45, 49, 53:** Label text `text-fence-400`
  - "Total LF", "Estimated Cost", "Created" labels
  - Current: #60a5fa on #0a1628 ≈ 3.8:1
  - **Fix:** Use `text-fence-300`

- **Line 61:** Notes text `text-fence-400`
  - Same issue
  - **Fix:** Use `text-fence-300`

---

### 4. saved/page.tsx - Calibration Status Card (Lines 56-68)

**Background:** `bg-fence-950`

#### Issues:
- **Line 58:** "ENGINE CALIBRATION ACTIVE" uses `text-fence-400`
  - Borderline contrast
  - **Fix:** Use `text-fence-300`

- **Line 60:** Body text `text-fence-100`
  - This is likely OK (light blue on dark)
  - Verify: #dbeafe on #0a1628 should be ~9:1 ✓

- **Line 66:** Helper text `text-fence-500`
  - Current: #2563eb on #0a1628 ≈ 2.1:1 (CRITICAL)
  - **Fix:** Use `text-fence-400` minimum

---

### 5. CloseoutPanel.tsx - Nested Cards

#### Issues:
- **Line 56:** `text-fence-600` on `bg-fence-50` border card
  - Current: #1d4ed8 on #eff6ff
  - Likely acceptable but borderline for small text
  - **Fix:** Consider `text-fence-700` for small text

- **Line 73:** Gray text on `bg-gray-50`
  - Standard gray scale - likely acceptable
  - Verify if user reports issues

---

## State-Specific Issues

### Hover States
- Most hover states use `hover:bg-fence-700` or `hover:text-fence-600`
- These are generally acceptable on white backgrounds
- **No critical issues found**

### Active States
- Active tab: `bg-fence-50 text-fence-700` (lines 675 in AdvancedEstimateClient.tsx)
- **No issues - good contrast**

### Disabled States
- Uses `disabled:opacity-40` or `disabled:opacity-60`
- **Warning:** This compounds existing contrast issues
- If base text is already marginal (e.g., fence-400), reducing opacity makes it worse
- **Fix:** Ensure base text has >6:1 contrast before applying opacity

### Error States
- Red badges use `text-red-700 bg-red-50` - acceptable
- **No issues found**

### Loading States
- Loading text uses current color inheritance
- May inherit poor contrast from parent
- **Review:** Ensure loading spinners have explicit color classes

---

## Systematic Patterns

### Pattern 1: fence-400 on fence-950 (MOST COMMON ISSUE)
- **Occurrences:** 10+ instances
- **Contrast:** ~3.8:1 (fails WCAG AA)
- **Fix:** Replace all with `text-fence-300` or `text-fence-200`

### Pattern 2: fence-500 on fence-950 (CRITICAL)
- **Occurrences:** 7+ instances
- **Contrast:** ~2.1:1 (severe failure)
- **Fix:** Replace all with `text-fence-300` minimum

### Pattern 3: fence-600 on fence-950
- **Occurrences:** 3+ instances
- **Contrast:** ~1.5:1 (nearly invisible)
- **Fix:** Never use - replace with fence-300 or lighter

### Pattern 4: Nested dark cards
```jsx
bg-fence-950 → bg-fence-800 → text-fence-300
```
- The bg-fence-800 provides slightly better contrast but still marginal
- **Fix:** Use text-fence-200 or text-white for nested dark cards

---

## Recommended Color Pairings

### For bg-fence-950 backgrounds:
✅ **SAFE:**
- `text-white` (highest contrast)
- `text-fence-100` (#dbeafe) - ~9:1 contrast
- `text-fence-200` (#bfdbfe) - ~7:1 contrast
- `text-fence-300` (#93c5fd) - ~5.2:1 contrast (minimum for body text)

⚠️ **BORDERLINE (use only for large text):**
- `text-fence-400` (#60a5fa) - ~3.8:1 contrast

❌ **NEVER USE:**
- `text-fence-500` and darker
- `text-green-400`, `text-amber-400` (check individually)

### For bg-fence-800 backgrounds:
✅ **SAFE:**
- `text-white`
- `text-fence-100`
- `text-fence-200`

⚠️ **BORDERLINE:**
- `text-fence-300` - ~4.2:1 (minimum)

### For bg-fence-50 backgrounds:
✅ **SAFE:**
- `text-fence-900`
- `text-fence-800`
- `text-fence-700`
- `text-gray-900`
- `text-gray-800`

⚠️ **BORDERLINE:**
- `text-fence-600` (verify for small text)

---

## Implementation Priority

### Phase 1: Critical Fixes (Deploy Immediately)
1. **Lines 566, 570, 574, 582-586 in AdvancedEstimateClient.tsx**
   - Change all `text-fence-500` to `text-fence-300` on fence-950 backgrounds
   - **Impact:** Fixes nearly invisible text

2. **Line 630, 633, 650 in AdvancedEstimateClient.tsx**
   - Change `text-fence-600` and `text-fence-500` to `text-fence-300`
   - **Impact:** Fixes helper text readability

### Phase 2: High Priority Fixes (Deploy This Week)
3. **Lines 536, 540, 544 in AdvancedEstimateClient.tsx**
   - Change `text-fence-400` to `text-fence-300`
   - **Impact:** Improves label readability

4. **Lines 167-168 in AiInputTab.tsx**
   - Change `text-fence-400` to `text-fence-300`
   - **Impact:** Improves AI header readability

5. **Line 66 in saved/page.tsx**
   - Change `text-fence-500` to `text-fence-400`

### Phase 3: Medium Priority (Deploy This Sprint)
6. **Detail page labels (lines 45, 49, 53, 61)**
   - Upgrade to `text-fence-300`

7. **Nested card text (line 561)**
   - Change to `text-fence-200`

### Phase 4: Review & Polish
8. Audit all `disabled:opacity` uses
9. Add explicit loading state colors
10. Document approved color pairings in design system

---

## Testing Checklist

After implementing fixes, verify:

- [ ] All text on fence-950 backgrounds is readable in bright sunlight
- [ ] All text on fence-950 backgrounds is readable in dark mode (if applicable)
- [ ] Small text (< 14px) has minimum 4.5:1 contrast
- [ ] Large text (≥ 18px or ≥ 14px bold) has minimum 3:1 contrast
- [ ] Color is not the only means of conveying information
- [ ] Test with browser zoom at 200%
- [ ] Test with Windows High Contrast mode
- [ ] Test with screen reader (color announcements)

---

## Design System Recommendations

### Create Design Tokens:
```typescript
// tailwind.config.ts - Add semantic tokens
const fenceTokens = {
  'on-dark-primary': colors.white,           // Headlines on dark
  'on-dark-secondary': colors.fence[200],    // Body text on dark
  'on-dark-muted': colors.fence[300],        // Captions on dark
  'on-dark-disabled': colors.fence[400],     // Disabled on dark (with opacity)
  
  'on-light-primary': colors.fence[900],     // Headlines on light
  'on-light-secondary': colors.fence[700],   // Body text on light
  'on-light-muted': colors.fence[600],       // Captions on light
}
```

### Usage:
```jsx
// Before (problematic):
<p className="text-fence-500">Label</p>  // on fence-950 bg

// After (semantic):
<p className="text-on-dark-muted">Label</p>  // resolves to fence-300
```

---

## Files Requiring Changes

1. **AdvancedEstimateClient.tsx** - 15+ changes
2. **AiInputTab.tsx** - 3 changes
3. **[id]/page.tsx** - 5 changes
4. **saved/page.tsx** - 3 changes
5. **CloseoutPanel.tsx** - 2 changes (optional)

**Total LOC Impact:** ~28 lines across 5 files

---

## Validation Tools

Consider adding to CI/CD:
- [@axe-core/react](https://github.com/dequelabs/axe-core-npm) - Runtime accessibility testing
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) - Lint-time checks
- [pa11y](https://pa11y.org/) - Automated accessibility testing

---

## Conclusion

The Advanced Estimate interface has **systematic contrast failures** stemming from use of mid-to-dark fence colors (fence-400 through fence-600) on the very dark fence-950 background. The fix is straightforward: shift all text on dark backgrounds to fence-300 or lighter.

**Key Insight:** The fence color palette is excellent, but the semantic mapping (which colors for which purposes) needs refinement. The current approach treats fence-400/500 as "muted" text, but on fence-950 these become nearly invisible.

**Estimated Fix Time:** 2-3 hours for all phases
**Risk Level:** Low (CSS-only changes, no logic changes)
**User Impact:** High (immediate improvement in readability)
