# AI Extraction Test Results

**Generated:** 2026-04-08T18:47:01.928Z  
**Dataset Version:** 1.0  
**Extraction Path:** Real production pipeline (aiActions.ts → GPT-4o)  

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 12 |
| Passed | 11 ✅ |
| Failed | 1 ❌ |
| Pass Rate | 91.7% |
| Input Tokens | 24,893 |
| Output Tokens | 1,567 |
| Total Tokens | 26,460 |

## By Priority

- **HIGH**: 6/6 passed (100.0%)
- **MEDIUM**: 4/5 passed (80.0%)
- **LOW**: 1/1 passed (100.0%)

## Detailed Results

### simple-vinyl-privacy — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2057 in, 110 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 180,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "No gate information provided",
    "No pool code specified — assumed false"
  ],
  "rawSummary": "180ft of 6ft vinyl privacy fence in the backyard on sandy soil."
}
```

### multi-run-with-gates — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2092 in, 208 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 120,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "sandy_loam",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back yard"
    },
    {
      "linearFeet": 60,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy_loam",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "180ft total: 120ft back yard and 60ft left side, both 6ft vinyl privacy, 1 walk gate, 1 double drive gate, sandy loam soil."
}
```

### wood-privacy-with-slope — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2078 in, 112 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 200,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "clay",
      "slopePercent": 10,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Entire property"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "No gate information provided",
    "Assumed no wind exposure"
  ],
  "rawSummary": "200ft wood privacy fence, 6ft tall, 10% slope, clay soil, no gates."
}
```

### chain-link-commercial — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2071 in, 113 out

**Mismatches:**
- ⚠️  Run 1: soilType "standard" != "clay"

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 350,
      "fenceType": "chain_link",
      "productLineId": "chain_link_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 10,
          "type": "double_drive"
        }
      ],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Parking lot perimeter"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "350ft chain link fence, 6ft height, 1 double drive gate, firm soil, level ground."
}
```

### pool-code-gate — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2075 in, 116 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 140,
      "fenceType": "vinyl",
      "productLineId": "vinyl_picket_4ft",
      "heightFt": 4,
      "gates": [
        {
          "widthFt": 4,
          "type": "pool"
        }
      ],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": true,
      "poolCode": true,
      "runLabel": "Pool enclosure"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "140ft vinyl picket pool enclosure, 1 self-closing walk gate, sandy coastal soil, wind exposure near beach."
}
```

### aluminum-ornamental — ✅ PASS

- **Priority:** medium
- **Confidence:** 0.95
- **Tokens:** 2071 in, 109 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 85,
      "fenceType": "aluminum",
      "productLineId": "aluminum_4ft",
      "heightFt": 4,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Front yard along street"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "85ft aluminum ornamental fence, 4ft tall, 1 walk gate, standard soil."
}
```

### mixed-heights — ✅ PASS

- **Priority:** medium
- **Confidence:** 0.95
- **Tokens:** 2088 in, 272 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 100,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_8ft",
      "heightFt": 8,
      "gates": [],
      "soilType": "rocky",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back property line"
    },
    {
      "linearFeet": 75,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "rocky",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side"
    },
    {
      "linearFeet": 75,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "rocky",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "Gate width assumed to be 4ft walk gate"
  ],
  "rawSummary": "250ft total: 100ft of 8ft vinyl privacy on back, 75ft of 6ft vinyl privacy on each side, rocky soil, slight slope, 1 walk gate on left side."
}
```

### vague-input — ❌ FAIL

- **Priority:** medium
- **Confidence:** 0.20
- **Tokens:** 2060 in, 60 out

**Mismatches:**
- ⚠️  Confidence too low: 0.20 < 0.3 (expected)

**Validation Errors:**
- 🔍 No runs extracted — cannot apply

**Extracted Output:**
```json
{
  "runs": [],
  "confidence": 0.2,
  "flags": [
    "No exact dimensions provided",
    "Fence type not confirmed",
    "No gate information",
    "Cannot generate estimate without measurements — ask contractor for linear footage or property dimensions"
  ],
  "rawSummary": "Insufficient information to generate estimate. Measurements and confirmed fence type required."
}
```

### florida-sandy-soil-auto — ✅ PASS

- **Priority:** high
- **Confidence:** 0.95
- **Tokens:** 2062 in, 113 out

**Mismatches:**
- ⚠️  Run 1: soilType "sandy" != "sandy_loam"

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 150,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "No gate information provided",
    "No pool code specified — assumed false"
  ],
  "rawSummary": "150ft vinyl privacy fence, 6ft tall, backyard in Orlando FL, sandy soil."
}
```

### wet-soil-high-water — ✅ PASS

- **Priority:** medium
- **Confidence:** 0.95
- **Tokens:** 2067 in, 111 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 200,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "wet",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Property backing up to wetland"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "No gate information provided",
    "Assumed no slope"
  ],
  "rawSummary": "200ft wood privacy fence, 6ft tall, wet soil conditions, no gates specified."
}
```

### multiple-gates-complex — ✅ PASS

- **Priority:** medium
- **Confidence:** 0.95
- **Tokens:** 2094 in, 130 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 280,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "pool"
        },
        {
          "widthFt": 4,
          "type": "pool"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": true,
      "runLabel": "Full perimeter"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "280ft vinyl privacy fence, 2 pool gates, 1 double drive gate, sandy soil."
}
```

### steep-slope-stepped — ✅ PASS

- **Priority:** low
- **Confidence:** 0.90
- **Tokens:** 2078 in, 113 out

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 150,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "rocky",
      "slopePercent": 25,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Hillside property"
    }
  ],
  "confidence": 0.9,
  "flags": [
    "No gate information provided",
    "Assumed no wind exposure"
  ],
  "rawSummary": "150ft wood privacy fence on a 25% slope, rocky soil with caliche, no gates."
}
```

## Recommendations

1. **Review failed test cases** — Focus on high-priority failures first
2. **Check false-certainty cases** — Model is confident but wrong
3. **Analyze mismatch patterns** — Identify systematic extraction issues
4. **Update prompts or validation rules** based on patterns
5. **Add more training examples** for problematic scenarios

## Extraction Path Details

- **Entry Point:** `src/app/dashboard/advanced-estimate/aiActions.ts`
- **Model:** GPT-4o (temperature 0.1)
- **Schema:** `src/lib/fence-graph/ai-extract/schema.ts`
- **Prompt:** `src/lib/fence-graph/ai-extract/prompt.ts`
- **Validation:** Zod schema + business rules
- **Required ENV:** `OPENAI_API_KEY`

