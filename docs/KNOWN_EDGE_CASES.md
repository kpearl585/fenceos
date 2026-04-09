# Known Edge Cases - Contractor Guide

**Last Updated:** April 9, 2026  
**For:** FenceEstimatePro v1.0.0+

---

## Overview

FenceEstimatePro automatically detects and flags pricing situations that may fall outside typical ranges based on comprehensive validation testing. This guide explains what these flags mean and what actions (if any) you should take.

**Important:** Edge case flags are **informational only** - they don't change your pricing. They help you understand when an estimate may be higher or lower than typical and why.

---

## How Edge Case Detection Works

When you generate an estimate, the system automatically analyzes your project for patterns that we've identified in validation testing. If detected, you'll see:

1. **⚠️ Warning in the estimate** - A brief flag in your quote
2. **Detailed explanation** - Why this pattern occurs
3. **Expected variance** - How much pricing may differ from typical
4. **Recommended action** - What (if anything) you should do

**These are normal situations, not errors.** They just fall outside the most common configurations.

---

## The 3 Known Edge Cases

### 1. Long Run Economics (Vinyl 300LF+)

**What It Is:**
Large vinyl fence projects (300+ linear feet) that price 10-20% below the typical range due to economies of scale.

**Why It Happens:**
- You buy materials in bulk (better pricing)
- Labor efficiency improves on large jobs
- Less waste on long continuous runs
- Gate costs become a smaller percentage of total

**Example:**
```
Project: 500LF vinyl privacy fence, 1 single gate
Typical Range: $16,000 - $22,000
Actual Estimate: $15,439 (19% below midpoint)
```

**Should You Worry?**
❌ No - This is **normal and expected**

**What To Do:**
✅ **Nothing** - The price is accurate. Your profit margin is actually **higher** on large jobs because you're more efficient. This is standard in the industry.

**Customer Benefits:**
- Better value per foot
- Volume pricing passed to customer
- Still maintain healthy profit margins

---

### 2. Gate-Dominant Short Runs (<130LF with >8% gate cost)

**What It Is:**
Short fence runs where the gate cost represents more than 8% of the total project cost, resulting in pricing 5-10% below typical range.

**Why It Happens:**
- Gate costs are fixed regardless of fence length
- On short runs, the gate becomes a larger proportion of total cost
- Material costs scale down but gate hardware doesn't

**Example:**
```
Project: 100LF vinyl privacy, 1 pool code gate
Gate Cost: $357 (9.4% of $3,786 total)
Typical Range: $3,800 - $5,500
Actual Estimate: $3,786 (19% below midpoint)
```

**Should You Worry?**
⚠️ **Maybe** - You're still profitable, but consider minimum job charges

**What To Do:**
💡 **Consider adding a minimum job charge**

Most contractors add $1,500-$2,000 minimum for small jobs to cover:
- Travel time
- Setup/breakdown
- Equipment transport
- Administrative overhead
- Small project inefficiencies

**Example Adjustment:**
```
Estimated Cost: $3,786
Minimum Job Charge: +$500
Final Quote: $4,286
```

**Customer Communication:**
"On smaller projects we apply a minimum service charge to cover travel, setup, and equipment costs. This is standard practice in the industry."

---

### 3. Ultra-High Gate Density (>1.5 gates/100LF or >15% gate cost)

**What It Is:**
Unusual configurations with many gates relative to fence length, resulting in pricing 10-15% above typical range.

**Why It Happens:**
- Gate installation is time-intensive (1.5-3.9 hours per gate)
- Hardware costs accumulate (hinges, latches, stops, drop rods)
- More access points = more corner posts and transitions
- This configuration is rare in residential fencing

**Example:**
```
Project: 180LF wood privacy, 3 single gates
Gate Density: 1.7 gates per 100LF (typical: 0.5-1.0)
Gate Cost: $1,050 (18.9% of $5,549 total)
Typical Range: $3,600 - $5,500
Actual Estimate: $5,549 (22% above midpoint)
```

**Should You Worry?**
⚠️ **Yes** - Review the design with your customer

**What To Do:**
🔍 **Review the project design:**

1. **Confirm intention:** "I'm showing 3 gates in 180 feet of fence. Did you intend to have this many access points?"

2. **Alternative design:** "We could consolidate to 2 gates and save approximately $350-450 while still providing good access."

3. **Explain impact:** "Each additional gate adds 1.5-4 hours of installation time plus hardware costs."

**Common Scenarios:**
- **Backyard perimeter:** Often only needs 1-2 gates, not 3-4
- **Pool enclosures:** Usually requires just 1 self-closing gate (code requirement)
- **Side yards:** Typically 1 gate for access
- **Commercial:** May legitimately need multiple gates for different zones

**Customer Communication:**
"I'm showing an unusually high number of gates for this fence length. Multiple gates add significant cost due to installation time and hardware. Can we review the design to ensure we have the access points you actually need?"

---

## How Flags Appear in Estimates

### Example 1: Long Run Economics

```
═══ EDGE CASE DETECTION ═══
Detected 1 known edge case(s):
  - long_run_economics: INFO

⚠️  EDGE CASE: Long run economics (500LF vinyl) - May price 10-20% below midpoint

Note: This is normal for large projects. Your efficiency gains result in 
better pricing for the customer while maintaining healthy profit margins.
```

**Action Required:** None

---

### Example 2: Gate-Dominant Short Run

```
═══ EDGE CASE DETECTION ═══
Detected 1 known edge case(s):
  - gate_dominant_short_run: WARNING

⚠️  EDGE CASE: Gate-dominant short run (100LF, 9.4% gate cost) - May price 5-10% low

Note: Gate costs are dominating this small project. Consider adding your 
standard minimum job charge to cover travel, setup, and overhead.
```

**Action Required:** Consider minimum job charge ($1,500-$2,000 typical)

---

### Example 3: Ultra-High Gate Density

```
═══ EDGE CASE DETECTION ═══
Detected 1 known edge case(s):
  - ultra_high_gate_density: WARNING

⚠️  EDGE CASE: Ultra-high gate density (1.7 gates/100LF, 18.9% cost) - May price 10-15% high

Note: This configuration has an unusually high number of gates. Review the 
design with your customer to confirm this many access points are needed.
```

**Action Required:** Review design with customer, confirm gate count is intentional

---

## Pricing Accuracy Data

Based on 32-job validation testing:

### Overall Performance
- **78% of estimates** fall within competitive/safe ranges
- **13% of estimates** underbid (4 jobs, all edge cases)
- **9% of estimates** price high (3 jobs, 2 marginal + 1 edge case)
- **0% critical failures** (no NaN, no crashes, no missing prices)

### By Material Type

**Chain Link:** 100% accurate (7/7 jobs)  
- Range: $11.16 - $13.26 per linear foot (6ft)
- Range: $10.30 - $12.26 per linear foot (4ft)
- ⭐ Perfect performance across all scenarios

**Vinyl:** 69% accurate (11/16 jobs)  
- Range: $30.88 - $39.18 per linear foot (privacy 6ft)
- Range: $27.56 - $29.43 per linear foot (picket 4ft)
- Underbid cases: Long runs (300LF+) and gate-heavy short runs

**Wood:** 67% accurate (6/9 jobs)  
- Range: $21.21 - $27.91 per linear foot (privacy 6ft)
- Range: $22.94 - $28.04 per linear foot (picket 4ft)
- Overprice cases: Picket fences and multi-gate configurations

### When Estimates Are Most Accurate

✅ **Best accuracy scenarios:**
- Chain link (any configuration)
- Standard runs (120-250 LF)
- Normal gate density (0.5-1.0 gates per 100LF)
- Flat or moderate slopes (0-12 degrees)
- Standard soil conditions

⚠️ **Watch for edge cases:**
- Long vinyl runs (300LF+)
- Very short runs (<100LF) with premium gates
- High gate density (>1.5 gates/100LF)
- Wood picket fences (labor-intensive)

---

## Best Practices

### Before Quoting

1. **Review the project specs** - Does the gate count make sense for the fence length?
2. **Check for edge case flags** - Read any warnings the system provides
3. **Consider your minimums** - Small jobs may need minimum charges
4. **Factor in your market** - Local pricing may vary from baseline

### When You See a Flag

**INFO flags (Long Run Economics):**
- ✅ No action needed
- ✅ Price is accurate
- ✅ Proceed with confidence

**WARNING flags (Gate-Dominant, High Density):**
- ⚠️ Review the details
- ⚠️ Consider adjustments (minimums, design review)
- ⚠️ Communicate with customer if needed

### Customer Communication

**For Low Estimates (Long Runs):**
> "This pricing reflects economies of scale on larger projects. You're getting better value per foot, which is one of the benefits of doing a complete fence installation rather than piecemeal."

**For High Estimates (Many Gates):**
> "The multiple gates are driving up the cost due to installation time and hardware. Each gate adds 1.5-4 hours of labor. Would you like me to suggest an alternative layout with fewer gates?"

**For Small Jobs (Minimum Charges):**
> "Our minimum service charge covers travel, equipment, setup, and administrative costs. This is standard in the industry for smaller projects."

---

## FAQs

**Q: Can I override the edge case flags?**  
A: The flags are informational only - they don't prevent you from using the estimate. You can ignore them if you disagree.

**Q: Why don't you just adjust the pricing automatically?**  
A: We want you to maintain full control over your pricing. Edge cases may require different adjustments depending on your market, overhead, and business model.

**Q: Are these flags shown to customers?**  
A: That depends on your implementation. We recommend showing INFO flags (long runs) to customers as "volume pricing" but keeping WARNING flags (small jobs, many gates) internal for your review.

**Q: How often should I review edge case patterns?**  
A: Monthly reviews are recommended. Look for patterns in your accepted vs rejected quotes to see if adjustments are needed.

**Q: What if I consistently get different results than the flags predict?**  
A: Contact support with examples. Regional pricing variations or your specific business model may require threshold adjustments.

**Q: Can I customize the thresholds?**  
A: Not in v1.0.0, but this is planned for v1.1.0. You'll be able to set your own edge case thresholds and minimum job charges.

---

## Support

**Questions or Issues:**
- Documentation: Review `docs/FINAL_CALIBRATION_DECISION.md` for validation details
- Bug Reports: Include project details, edge case flags, and expected vs actual pricing
- Feature Requests: Suggest threshold adjustments or new edge case patterns

**Feedback Welcome:**
- Are the flags helpful?
- Are the thresholds accurate for your market?
- What other patterns should we detect?

---

## Summary

**Edge case flags are your friend.** They help you:
- Understand when pricing falls outside typical ranges
- Make informed decisions about minimums and adjustments
- Communicate better with customers about pricing factors
- Catch unusual configurations before quoting

**Remember:**
- 78% of estimates need no adjustment
- Edge cases are normal, not errors
- You have full control over final pricing
- Flags are guidance, not requirements

**When in doubt:** Use your professional judgment. You know your market, your overhead, and your customers better than any automated system.

---

**Document Version:** 1.0  
**For Release:** v1.0.0+  
**Last Updated:** April 9, 2026
