# Feedback Loop Foundation - v1.0.0

**Date:** April 9, 2026  
**Status:** 📋 SPECIFICATION - Ready for Implementation  
**Purpose:** Minimal instrumentation for production pricing calibration

---

## Overview

**Goal:** Capture the minimum data needed to validate and improve pricing accuracy in production without building a full analytics system.

**Scope:** Foundation layer only - data capture points, not analysis or dashboards

**Philosophy:** Ship simple, iterate based on real needs

---

## Data Capture Points

### 1. Estimate Generation Event

**When:** Every time `estimateFence()` completes successfully

**Essential Data:**
```typescript
{
  // Unique identifiers
  estimate_id: string,           // UUID or auto-increment
  timestamp: ISO8601,            // When estimate was generated
  
  // Project characteristics
  fence_type: string,            // vinyl, wood, chain_link, aluminum
  product_line_id: string,       // vinyl_privacy_6ft, etc.
  total_lf: number,              // Total linear feet
  gate_count: number,            // Number of gates
  
  // Pricing results
  total_cost: number,            // Final estimate total
  material_cost: number,         // Total material cost
  labor_cost: number,            // Total labor cost
  labor_hours: number,           // Total labor hours
  cost_per_foot: number,         // totalCost / totalLF
  
  // Classification
  pricing_class: string,         // "standard", "component", "picket"
  system_type: string,           // "pre-fab", "component"
  
  // Edge case detection
  edge_case_flags: string[],     // ["long_run_economics"] or []
  edge_case_count: number,       // 0, 1, 2, or 3
  
  // Environmental factors
  soil_type: string,             // standard, clay, sandy, etc.
  wind_mode: boolean,            // true/false
  has_slope: boolean,            // Any run with slopeDeg > 0
  max_slope_deg: number,         // Max slope across all runs
  
  // Confidence
  overall_confidence: number,    // 0.0 - 1.0
  red_flag_count: number,        // Items with confidence < 0.8
}
```

**Storage:** 
- Minimum: Append to log file (JSON lines format)
- Better: Insert into database table `estimates_generated`
- Best: Event stream (e.g., to analytics service)

**Example Log Entry:**
```json
{
  "estimate_id": "est_abc123",
  "timestamp": "2026-04-09T18:00:00Z",
  "fence_type": "vinyl",
  "product_line_id": "vinyl_privacy_6ft",
  "total_lf": 150,
  "gate_count": 1,
  "total_cost": 5226,
  "material_cost": 3601,
  "labor_cost": 1625,
  "labor_hours": 25.0,
  "cost_per_foot": 34.84,
  "pricing_class": "component",
  "system_type": "component",
  "edge_case_flags": [],
  "edge_case_count": 0,
  "soil_type": "standard",
  "wind_mode": false,
  "has_slope": false,
  "max_slope_deg": 0,
  "overall_confidence": 0.95,
  "red_flag_count": 0
}
```

---

### 2. Quote Acceptance Event

**When:** Customer accepts or rejects the quote (if tracked)

**Essential Data:**
```typescript
{
  estimate_id: string,           // Links to estimate_generated
  timestamp: ISO8601,
  
  // Outcome
  status: string,                // "accepted", "rejected", "modified"
  
  // If modified
  final_quoted_price?: number,   // What contractor actually quoted
  adjustment_reason?: string,    // "minimum_charge", "market_rate", etc.
  
  // If accepted
  won_date?: ISO8601,
  
  // If rejected
  rejection_reason?: string,     // "too_high", "customer_declined", etc.
}
```

**Storage:** Same as estimate generation (log or DB)

**Example:**
```json
{
  "estimate_id": "est_abc123",
  "timestamp": "2026-04-09T19:30:00Z",
  "status": "modified",
  "final_quoted_price": 5700,
  "adjustment_reason": "market_rate_adjustment",
  "won_date": "2026-04-10T14:00:00Z"
}
```

---

### 3. Manual Edit Event (Optional)

**When:** Contractor manually adjusts estimate before quoting

**Essential Data:**
```typescript
{
  estimate_id: string,
  timestamp: ISO8601,
  
  // What changed
  field_changed: string,         // "totalCost", "laborHours", "materialCost"
  original_value: number,
  new_value: number,
  change_pct: number,            // (new - original) / original * 100
  
  // Why changed
  reason?: string,               // "edge_case_adjustment", "market_conditions", etc.
}
```

---

## Implementation Strategy

### Phase 1: Minimal Viable Logging (Day 1)

**File-Based Logging:**
```typescript
// src/lib/analytics/estimateLogger.ts
export function logEstimateGenerated(result: FenceEstimateResult) {
  const totalLF = result.graph.edges
    .filter(e => e.type === "segment")
    .reduce((s, e) => s + e.length_in / 12, 0);
  
  const gateCount = result.graph.edges.filter(e => e.type === "gate").length;
  
  const logEntry = {
    estimate_id: result.projectId,
    timestamp: new Date().toISOString(),
    total_lf: totalLF,
    gate_count: gateCount,
    total_cost: result.totalCost,
    material_cost: result.totalMaterialCost,
    labor_cost: result.totalLaborCost,
    labor_hours: result.totalLaborHrs,
    cost_per_foot: result.totalCost / totalLF,
    edge_case_flags: result.edgeCaseFlags?.map(f => f.type) ?? [],
    edge_case_count: result.edgeCaseFlags?.length ?? 0,
    overall_confidence: result.overallConfidence,
    red_flag_count: result.redFlagItems.length,
  };
  
  // Append to file (in production, use proper logging service)
  fs.appendFileSync(
    'logs/estimates.jsonl',
    JSON.stringify(logEntry) + '\n'
  );
}
```

**Integration:**
```typescript
// src/lib/fence-graph/bom/index.ts
import { logEstimateGenerated } from "../../analytics/estimateLogger";

export function generateBom(...) {
  // ... existing code
  
  // Log estimate generation
  if (process.env.ENABLE_ANALYTICS !== 'false') {
    try {
      logEstimateGenerated(result);
    } catch (err) {
      console.error("Analytics logging failed:", err);
      // Don't fail the estimate if logging fails
    }
  }
  
  return result;
}
```

---

### Phase 2: Database Integration (Week 1-2)

**Schema:**
```sql
CREATE TABLE estimates_generated (
  id SERIAL PRIMARY KEY,
  estimate_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Project characteristics
  fence_type VARCHAR(50),
  product_line_id VARCHAR(100),
  total_lf DECIMAL(10,2),
  gate_count INTEGER,
  
  -- Pricing results
  total_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  labor_hours DECIMAL(5,1),
  cost_per_foot DECIMAL(10,2),
  
  -- Classification
  pricing_class VARCHAR(50),
  system_type VARCHAR(50),
  
  -- Edge cases
  edge_case_flags TEXT[],        -- PostgreSQL array
  edge_case_count INTEGER,
  
  -- Environmental
  soil_type VARCHAR(50),
  wind_mode BOOLEAN,
  has_slope BOOLEAN,
  max_slope_deg INTEGER,
  
  -- Confidence
  overall_confidence DECIMAL(3,2),
  red_flag_count INTEGER,
  
  -- Metadata
  user_id VARCHAR(255),          -- If multi-tenant
  version VARCHAR(20)            -- Software version
);

CREATE INDEX idx_created_at ON estimates_generated(created_at);
CREATE INDEX idx_fence_type ON estimates_generated(fence_type);
CREATE INDEX idx_edge_case_count ON estimates_generated(edge_case_count) WHERE edge_case_count > 0;
```

---

### Phase 3: Quote Outcome Tracking (Week 2-4)

**Schema:**
```sql
CREATE TABLE quote_outcomes (
  id SERIAL PRIMARY KEY,
  estimate_id VARCHAR(255) REFERENCES estimates_generated(estimate_id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Outcome
  status VARCHAR(50),            -- accepted, rejected, modified
  
  -- If modified
  final_quoted_price DECIMAL(10,2),
  adjustment_amount DECIMAL(10,2),
  adjustment_pct DECIMAL(5,2),
  adjustment_reason TEXT,
  
  -- If accepted
  won_date TIMESTAMP,
  actual_install_date TIMESTAMP,
  
  -- If rejected
  rejection_reason TEXT,
  competitor_price DECIMAL(10,2) -- if known
);
```

---

## Analysis Queries (Example)

### Edge Case Frequency

```sql
-- How often do edge cases occur?
SELECT 
  edge_case_flags[1] as edge_case_type,
  COUNT(*) as occurrences,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM estimates_generated), 2) as pct
FROM estimates_generated
WHERE edge_case_count > 0
GROUP BY edge_case_flags[1]
ORDER BY occurrences DESC;
```

**Expected Output:**
```
edge_case_type         | occurrences | pct
-----------------------+-------------+------
long_run_economics     | 45          | 6.2%
gate_dominant_short_run| 38          | 5.3%
ultra_high_gate_density| 12          | 1.7%
```

---

### Cost Per Foot by Material

```sql
-- Average cost per foot by material type
SELECT 
  fence_type,
  COUNT(*) as estimates,
  ROUND(AVG(cost_per_foot), 2) as avg_cost_per_foot,
  ROUND(STDDEV(cost_per_foot), 2) as stddev,
  ROUND(MIN(cost_per_foot), 2) as min,
  ROUND(MAX(cost_per_foot), 2) as max
FROM estimates_generated
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY fence_type
ORDER BY fence_type;
```

**Expected Output:**
```
fence_type  | estimates | avg_cost_per_foot | stddev | min   | max
------------+-----------+-------------------+--------+-------+------
vinyl       | 245       | 35.20             | 4.80   | 27.56 | 43.53
wood        | 178       | 23.50             | 3.20   | 21.21 | 30.83
chain_link  | 92        | 12.10             | 1.50   | 10.30 | 15.26
aluminum    | 34        | 48.90             | 6.20   | 38.00 | 62.00
```

---

### Acceptance Rate by Edge Case

```sql
-- Do edge cases correlate with rejection?
SELECT 
  CASE 
    WHEN eg.edge_case_count = 0 THEN 'no_edge_case'
    ELSE 'has_edge_case'
  END as edge_case_status,
  COUNT(DISTINCT eg.estimate_id) as total_estimates,
  COUNT(DISTINCT qo.estimate_id) FILTER (WHERE qo.status = 'accepted') as accepted,
  ROUND(
    COUNT(DISTINCT qo.estimate_id) FILTER (WHERE qo.status = 'accepted') * 100.0 / 
    COUNT(DISTINCT eg.estimate_id),
    2
  ) as acceptance_rate_pct
FROM estimates_generated eg
LEFT JOIN quote_outcomes qo ON eg.estimate_id = qo.estimate_id
WHERE eg.created_at > NOW() - INTERVAL '30 days'
GROUP BY edge_case_status;
```

**Expected Output:**
```
edge_case_status | total_estimates | accepted | acceptance_rate_pct
-----------------+-----------------+----------+--------------------
no_edge_case     | 454             | 362      | 79.7%
has_edge_case    | 95              | 68       | 71.6%
```

---

## Dashboard Metrics (Future)

### Key Performance Indicators

1. **Estimate Volume**
   - Daily/weekly/monthly estimate count
   - Trend over time

2. **Edge Case Frequency**
   - % of estimates with edge case flags
   - Breakdown by edge case type
   - Trend over time

3. **Cost Distribution**
   - Cost per foot by material type
   - Histogram of total costs
   - Outlier detection

4. **Acceptance Rate**
   - Overall quote acceptance rate
   - By material type
   - By edge case presence
   - By cost range

5. **Manual Adjustments**
   - % of estimates manually adjusted
   - Average adjustment amount
   - Common adjustment reasons

---

## Privacy & Security Considerations

### Data Minimization

**DO Capture:**
- Project characteristics (LF, material, gates)
- Pricing results (costs, hours)
- Edge case flags
- Quote outcomes

**DON'T Capture:**
- Customer names or contact information
- Street addresses
- Payment details
- Personal information

### Data Retention

**Recommended:**
- Keep raw estimate data for 12 months
- Aggregate to summary statistics monthly
- Archive older data for compliance

**Compliance:**
- Check local data retention laws
- Implement data deletion on request
- Encrypt sensitive data at rest

---

## Implementation Checklist

### Phase 1: Minimal Logging (Day 1)
- [ ] Create `src/lib/analytics/estimateLogger.ts`
- [ ] Add logging call to `generateBom()`
- [ ] Set up log file rotation
- [ ] Test logging doesn't break estimates
- [ ] Deploy with `ENABLE_ANALYTICS=true`

### Phase 2: Database Integration (Week 1-2)
- [ ] Create database schema
- [ ] Implement database logger
- [ ] Add error handling
- [ ] Test performance impact (<10ms)
- [ ] Set up monitoring for failed logs

### Phase 3: Quote Outcome Tracking (Week 2-4)
- [ ] Create quote outcome schema
- [ ] Build UI for recording outcomes
- [ ] Link estimates to outcomes
- [ ] Test data integrity

### Phase 4: Basic Analysis (Month 1)
- [ ] Create analysis SQL queries
- [ ] Build simple dashboard (Grafana, Metabase, etc.)
- [ ] Set up weekly reports
- [ ] Review metrics with team

---

## Success Metrics

**Short-term (Week 1):**
- [ ] Logging operational for 100+ estimates
- [ ] No performance degradation
- [ ] Zero logging-related errors

**Medium-term (Month 1):**
- [ ] 1,000+ estimates logged
- [ ] Edge case frequency validated
- [ ] Cost per foot distributions established
- [ ] First calibration insights identified

**Long-term (Quarter 1):**
- [ ] 10,000+ estimates logged
- [ ] Acceptance rate data available
- [ ] Manual adjustment patterns identified
- [ ] Data-driven calibration adjustments made

---

## Next Steps

1. **Implement Phase 1 (Day 1):** File-based logging
2. **Monitor for 1 week:** Verify data quality
3. **Analyze initial data:** Look for unexpected patterns
4. **Implement Phase 2 (Week 2):** Database integration
5. **Build basic dashboard (Week 3):** Visualize key metrics
6. **Enable quote tracking (Week 4):** Link to outcomes

---

## Appendix: Example Integration

### Estimate Generation

```typescript
// src/lib/fence-graph/bom/index.ts
export function generateBom(
  graph: FenceGraph,
  options: BomOptions
): FenceEstimateResult {
  // ... existing BOM generation code
  
  const result: FenceEstimateResult = {
    projectId: graph.projectId,
    // ... all existing fields
  };
  
  // Edge case detection
  const edgeCaseFlags = detectEdgeCases(result, graph, fenceType);
  if (edgeCaseFlags.length > 0) {
    result.edgeCaseFlags = edgeCaseFlags;
    addEdgeCaseSummary(result, edgeCaseFlags);
  }
  
  // Validation
  assertValidEstimate(result);
  
  // ── ANALYTICS: Log estimate generation ──
  if (process.env.ENABLE_ANALYTICS !== 'false') {
    try {
      logEstimateGenerated(result, graph, options.fenceType);
    } catch (err) {
      console.error("Analytics logging failed (non-fatal):", err);
    }
  }
  
  return result;
}
```

### Logger Implementation

```typescript
// src/lib/analytics/estimateLogger.ts
import fs from 'fs';
import path from 'path';
import type { FenceEstimateResult, FenceGraph } from '../fence-graph/types';

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'estimates.jsonl');

export function logEstimateGenerated(
  result: FenceEstimateResult,
  graph: FenceGraph,
  fenceType: string
) {
  // Calculate metrics
  const totalLF = graph.edges
    .filter(e => e.type === "segment")
    .reduce((s, e) => s + e.length_in / 12, 0);
  
  const gateCount = graph.edges.filter(e => e.type === "gate").length;
  
  const hasSlope = graph.edges
    .filter(e => e.type === "segment")
    .some(e => (e as any).slopeDeg > 0);
  
  const maxSlope = Math.max(...graph.edges
    .filter(e => e.type === "segment")
    .map(e => (e as any).slopeDeg || 0));
  
  // Build log entry
  const logEntry = {
    estimate_id: result.projectId,
    timestamp: new Date().toISOString(),
    
    fence_type: fenceType,
    product_line_id: graph.productLine.name.toLowerCase().replace(/\s+/g, '_'),
    total_lf: Math.round(totalLF * 100) / 100,
    gate_count: gateCount,
    
    total_cost: result.totalCost,
    material_cost: result.totalMaterialCost,
    labor_cost: result.totalLaborCost,
    labor_hours: result.totalLaborHrs,
    cost_per_foot: Math.round((result.totalCost / totalLF) * 100) / 100,
    
    pricing_class: determinePricingClass(result.auditTrail),
    system_type: determineSystemType(result.auditTrail),
    
    edge_case_flags: result.edgeCaseFlags?.map(f => f.type) ?? [],
    edge_case_count: result.edgeCaseFlags?.length ?? 0,
    
    soil_type: graph.siteConfig.soilType,
    wind_mode: graph.windMode ?? false,
    has_slope: hasSlope,
    max_slope_deg: maxSlope,
    
    overall_confidence: result.overallConfidence,
    red_flag_count: result.redFlagItems.length,
    
    version: '1.0.0',
  };
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
}

function determinePricingClass(auditTrail: string[]): string {
  const classLine = auditTrail.find(line => line.includes('Pricing Class:'));
  if (!classLine) return 'unknown';
  
  if (classLine.includes('COMPONENT')) return 'component';
  if (classLine.includes('PICKET')) return 'picket';
  return 'standard';
}

function determineSystemType(auditTrail: string[]): string {
  const typeLine = auditTrail.find(line => line.includes('System Type:'));
  if (!typeLine) return 'unknown';
  
  if (typeLine.includes('COMPONENT')) return 'component';
  return 'pre-fab';
}
```

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Estimated Effort:** 4-8 hours (Phase 1), 1-2 days (Phase 2-3)
