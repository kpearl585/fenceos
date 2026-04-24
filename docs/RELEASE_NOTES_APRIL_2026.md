# FenceEstimatePro — April 2026 Release Notes

**Release date:** April 16, 2026
**Version:** Advanced Estimator v2.0

---

## What's New

### Redesigned Advanced Estimator
The Advanced Estimator has been completely rebuilt for speed, accuracy, and ease of use:
- **Simple Mode**: Enter total linear feet + corners → the engine auto-generates fence sections. Toggle to Advanced mode anytime to fine-tune.
- **Open vs Closed shape**: Choose whether your fence is a line (open) or an enclosure (closed) — the math adapts automatically.
- **Live estimates**: Results update instantly as you type. No "Generate" button needed.
- **Split architecture**: The estimator is now 9 focused components instead of one monolith, making it faster and more responsive on mobile.

### AI Extraction Improvements
- **Critique pass**: A second AI review checks the extraction for uncertainties before you apply it.
- **Critical blockers enforced**: If the AI flags an extraction as unsafe, the Apply button is now disabled until the issue is resolved.
- **Multi-run corner detection**: AI-extracted jobs with multiple runs now properly mark corners, so reinforcement and concrete depth match manual entry.

### Gate Pricing Overhaul
- **Dedicated double-gate SKUs**: Vinyl and aluminum double drive gates now use proper kit pricing instead of "2× single gate". This corrects a systematic under-bid of $200-500 per wide double gate.
- **Missing-price detection**: If a gate hardware SKU is missing from your price map, the BOM flags it for review instead of silently substituting $0.

### Wind Mode Concrete Fix
- Hurricane/wind zone projects now correctly compute deeper concrete per post. Previously, the concrete calculation ignored wind mode entirely — under-bidding Florida hurricane jobs by ~15-20%.

### Quote Outputs
- **Materials breakdown**: Internal BOM PDF and Excel now show Materials, Equipment, Delivery, Disposal, and Regulatory as separate line items instead of lumping everything into "Materials".
- **Excel TOTALS row**: Now matches the sum of line items above it (was previously including a regional adjustment not visible on any row).
- **Supplier PO cleaned up**: Equipment rentals, disposal, delivery, and permits are no longer sent to your fence supplier.
- **Warranty text aligned**: Customer proposal PDF warranty matches the terms document (1 year workmanship).

### Closeout Intelligence
- **Partial closeout safety**: Entering only one cost category no longer fabricates a fake total variance. The system tells you when data is incomplete.
- **Regulatory learning**: Unexpected permit/inspection costs now generate calibration feedback. Previously they were silently ignored.
- **Cold-start damping**: Your first few closeouts carry reduced weight so a single unusual job can't swing your waste calibration by 180%.

### Security & Infrastructure
- **Row Level Security**: All 42 database tables now have active RLS policies. The `fence_graphs` table (saved estimates) previously had RLS enabled but zero policies.
- **CSP hardened**: Removed `unsafe-eval` from Content Security Policy.
- **Rate limiting**: Estimate conversion and closeout operations are now rate-limited.
- **Speed Insights**: Vercel Core Web Vitals tracking enabled.

### Accessibility
- All form inputs now have proper label-input association for screen readers.
- Error messages use `role="alert"` for automatic screen reader announcement.
- Tooltips are keyboard-accessible and touch-friendly (tap to toggle, Escape to dismiss).

---

## What This Means for Your Estimates

| Change | Effect on existing bids |
|---|---|
| Gate pricing correction | New estimates bid higher on vinyl/aluminum doubles, lower on wood/chain link doubles |
| Wind mode concrete fix | Florida hurricane jobs will show ~15% more concrete than before |
| Materials breakdown | Same total cost, but you can now see where the money goes |
| Waste calibration damping | First few closeouts move the dial more gradually |

**Existing saved estimates are unchanged.** These improvements only affect new estimates generated after this update. If you re-open and re-estimate an old job, it will use the corrected engine.

---

## Test Coverage
- **249 unit tests** across 12 test suites (up from 169)
- **12 Playwright E2E scenarios** covering the full contractor workflow
- **5 deep audits** of engine math, gate pricing, quote outputs, closeout/calibration, and AI extraction
- **80+ regression tests** locking in every bug fix

## Known Limitations
- The `totalMaterialCost` field in saved estimate JSON still includes equipment/logistics/regulatory for backward compatibility. New estimates also include the separate `materialOnlyCost` field.
- Chain-link graph nodes include phantom 96"-OC line posts from the builder, though the BOM correctly uses 120"-OC. Customer-facing post counts are derived from the BOM.
- SheetJS (xlsx) has known vulnerabilities (prototype pollution, ReDoS) with no fix available. We use it client-side only for exporting trusted BOM data — no user-uploaded spreadsheet parsing.
