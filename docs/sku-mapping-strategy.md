# SKU Mapping Strategy

**Date:** April 9, 2026  
**Sprint:** Supplier Price Sync Architecture  
**Phase:** 4 - SKU Mapping Layer

---

## Overview

The SKU Mapping Layer is the **intelligence** of the price sync system. It matches supplier products (descriptions, SKUs) to internal material SKUs with high accuracy while allowing user corrections and learning.

---

## Matching Strategies (Priority Order)

### 1. Exact SKU Match (Confidence: 1.0)
**Rule:** Supplier SKU exactly matches internal SKU  
**Example:** Supplier SKU "VINYL_POST_5X5" → Internal SKU "VINYL_POST_5X5"

```typescript
if (supplierProduct.supplierSku === internalMaterial.sku) {
  return { match: internalMaterial.sku, confidence: 1.0, reason: "Exact SKU match" };
}
```

---

### 2. User-Defined Mapping (Confidence: 1.0 if verified)
**Rule:** Check `supplier_product_mappings` table  
**Example:** User taught system that HD SKU "123456" = "VINYL_PANEL_6FT"

```typescript
const mapping = await db.supplier_product_mappings
  .where({ org_id, connector_id, supplier_sku })
  .where({ status: 'active' })
  .first();

if (mapping) {
  return {
    match: mapping.internal_sku,
    confidence: mapping.verified ? 1.0 : mapping.confidence,
    reason: "User-defined mapping",
  };
}
```

---

### 3. Exact Name Match (Confidence: 0.95)
**Rule:** Normalized supplier description exactly matches internal material name  
**Example:** "Vinyl Post 5x5 White 10ft" → "Vinyl Post 5x5 White 10ft"

```typescript
const normalizedSupplier = normalize(supplierProduct.description);
const normalizedInternal = normalize(internalMaterial.name);

if (normalizedSupplier === normalizedInternal) {
  return { match: internalMaterial.sku, confidence: 0.95, reason: "Exact name match" };
}
```

---

### 4. Fuzzy Name Match (Confidence: 0.6 - 0.9)
**Rule:** Use string similarity (Levenshtein distance, trigram similarity)  
**Example:** "Vinyl Privacy Panel 6 ft" ≈ "Vinyl Privacy Panel 6ft" (similarity: 0.92)

```typescript
import { similarity } from "pg-trgm"; // PostgreSQL trigram extension

const matches = await db.materials
  .where({ org_id })
  .select(`sku, name, similarity(name, '${supplierDescription}') as confidence`)
  .where('similarity(name, ?) > 0.6', supplierDescription)
  .orderBy('confidence', 'desc')
  .limit(5);

if (matches.length > 0) {
  return {
    match: matches[0].sku,
    confidence: matches[0].confidence,
    reason: `Fuzzy name match (${Math.round(matches[0].confidence * 100)}% similar)`,
  };
}
```

**PostgreSQL Setup:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_materials_name_trgm ON materials USING gin(name gin_trgm_ops);
```

---

### 5. Keyword Match (Confidence: 0.5 - 0.85)
**Rule:** Match based on keyword rules (current system)  
**Example:** Description contains ["vinyl", "post", "5x5"] → "VINYL_POST_5X5"

```typescript
// Upgrade current keyword matching to support user-defined rules
const rules = await db.match_rules
  .where({ org_id, status: 'active' })
  .orderBy('priority', 'desc'); // User rules override defaults

const normalizedTokens = normalize(supplierDescription).split(' ');

let bestMatch = null;
let bestHits = 0;

for (const rule of rules) {
  const hits = rule.keywords.filter(kw =>
    normalizedTokens.some(t => t.includes(kw))
  ).length;

  if (hits > bestHits || (hits === bestHits && rule.priority > (bestMatch?.priority ?? 0))) {
    bestHits = hits;
    bestMatch = rule;
  }
}

if (bestMatch && bestHits >= (bestMatch.min_keyword_hits || 1)) {
  const confidence = Math.min(0.85, bestHits / bestMatch.keywords.length);
  return {
    match: bestMatch.target_sku,
    confidence,
    reason: `Keyword match: ${bestHits}/${bestMatch.keywords.length} keywords`,
  };
}
```

---

### 6. No Match (Confidence: 0.0)
**Rule:** No matching strategy succeeded  
**Action:** Flag for manual review

```typescript
return {
  match: null,
  confidence: 0.0,
  reason: "No matching rule found - manual mapping required",
};
```

---

## Matching Algorithm

```typescript
async function matchSupplierProduct(
  supplierProduct: SupplierProduct,
  orgId: string,
  connectorId: string
): Promise<ProductMapping> {
  // 1. Exact SKU match
  if (supplierProduct.supplierSku) {
    const exactMatch = await findBySku(orgId, supplierProduct.supplierSku);
    if (exactMatch) {
      return {
        supplierProduct,
        internalSku: exactMatch.sku,
        internalName: exactMatch.name,
        currentUnitCost: exactMatch.unit_cost,
        confidence: 1.0,
        matchReason: "Exact SKU match",
        mappingType: "exact_sku",
      };
    }
  }

  // 2. User-defined mapping
  const userMapping = await findUserMapping(orgId, connectorId, supplierProduct.supplierSku);
  if (userMapping) {
    return {
      supplierProduct,
      internalSku: userMapping.internal_sku,
      internalName: userMapping.material_name,
      currentUnitCost: userMapping.current_cost,
      confidence: userMapping.verified ? 1.0 : userMapping.confidence,
      matchReason: userMapping.verified ? "Verified user mapping" : "User mapping",
      mappingType: "manual",
      verified: userMapping.verified,
    };
  }

  // 3. Exact name match
  const exactNameMatch = await findByExactName(orgId, supplierProduct.description);
  if (exactNameMatch) {
    return {
      supplierProduct,
      internalSku: exactNameMatch.sku,
      internalName: exactNameMatch.name,
      currentUnitCost: exactNameMatch.unit_cost,
      confidence: 0.95,
      matchReason: "Exact product name match",
      mappingType: "exact_name",
    };
  }

  // 4. Fuzzy name match
  const fuzzyMatches = await findFuzzyNameMatches(orgId, supplierProduct.description, 0.6);
  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    return {
      supplierProduct,
      internalSku: best.sku,
      internalName: best.name,
      currentUnitCost: best.unit_cost,
      confidence: best.similarity,
      matchReason: `Fuzzy name match (${Math.round(best.similarity * 100)}% similar)`,
      mappingType: "fuzzy",
    };
  }

  // 5. Keyword match
  const keywordMatch = await findKeywordMatch(orgId, supplierProduct.description);
  if (keywordMatch) {
    return {
      supplierProduct,
      internalSku: keywordMatch.sku,
      internalName: keywordMatch.name,
      currentUnitCost: keywordMatch.unit_cost,
      confidence: keywordMatch.confidence,
      matchReason: keywordMatch.reason,
      mappingType: "keyword",
    };
  }

  // 6. No match
  return {
    supplierProduct,
    internalSku: null,
    confidence: 0.0,
    matchReason: "No matching product found",
    mappingType: "none",
  };
}
```

---

## Ambiguous Match Prevention

**Problem:** Multiple products match with similar confidence  
**Solution:** Flag as ambiguous, require user decision

```typescript
if (fuzzyMatches.length > 1) {
  const topConfidence = fuzzyMatches[0].similarity;
  const closeMatches = fuzzyMatches.filter(m => m.similarity >= topConfidence - 0.05);

  if (closeMatches.length > 1) {
    // Multiple close matches - ambiguous
    return {
      supplierProduct,
      internalSku: null,
      confidence: 0.0,
      matchReason: `Ambiguous: ${closeMatches.length} similar matches found`,
      mappingType: "none",
      metadata: {
        ambiguous: true,
        candidates: closeMatches.map(m => ({
          sku: m.sku,
          name: m.name,
          similarity: m.similarity,
        })),
      },
    };
  }
}
```

---

## Unit Normalization

**Problem:** Supplier sells by box, internal tracks by unit  
**Solution:** Store conversion factor in mapping

```typescript
// Example: Screws sold by box of 100, tracked individually
{
  supplier_sku: "SCREW-BOX-100",
  internal_sku: "SCREWS_2_5",
  supplier_pack_size: 100,
  unit_conversion_factor: 0.01,  // Divide supplier price by 100
}

// Apply conversion
const normalizedUnitCost = supplierUnitCost * mapping.unit_conversion_factor;
// $10 per box × 0.01 = $0.10 per screw
```

---

## User Teaching Interface

### Scenario: Unmatched Product

**UI Flow:**
1. User sees unmatched row in review table
2. Clicks "Map" button
3. Modal shows:
   - Supplier description
   - Search box to find internal SKU
   - Suggested matches (fuzzy search results)
   - "Create new material" option
4. User selects internal SKU or creates new
5. Mapping saved to `supplier_product_mappings`
6. Future imports auto-match using this rule

**Code:**
```typescript
async function teachMapping(
  orgId: string,
  connectorId: string,
  supplierProduct: SupplierProduct,
  internalSku: string,
  packSizeConversion?: number
) {
  await db.supplier_product_mappings.insert({
    org_id: orgId,
    connector_id: connectorId,
    supplier_sku: supplierProduct.supplierSku,
    supplier_description: supplierProduct.description,
    internal_sku: internalSku,
    mapping_type: 'manual',
    confidence: 1.0,
    match_reason: 'User mapped on ' + new Date().toISOString(),
    verified: true,
    unit_conversion_factor: packSizeConversion || 1.0,
  });
}
```

---

## Confidence Thresholds

| Confidence | Auto-Apply? | UI Display |
|------------|-------------|------------|
| 1.0        | ✅ Yes       | High (Green) |
| 0.9 - 0.99 | ✅ Yes (but show warning if price change > 30%) | High (Green) |
| 0.6 - 0.89 | ⚠️ User must review | Medium (Yellow) |
| < 0.6      | ❌ No | Low (Red) - Manual review required |
| 0.0        | ❌ No | Unmatched (Gray) |

**Auto-selection Rule:**
```typescript
row.selected = row.internalSku !== null && row.confidence > 0.6;
```

---

## Learning from User Actions

**Track mapping usage:**
```typescript
// When user applies a mapping
await db.supplier_product_mappings
  .where({ id: mappingId })
  .update({
    last_used_at: new Date(),
    use_count: db.raw('use_count + 1'),
  });
```

**Promote successful fuzzy matches:**
```typescript
// If user repeatedly accepts a fuzzy match, create permanent rule
if (fuzzyMatch.use_count > 3 && fuzzyMatch.confidence > 0.85) {
  await db.supplier_product_mappings.update(fuzzyMatch.id, {
    verified: true,
    mapping_type: 'manual',
    confidence: 1.0,
  });
}
```

---

## Performance Optimization

### 1. Index Strategy
```sql
-- Fast SKU lookup
CREATE INDEX idx_materials_sku ON materials(sku);

-- Fuzzy name search (trigram)
CREATE INDEX idx_materials_name_trgm ON materials USING gin(name gin_trgm_ops);

-- Mapping lookups
CREATE INDEX idx_mappings_supplier_sku ON supplier_product_mappings(supplier_sku);
CREATE INDEX idx_mappings_connector_sku ON supplier_product_mappings(connector_id, supplier_sku);
```

### 2. Batch Matching
```typescript
// Match 100 products at once instead of 1 by 1
async function matchBatch(products: SupplierProduct[], orgId: string) {
  // Extract all supplier SKUs
  const skus = products.map(p => p.supplierSku).filter(Boolean);

  // Single query to fetch all matches
  const exactMatches = await db.materials
    .where({ org_id: orgId })
    .whereIn('sku', skus)
    .select('sku', 'name', 'unit_cost');

  const matchMap = new Map(exactMatches.map(m => [m.sku, m]));

  // Map results
  return products.map(p => {
    const match = p.supplierSku ? matchMap.get(p.supplierSku) : null;
    return match
      ? { ...p, internalSku: match.sku, confidence: 1.0 }
      : { ...p, internalSku: null, confidence: 0.0 };
  });
}
```

### 3. Caching
```typescript
// Cache keyword rules (they rarely change)
let keywordRulesCache: MatchRule[] | null = null;
let keywordRulesCacheTime: number = 0;

async function getKeywordRules(orgId: string): Promise<MatchRule[]> {
  const now = Date.now();
  if (keywordRulesCache && now - keywordRulesCacheTime < 300000) {
    // Cache valid for 5 minutes
    return keywordRulesCache;
  }

  keywordRulesCache = await db.match_rules
    .where({ org_id: orgId, status: 'active' })
    .orderBy('priority', 'desc');

  keywordRulesCacheTime = now;
  return keywordRulesCache;
}
```

---

## Error Handling

### Duplicate Matches
```typescript
if (exactMatches.length > 1) {
  return {
    supplierProduct,
    internalSku: null,
    confidence: 0.0,
    matchReason: `Error: Multiple materials have SKU ${supplierSku}`,
    mappingType: "none",
  };
}
```

### Missing Materials
```typescript
if (mapping.internal_sku && !materialExists(mapping.internal_sku)) {
  // Mapping points to deleted material - disable it
  await db.supplier_product_mappings.update(mapping.id, {
    status: 'inactive',
    error_message: 'Target material was deleted',
  });

  return {
    supplierProduct,
    internalSku: null,
    confidence: 0.0,
    matchReason: "Mapped material no longer exists",
    mappingType: "none",
  };
}
```

---

## Testing

```typescript
describe("SKU Matching", () => {
  it("should match exact SKU", async () => {
    const result = await matchSupplierProduct(
      { supplierSku: "VINYL_POST_5X5", description: "...", unitCost: 15.99 },
      orgId,
      connectorId
    );

    expect(result.internalSku).toBe("VINYL_POST_5X5");
    expect(result.confidence).toBe(1.0);
    expect(result.mappingType).toBe("exact_sku");
  });

  it("should match fuzzy name", async () => {
    const result = await matchSupplierProduct(
      { description: "Vinyl Privacy Panel 6 ft White", unitCost: 45.99 },
      orgId,
      connectorId
    );

    expect(result.internalSku).toBe("VINYL_PANEL_6FT");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.mappingType).toBe("fuzzy");
  });

  it("should flag ambiguous matches", async () => {
    // Two products with very similar names
    const result = await matchSupplierProduct(
      { description: "Vinyl Post", unitCost: 15.99 },
      orgId,
      connectorId
    );

    expect(result.internalSku).toBeNull();
    expect(result.metadata?.ambiguous).toBe(true);
    expect(result.metadata?.candidates).toHaveLength(2);
  });
});
```

---

## Conclusion

The SKU Mapping Strategy provides:

✅ **Multi-strategy matching** — 6 matching methods in priority order  
✅ **User-teachable** — Learn from corrections  
✅ **Fuzzy matching** — Handle name variations  
✅ **Ambiguity prevention** — Flag uncertain matches  
✅ **Unit normalization** — Handle pack sizes  
✅ **Performance optimized** — Batch queries, caching  
✅ **Error handling** — Graceful degradation  

**Status:** ✅ Phase 4 Complete — Ready for Phase 5 (Review + Apply Flow)

---

**SKU Mapping Strategy Completed:** April 9, 2026  
**Strategist:** Supplier Price Sync Architecture Agent
