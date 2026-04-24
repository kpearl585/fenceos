# AI Extraction Stress Test Results

**Generated:** 2026-04-08T18:47:59.068Z
**Dataset:** Real-world messy contractor inputs
**Total Inputs:** 20

## Summary

| Metric | Value |
|--------|-------|
| Total Inputs | 20 |
| High Confidence (>0.9) | 4 |
| Medium (0.7–0.9) | 16 |
| Low (<0.7) | 0 |
| Inputs with Issues | 2 |
| Total Tokens | 44932 |
| Input Tokens | 41,439 |
| Output Tokens | 3,493 |

## Top Issue Patterns

- **2x**: HIGH_CONFIDENCE_ON_VAGUE_INPUT

## Worst 2 Inputs

### 1. stress-09

**Input:**
```
Back yard 150, left side 80, right side 80, all 6ft wood privacy. Sloped property maybe 15 degrees or so. Clay soil. 1 walk gate on left side.
```

**Confidence:** 0.95

**Issues:**
- HIGH_CONFIDENCE_ON_VAGUE_INPUT

**Flags:**
- None

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
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back yard"
    },
    {
      "linearFeet": 80,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side yard"
    },
    {
      "linearFeet": 80,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side yard"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "310ft total: 150ft back yard, 80ft left side with 1 walk gate, 80ft right side, all 6ft wood privacy on sloped clay soil."
}
```

### 2. stress-17

**Input:**
```
Got a weird shaped lot. Back is 140ft needs 6ft vinyl privacy. Left side 90ft needs 4ft picket cause of HOA. Right side 100ft can be 6ft privacy. All vinyl. Gates: 1 double drive in back, 1 walk on left. Sandy loam soil, mostly flat except left side slopes maybe 5%.
```

**Confidence:** 0.95

**Issues:**
- HIGH_CONFIDENCE_ON_VAGUE_INPUT

**Flags:**
- None

**Extracted Output:**
```json
{
  "runs": [
    {
      "linearFeet": 140,
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
      "runLabel": "Back side"
    },
    {
      "linearFeet": 90,
      "fenceType": "vinyl",
      "productLineId": "vinyl_picket_4ft",
      "heightFt": 4,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy_loam",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side with HOA restriction"
    },
    {
      "linearFeet": 100,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy_loam",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "330ft total: 140ft vinyl privacy with double drive gate, 90ft vinyl picket with walk gate, 100ft vinyl privacy. Sandy loam soil, mostly flat with 5% slope on left side."
}
```

## All Results

### ✅ stress-01

**Input:** "need about 200ft maybe more of vinyl fence around backyard, 6ft tall probably, got a gate somewhere need double for the driveway, yard slopes a bit in the back not sure how much"

**Confidence:** 0.70 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 200,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "standard",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard"
    }
  ],
  "confidence": 0.7,
  "flags": [
    "Exact linear footage not specified, assumed 200ft",
    "Slope percentage estimated, not specified",
    "Gate location and type not fully detailed"
  ],
  "rawSummary": "Estimated 200ft vinyl privacy fence, 6ft tall, with a double drive gate, sloped backyard."
}
```
</details>

### ✅ stress-02

**Input:** "Looking for chain link for my commercial property parking lot. Roughly 400 feet give or take. Need it 6 or 8 feet high whatever code requires. Ground is pretty level. One big gate for trucks."

**Confidence:** 0.80 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 400,
      "fenceType": "chain_link",
      "productLineId": "chain_link_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 16,
          "type": "double_drive"
        }
      ],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Commercial property parking lot"
    }
  ],
  "confidence": 0.8,
  "flags": [
    "Height not specified, defaulted to 6ft",
    "Exact linear footage not specified, estimated at 400ft",
    "Gate width assumed to be 16ft for truck access"
  ],
  "rawSummary": "Estimated 400ft chain link fence, 6ft tall, with one large double drive gate for trucks."
}
```
</details>

### ✅ stress-03

**Input:** "wood privacy fence, backyard is like 180-200ft not totally sure, some of it is 6ft but want the sides lower like 5ft cause of the neighbors, sandy soil we're in orlando, need a walk gate"

**Confidence:** 0.75 | **Issues:** 0 | **Flags:** 4

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 180,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard - 6ft section"
    },
    {
      "linearFeet": 20,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 5,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard - 5ft sides"
    }
  ],
  "confidence": 0.75,
  "flags": [
    "Estimated total linear feet as 200ft",
    "Assumed 20ft for 5ft sections",
    "Height for sides assumed as 5ft",
    "No specific dimensions for each section provided"
  ],
  "rawSummary": "200ft wood privacy fence in Orlando, 180ft at 6ft height, 20ft at 5ft height, sandy soil, 1 walk gate."
}
```
</details>

### ✅ stress-04

**Input:** "Pool fence!! 4ft vinyl picket. Around 120-140 feet. Need the self closing gate for pool code. We're right on the beach so lots of sand and wind. How much extra is the wind rated stuff?"

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 130,
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
      "runLabel": "Pool area"
    }
  ],
  "confidence": 0.85,
  "flags": [
    "Estimated linear feet as 130 based on range provided",
    "Cost for wind-rated materials not included"
  ],
  "rawSummary": "130ft vinyl picket pool fence, 1 pool gate, sandy soil, wind exposed."
}
```
</details>

### ✅ stress-05

**Input:** "Entire property maybe 500ft of wood fence 6ft, ground is uneven in spots, got some rocks in the soil, need couple gates not sure what size yet can we figure that out later"

**Confidence:** 0.75 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 500,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "rocky",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Entire property"
    }
  ],
  "confidence": 0.75,
  "flags": [
    "Gate sizes unspecified — assumed to be determined later",
    "Uneven ground with rocks noted, slope percent estimated",
    "Exact linear footage is an estimate"
  ],
  "rawSummary": "Estimated 500ft wood privacy fence, 6ft tall, rocky soil, uneven ground, gates to be determined."
}
```
</details>

### ✅ stress-06

**Input:** "vinyl privacy back and sides total around 250-300ft, flat yard, normal soil I think, definitely need 2 walk gates and 1 double drive gate in the back, 6ft high"

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 275,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        },
        {
          "widthFt": 4,
          "type": "walk"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back and side yards"
    }
  ],
  "confidence": 0.85,
  "flags": [
    "Estimated linear feet as 275ft based on range provided",
    "Soil type assumed as standard"
  ],
  "rawSummary": "275ft vinyl privacy fence, 2 walk gates, 1 double drive gate, standard soil."
}
```
</details>

### ✅ stress-07

**Input:** "just the back 100ft or so, want vinyl but nice looking kind, 6 foot, no gate, yard is pretty flat, idk about soil"

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 100,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back yard"
    }
  ],
  "confidence": 0.85,
  "flags": [
    "Soil type not specified — defaulted to standard",
    "Exact linear footage is approximate"
  ],
  "rawSummary": "Approximately 100ft vinyl privacy fence, 6ft tall, no gates, flat yard."
}
```
</details>

### ✅ stress-08

**Input:** "Big commercial job - chain link 8ft around warehouse. Probably 600-700 feet. Need 3 double gates for loading docks. Soil is hard clay. Level ground mostly."

**Confidence:** 0.75 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 650,
      "fenceType": "chain_link",
      "productLineId": "chain_link_6ft",
      "heightFt": 8,
      "gates": [
        {
          "widthFt": 12,
          "type": "double_drive"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "clay",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Warehouse perimeter"
    }
  ],
  "confidence": 0.75,
  "flags": [
    "Estimated linear feet as 650 based on range provided",
    "Chain link height defaulted to 6ft as 8ft is not available in product line"
  ],
  "rawSummary": "Estimated 650ft chain link fence, 8ft tall, around warehouse with 3 double drive gates, hard clay soil."
}
```
</details>

### ⚠️ stress-09

**Input:** "Back yard 150, left side 80, right side 80, all 6ft wood privacy. Sloped property maybe 15 degrees or so. Clay soil. 1 walk gate on left side."

**Confidence:** 0.95 | **Issues:** 1 | **Flags:** 0

**Issues:** HIGH_CONFIDENCE_ON_VAGUE_INPUT

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 150,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back yard"
    },
    {
      "linearFeet": 80,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side yard"
    },
    {
      "linearFeet": 80,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "clay",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side yard"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "310ft total: 150ft back yard, 80ft left side with 1 walk gate, 80ft right side, all 6ft wood privacy on sloped clay soil."
}
```
</details>

### ✅ stress-10

**Input:** "need fence asap, about 180 feet vinyl 6ft, got 1 gate for walking, yard isn't totally level but not super steep either, florida so sandy"

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 180,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Yard perimeter"
    }
  ],
  "confidence": 0.85,
  "flags": [
    "Slope estimated as moderate, around 5%",
    "No pool code specified — assumed false"
  ],
  "rawSummary": "180ft vinyl privacy fence, 1 walk gate, moderate slope, sandy soil in Florida."
}
```
</details>

### ✅ stress-11

**Input:** "Pool area needs 4ft picket fence white vinyl. Maybe 160ft total? Pool code gate required. Coastal property sandy soil windy. Also might want 6ft privacy on one side of pool like 40ft more."

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 160,
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
      "runLabel": "Pool area - picket fence"
    },
    {
      "linearFeet": 40,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": true,
      "poolCode": false,
      "runLabel": "One side of pool - privacy fence"
    }
  ],
  "confidence": 0.85,
  "flags": [
    "Total linear feet for picket fence is estimated",
    "Privacy fence location and exact length are assumed"
  ],
  "rawSummary": "160ft vinyl picket fence with pool gate and 40ft vinyl privacy fence, coastal sandy soil, windy conditions."
}
```
</details>

### ✅ stress-12

**Input:** "Looking for estimate on backyard fence, thinking vinyl privacy, 6 or 8ft not decided yet, around 200-250ft, need gate for mower like 4-5ft wide, soil is mix of sand and dirt, pretty flat"

**Confidence:** 0.70 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 225,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 5,
          "type": "walk"
        }
      ],
      "soilType": "sandy_loam",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard"
    }
  ],
  "confidence": 0.7,
  "flags": [
    "Height not decided, defaulted to 6ft",
    "Linear footage estimated at midpoint of range",
    "Gate width estimated at midpoint of range"
  ],
  "rawSummary": "Estimated 225ft vinyl privacy fence, 6ft tall, with one 5ft gate, sandy loam soil."
}
```
</details>

### ✅ stress-13

**Input:** "Small job just 60ft chain link 4ft around AC units, commercial property, 1 walk gate, flat, standard soil"

**Confidence:** 0.95 | **Issues:** 0 | **Flags:** 0

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 60,
      "fenceType": "chain_link",
      "productLineId": "chain_link_4ft",
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
      "runLabel": "Around AC units"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "60ft chain link fence, 4ft tall, 1 walk gate, around AC units on commercial property."
}
```
</details>

### ✅ stress-14

**Input:** "backyard and both sides total maybe 350-400ft, want wood or vinyl whatever is cheaper, 6ft tall, yard slopes down to creek in back pretty steep, rocky soil, 2 gates one walk one double"

**Confidence:** 0.70 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 375,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "rocky",
      "slopePercent": 15,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Backyard and both sides"
    }
  ],
  "confidence": 0.7,
  "flags": [
    "Estimated total linear feet as 375ft",
    "Fence type defaulted to wood for cost assumption",
    "Slope estimated at 15% based on 'pretty steep' description"
  ],
  "rawSummary": "Estimated 375ft wood privacy fence, 6ft tall, rocky soil, steep slope, 1 walk gate, 1 double drive gate."
}
```
</details>

### ✅ stress-15

**Input:** "HOA says we can only do 6ft vinyl privacy in back 120ft and 5ft vinyl picket on sides 60ft each side. Need 1 walk gate in back. Flat sandy soil Orlando area."

**Confidence:** 0.95 | **Issues:** 0 | **Flags:** 1

<details>
<summary>Extracted Output</summary>

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
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back yard"
    },
    {
      "linearFeet": 60,
      "fenceType": "vinyl",
      "productLineId": "vinyl_picket_6ft",
      "heightFt": 5,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side yard"
    },
    {
      "linearFeet": 60,
      "fenceType": "vinyl",
      "productLineId": "vinyl_picket_6ft",
      "heightFt": 5,
      "gates": [],
      "soilType": "sandy",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side yard"
    }
  ],
  "confidence": 0.95,
  "flags": [
    "Height for picket fence adjusted to 5ft as per HOA requirement"
  ],
  "rawSummary": "120ft vinyl privacy fence with 1 walk gate in back, 60ft 5ft vinyl picket on each side, sandy soil in Orlando."
}
```
</details>

### ✅ stress-16

**Input:** "Just want quick quote for about 100-150 feet wood fence 6ft tall, backyard, normal conditions, 1 gate"

**Confidence:** 0.80 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 125,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
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
      "runLabel": "Backyard"
    }
  ],
  "confidence": 0.8,
  "flags": [
    "Estimated linear feet as 125 based on range provided",
    "Gate width assumed to be 4ft walk gate"
  ],
  "rawSummary": "Estimated 125ft wood privacy fence, 6ft tall, 1 walk gate, standard conditions."
}
```
</details>

### ⚠️ stress-17

**Input:** "Got a weird shaped lot. Back is 140ft needs 6ft vinyl privacy. Left side 90ft needs 4ft picket cause of HOA. Right side 100ft can be 6ft privacy. All vinyl. Gates: 1 double drive in back, 1 walk on left. Sandy loam soil, mostly flat except left side slopes maybe 5%."

**Confidence:** 0.95 | **Issues:** 1 | **Flags:** 0

**Issues:** HIGH_CONFIDENCE_ON_VAGUE_INPUT

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 140,
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
      "runLabel": "Back side"
    },
    {
      "linearFeet": 90,
      "fenceType": "vinyl",
      "productLineId": "vinyl_picket_4ft",
      "heightFt": 4,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "sandy_loam",
      "slopePercent": 5,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side with HOA restriction"
    },
    {
      "linearFeet": 100,
      "fenceType": "vinyl",
      "productLineId": "vinyl_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "sandy_loam",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side"
    }
  ],
  "confidence": 0.95,
  "flags": [],
  "rawSummary": "330ft total: 140ft vinyl privacy with double drive gate, 90ft vinyl picket with walk gate, 100ft vinyl privacy. Sandy loam soil, mostly flat with 5% slope on left side."
}
```
</details>

### ✅ stress-18

**Input:** "Pool enclosure fence 4ft, vinyl, self closing gate, probably 100-120 feet, we are in coastal florida so sandy and windy, also need pool code compliance obviously"

**Confidence:** 0.85 | **Issues:** 0 | **Flags:** 2

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 110,
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
  "confidence": 0.85,
  "flags": [
    "Estimated linear feet as 110 based on range provided",
    "Assumed 4ft vinyl picket for pool enclosure"
  ],
  "rawSummary": "110ft vinyl picket pool enclosure fence, 4ft tall, with self-closing pool gate, sandy and windy conditions in coastal Florida."
}
```
</details>

### ✅ stress-19

**Input:** "Big privacy fence all around property. Back 180ft, left 150ft, right 150ft. All 6ft wood. Very sloped property probably 20-25 degree slope going down left to right. Heavy clay soil. Need 2 walk gates and 1 double drive gate. Can the fence step down or does it have to rack?"

**Confidence:** 0.90 | **Issues:** 0 | **Flags:** 4

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 180,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [],
      "soilType": "clay",
      "slopePercent": 25,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Back side"
    },
    {
      "linearFeet": 150,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        }
      ],
      "soilType": "clay",
      "slopePercent": 25,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Left side"
    },
    {
      "linearFeet": 150,
      "fenceType": "wood",
      "productLineId": "wood_privacy_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 4,
          "type": "walk"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "clay",
      "slopePercent": 25,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Right side"
    }
  ],
  "confidence": 0.9,
  "flags": [
    "Slope estimated at 25% based on description",
    "Assumed walk gates are 4ft wide",
    "Assumed double drive gate is 12ft wide",
    "No information on stepping or racking preference"
  ],
  "rawSummary": "480ft total wood privacy fence, 6ft tall, heavy clay soil, 25% slope, 2 walk gates, 1 double drive gate."
}
```
</details>

### ✅ stress-20

**Input:** "commercial parking lot, chain link 6 or 8ft whatever code says, maybe 450 feet total perimeter, need 2 double gates for entry/exit, ground is paved already but underneath is regular dirt, flat"

**Confidence:** 0.70 | **Issues:** 0 | **Flags:** 3

<details>
<summary>Extracted Output</summary>

```json
{
  "runs": [
    {
      "linearFeet": 450,
      "fenceType": "chain_link",
      "productLineId": "chain_link_6ft",
      "heightFt": 6,
      "gates": [
        {
          "widthFt": 12,
          "type": "double_drive"
        },
        {
          "widthFt": 12,
          "type": "double_drive"
        }
      ],
      "soilType": "standard",
      "slopePercent": 0,
      "isWindExposed": false,
      "poolCode": false,
      "runLabel": "Commercial parking lot perimeter"
    }
  ],
  "confidence": 0.7,
  "flags": [
    "Height not specified, defaulted to 6ft",
    "Assumed standard soil under pavement",
    "Exact linear footage is an estimate"
  ],
  "rawSummary": "450ft chain link fence around commercial parking lot, 2 double drive gates, standard soil under pavement."
}
```
</details>

