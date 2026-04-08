# AI Extraction Test Dataset

**Version:** 1.0  
**Purpose:** Validate GPT-4o extraction accuracy against real contractor input scenarios  
**Location:** `/test-fixtures/ai-extraction-test-dataset.json`

## Overview

This dataset contains realistic fence contractor inputs designed to test the AI extraction pipeline's ability to:
- Parse natural language job descriptions
- Extract structured fence project data (runs, gates, soil, slope)
- Handle multi-run projects with varying complexity
- Detect special conditions (pool code, wind exposure, steep slopes)
- Maintain high confidence on clear inputs
- Flag ambiguity on vague inputs

## Test Categories

### High Priority (Critical Path)
Tests that represent the most common contractor use cases. Must pass for production readiness.

1. **simple-vinyl-privacy** — Single run, basic residential job
2. **multi-run-with-gates** — Multiple runs with gate attachments
3. **wood-privacy-with-slope** — Slope detection and racked panels
4. **chain-link-commercial** — Commercial-scale project
5. **pool-code-gate** — Pool enclosure with safety requirements
6. **florida-sandy-soil-auto** — Florida soil type auto-detection

### Medium Priority (Common Edge Cases)
Scenarios that occur frequently enough to matter but aren't blocking.

7. **aluminum-ornamental** — Decorative fence with specific product line
8. **mixed-heights** — Multiple runs with different heights
9. **vague-input** — Intentionally ambiguous input (should flag, not hallucinate)
10. **wet-soil-high-water** — Special soil condition requiring deeper holes
11. **multiple-gates-complex** — Multiple gate types in one project

### Low Priority (Rare but Valid)
Edge cases that should work but aren't commonly encountered.

12. **steep-slope-stepped** — Extreme slope requiring stepped panels

## Expected Behaviors

### Confidence Scoring
- **0.85+** — Clear, unambiguous input with all key details
- **0.65-0.84** — Most details present, minor assumptions made
- **<0.65** — Significant ambiguity, contractor review required

### Validation & Blocking
- **Blocked:** linearFeet = 0, zero runs extracted, critical schema violations
- **Warnings:** Unusual values (>5000 LF), narrow double gates, soil/slope mismatches

### Tolerance Ranges
- **Linear Feet:** ±10% (accounts for extraction variability)
- **Slope Percent:** ±3% (e.g., "slight slope" could be 3-7%)
- **Gates:** Exact count match required
- **Fence Type:** Exact match required
- **Height:** Exact match required

## Running Tests

### Full Test Suite
```bash
npm run test:ai-extraction
# or
tsx scripts/test-ai-extraction.ts
```

### Priority Filter
```bash
tsx scripts/test-ai-extraction.ts high
tsx scripts/test-ai-extraction.ts medium
tsx scripts/test-ai-extraction.ts low
```

### Requirements
- `OPENAI_API_KEY` environment variable set
- GPT-4o API access
- ~5,000-10,000 tokens per full run (cost: $0.10-$0.20)

## Output

### Console Summary
```
[HIGH] simple-vinyl-privacy... ✅ PASS
[HIGH] multi-run-with-gates... ❌ FAIL
...
═══════════════════════════════════════════════════════════
TEST SUMMARY
═══════════════════════════════════════════════════════════
Total: 12 | Passed: 10 | Failed: 2 | Pass Rate: 83.3%
Tokens: 6,234 input, 1,456 output (7,690 total)
```

### Markdown Report
Generated at: `/docs/ai-extraction-test-results.md`

Contains:
- Full pass/fail breakdown by priority
- Detailed mismatch analysis for each failure
- Common error patterns
- False-certainty failures (high confidence but wrong)
- Extraction output JSON for each test
- Concrete recommendations for prompt/validation improvements

## Adding New Tests

1. Add test case to `test-fixtures/ai-extraction-test-dataset.json`
2. Set appropriate priority level
3. Define expected output structure
4. Set minimum confidence threshold
5. Run tests to validate

### Test Case Template
```json
{
  "id": "descriptive-kebab-case-id",
  "priority": "high",
  "type": "text",
  "input": "Natural language contractor description...",
  "expected": {
    "runs": [
      {
        "linearFeet": 150,
        "fenceType": "vinyl",
        "productLineId": "vinyl_privacy_6ft",
        "heightFt": 6,
        "soilType": "sandy",
        "slopePercent": 0,
        "isWindExposed": false,
        "poolCode": false
      }
    ],
    "gateCount": 1,
    "minConfidence": 0.80
  }
}
```

## Integration with CI/CD

**Recommended:** Run high-priority tests on every PR affecting:
- `src/lib/fence-graph/ai-extract/prompt.ts`
- `src/lib/fence-graph/ai-extract/schema.ts`
- `src/app/dashboard/advanced-estimate/aiActions.ts`

**Threshold:** 100% pass rate on high-priority tests before merge.

## Maintenance

- **Review quarterly** — Add new test cases based on production extraction failures
- **Update expected values** — As prompts improve, adjust expected outputs
- **Retire obsolete tests** — Remove tests for deprecated features
- **Track token costs** — Monitor OpenAI usage trends

## Known Limitations

1. **Image tests not yet supported** — Current harness only executes text extraction
2. **No retry logic** — Transient API failures cause test failure (by design)
3. **No multi-org context** — Tests run without org-specific calibration
4. **Static dataset** — Does not test dynamic contractor variations

## References

- **Extraction Code:** `src/app/dashboard/advanced-estimate/aiActions.ts`
- **Schema:** `src/lib/fence-graph/ai-extract/schema.ts`
- **Prompts:** `src/lib/fence-graph/ai-extract/prompt.ts`
- **Types:** `src/lib/fence-graph/ai-extract/types.ts`
