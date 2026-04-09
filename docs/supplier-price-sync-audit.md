# Supplier Price Sync Architecture Audit

**Date:** April 9, 2026  
**Sprint:** Supplier Price Sync Architecture  
**Phase:** 1 - Architecture Audit

---

## Executive Summary

The Material Price Sync feature exists and is **partially implemented**. It provides CSV upload functionality with basic SKU matching and price updates, but lacks the production-grade architecture needed for enterprise supplier integrations.

**Current State:** ✅ Working MVP  
**Production Readiness:** ⚠️ Needs Architecture Upgrade  
**Supplier Connectors:** 🔄 Lowe's/HD detection exists, no API integration

---

## Current Implementation Analysis

### 1. Materials Page (`/dashboard/materials`)

**Location:** `src/app/dashboard/materials/page.tsx`

**Features:**
- ✅ Materials catalog view grouped by category
- ✅ Inline editing (EditablePrice, EditableText components)
- ✅ Manual material add form
- ✅ CSV bulk import via MaterialImport component
- ✅ Delete material action
- ✅ Link to Price Sync page

**Data Fields:**
```typescript
interface Material {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  category: string | null;
  supplier: string | null;
  notes: string | null;
}
```

**Actions:**
- `addMaterial(FormData)` — Insert single material
- `deleteMaterial(FormData)` — Delete by ID
- `bulkAddMaterials(rows[])` — Bulk insert from CSV
- `updateMaterialPrice(id, orgId, field, value)` — Update unit_cost or unit_price
- `updateMaterialField(id, orgId, field, value)` — Update name, supplier, or sku

---

### 2. Price Sync Page (`/dashboard/materials/price-sync`)

**Location:** `src/app/dashboard/materials/price-sync/page.tsx`

**Features:**
- ✅ Freshness summary dashboard
  - Total materials
  - Priced materials
  - Stale count (30+ days)
  - Never updated count
  - Last sync date
- ✅ Supplier export instructions (HD Pro, Lowe's Pro, generic)
- ✅ CSV upload interface via PriceSyncClient

**Data Flow:**
```
CSV Upload
  ↓
parsePriceSyncCsv(csvText)
  ↓
parseSupplierCsv(csvText) → { rows: SupplierRow[], format: string }
  ↓
matchSupplierRow(row) for each row → MatchResult
  ↓
Enrich with current prices from DB
  ↓
Return PriceSyncPreview
  ↓
User reviews matches in PriceSyncClient
  ↓
User selects rows to apply
  ↓
applyPriceUpdates(updates[])
  ↓
Update materials table (unit_cost, price_updated_at, supplier_sku, supplier)
```

---

### 3. CSV Parser & Matcher (`src/lib/price-sync/matcher.ts`)

**Purpose:** Parse supplier CSVs and fuzzy-match products to internal SKUs

**Components:**

#### A. Column Detection
```typescript
function detectColumns(headers: string[]): ColumnMapping | null
```
- ✅ Detects HD Pro format (net price, item number)
- ✅ Detects Lowe's Pro format
- ✅ Fallback to generic (col 0 = description, col 1 = price)
- Returns: `{ descriptionCol, priceCol, supplierSkuCol, format }`

#### B. CSV Parsing
```typescript
function parseCsv(text: string): string[][]
```
- ✅ Handles quoted fields
- ✅ Splits on commas
- ⚠️ Basic implementation (no escape sequences, no multi-line quotes)

#### C. Supplier Row Parsing
```typescript
function parseSupplierCsv(text: string): { rows: SupplierRow[], format: string }
```
- ✅ Uses column detection
- ✅ Extracts: `rawDescription`, `rawSku`, `unitCost`, `supplier`
- ✅ Filters out rows with no description or zero cost

#### D. SKU Matching (Keyword-Based)
```typescript
function matchSupplierRow(row: SupplierRow): MatchResult
```
- ✅ Uses hardcoded keyword rules (78 rules total)
- ✅ Normalizes description (lowercase, remove punctuation)
- ✅ Tokenizes description
- ✅ Finds best rule by keyword hits
- ✅ Confidence score: `hits / total_keywords`
- ⚠️ Returns `matchedSku: null` if no keywords match
- ⚠️ **No fuzzy string matching** (only keyword-based)
- ⚠️ **No user-defined mapping rules** (hardcoded only)

**Keyword Rules:**
- Vinyl (panels, posts, rails, gates)
- Wood (panels, pickets, posts, rails, gates)
- Chain link (fabric, posts, rails, hardware)
- Aluminum (panels, posts, rails, gates)
- Hardware (hinges, latches, caps)
- Concrete, gravel, fasteners

**Matching Logic:**
```typescript
// For each rule, count how many keywords appear in description tokens
const hits = rule.keywords.filter(kw => tokens.some(t => t.includes(kw))).length;
// Best rule = most hits (tie-breaker: most specific rule)
const confidence = hits / rule.keywords.length;
```

---

### 4. Price Sync Client (`PriceSyncClient.tsx`)

**UI Flow:**

**Step 1: Upload**
- File input (CSV only)
- Calls `parsePriceSyncCsv(csvText)`
- Shows error if parse fails

**Step 2: Review**
- Shows preview table:
  - Supplier description
  - Matched SKU (if found)
  - Confidence badge (High ≥90%, Medium ≥60%, Low <60%)
  - Current price
  - New price (editable)
  - Checkbox to select/deselect
- Summary bar:
  - Format detected
  - Total rows
  - Matched rows
  - Unmatched rows
- Auto-selects rows with `matchedSku && confidence > 0.5`
- "Select matched" button to re-apply auto-selection
- "Apply N Updates" button

**Step 3: Done**
- Shows success message: "N prices updated"
- Links to "Sync Another File" or "View Materials"

**Features:**
- ✅ Editable unit cost before applying
- ✅ Individual row selection
- ✅ Unmatched rows shown but disabled
- ✅ Confidence badges for transparency
- ⚠️ No mapping management (can't teach system new mappings)
- ⚠️ No sync history (one-time update, no audit trail)

---

### 5. Price Update Actions (`price-sync/actions.ts`)

#### `parsePriceSyncCsv(csvText)`
**Server Action**
- Authenticates user
- Gets org_id
- Calls `parseSupplierCsv(csvText)` from matcher
- Calls `matchSupplierRow(row)` for each row
- Enriches with current prices from DB (`materials` table)
- Returns `PriceSyncPreview`

#### `applyPriceUpdates(updates[])`
**Server Action**
- Authenticates user
- Gets org_id
- For each update:
  - Updates `materials` table:
    - `unit_cost = update.unitCost`
    - `price_updated_at = now`
    - `supplier_sku = update.supplierSku` (optional)
    - `supplier = update.supplier` (optional)
  - Filters by `org_id` and `sku`
- Returns `{ success, updatedCount }`
- ⚠️ **No sync history** (updates are not logged)
- ⚠️ **No rollback** (irreversible)
- ⚠️ **No conflict detection** (overwrites existing price)

#### `getPriceFreshness()`
**Server Action**
- Fetches all materials for org
- Calculates:
  - `totalMaterials`
  - `pricedMaterials` (unit_cost > 0)
  - `staleCount` (price_updated_at < 30 days ago)
  - `neverUpdated` (price_updated_at is null)
  - `lastSyncDate` (most recent price_updated_at)
- Returns summary object

---

## Database Schema Analysis

### Materials Table

**Inferred Schema:**
```sql
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  sku text,
  unit text NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  category text,
  supplier text,
  supplier_sku text,              -- Added by price sync
  price_updated_at timestamptz,   -- Added by price sync
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX materials_org_sku_unique
  ON public.materials (org_id, sku)
  WHERE sku IS NOT NULL;
```

**Key Fields for Supplier Sync:**
- `sku` — Internal SKU (unique per org)
- `unit_cost` — Cost from supplier (updated by sync)
- `unit_price` — Sales price (NOT touched by sync ✅)
- `supplier` — Supplier name (HD Pro, Lowe's Pro, etc.)
- `supplier_sku` — Supplier's product ID
- `price_updated_at` — Last price sync timestamp

**Missing Fields:**
- ❌ `sync_source` — Which connector was used (api/csv/manual)
- ❌ `sync_confidence` — Match confidence from last sync
- ❌ `mapping_status` — (exact/fuzzy/manual/unmatched)
- ❌ Sync history table (audit trail of price changes)

---

## What Works (✅ Implemented)

1. **CSV Upload** — Users can upload supplier CSVs
2. **Format Detection** — Detects HD Pro, Lowe's Pro, or generic
3. **Keyword Matching** — 78 hardcoded rules for common products
4. **Confidence Scoring** — Based on keyword hit rate
5. **Review UI** — Shows matches before applying
6. **Manual Editing** — User can adjust prices before applying
7. **Selective Apply** — Checkbox selection of which rows to update
8. **Freshness Dashboard** — Shows stale/never-updated materials
9. **Audit Timestamp** — `price_updated_at` tracks last sync
10. **Sales Price Protection** — Sync only updates `unit_cost`, not `unit_price`

---

## What's Missing (❌ Needs Implementation)

### 1. Connector Architecture
- ❌ No supplier connector interface/abstraction
- ❌ No API connectors (all CSV-based)
- ❌ Lowe's/HD detection exists but no API integration
- ❌ Cannot add new suppliers without code changes

### 2. SKU Mapping Layer
- ❌ No persistent mapping storage
- ❌ No user-defined mapping rules
- ❌ No fuzzy string matching (only keyword-based)
- ❌ No learning from user corrections
- ❌ Cannot handle new product variations
- ❌ No mapping confidence tracking in DB
- ❌ No ambiguous match prevention (if 2 rules tie, picks first)

### 3. Sync History / Audit Trail
- ❌ No price change history table
- ❌ Cannot see what changed or when
- ❌ Cannot rollback bad syncs
- ❌ No audit log for compliance

### 4. Unit Normalization
- ❌ No pack size handling (e.g., "sold in packs of 10")
- ❌ No unit conversion (e.g., each → box → case)
- ❌ Assumes supplier unit matches internal unit

### 5. Review Queue
- ❌ No persistent review queue
- ❌ All matches must be reviewed in one session
- ❌ Cannot save partial progress
- ❌ No approval workflow

### 6. API Integration
- ❌ No Lowe's API connector
- ❌ No HD Pro API connector
- ❌ No automated price refresh
- ❌ No rate limiting/throttling
- ❌ No retry logic

### 7. Error Handling
- ❌ Sync failures are silent (just returns error message)
- ❌ No partial success reporting
- ❌ No failed row logging

### 8. Data Quality
- ❌ No duplicate detection
- ❌ No outlier detection (e.g., price jumped 500%)
- ❌ No staleness warnings before applying

---

## Hardcoded Dependencies

### 1. Keyword Rules (78 hardcoded rules in `matcher.ts`)
**Impact:** Cannot handle products not in the keyword list  
**Fix Needed:** User-defined mapping interface + fuzzy matching

### 2. CSV Parser (basic implementation)
**Impact:** May fail on edge cases (multi-line quotes, escape sequences)  
**Fix Needed:** Use robust CSV library (e.g., PapaParse)

### 3. Column Detection (HD Pro / Lowe's Pro)
**Impact:** Breaks if suppliers change CSV format  
**Fix Needed:** Flexible column mapping UI

### 4. No Supplier Configuration
**Impact:** Cannot add new suppliers without code changes  
**Fix Needed:** Supplier connector registry + config storage

---

## Data Flow Diagram (Current)

```
┌─────────────┐
│  User       │
│  Uploads    │
│  CSV        │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ parsePriceSyncCsv   │
│ (Server Action)     │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ parseSupplierCsv    │
│ - Detect columns    │
│ - Extract rows      │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ matchSupplierRow    │  ← Uses 78 hardcoded
│ - Keyword matching  │    keyword rules
│ - Confidence calc   │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ Enrich with         │
│ current prices      │
│ from DB             │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ PriceSyncPreview    │
│ returned to client  │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ User Reviews        │
│ - Select rows       │
│ - Edit prices       │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ applyPriceUpdates   │
│ (Server Action)     │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ UPDATE materials    │
│ SET unit_cost,      │
│     price_updated_at│
│ WHERE org_id, sku   │
└─────────────────────┘
```

---

## Security Analysis

### ✅ Strengths
1. **Org-scoped queries** — All DB queries filter by `org_id`
2. **Authentication required** — Server actions check user auth
3. **Sales price protected** — Sync only updates `unit_cost`, not `unit_price`
4. **No SKU injection** — Updates filter by exact SKU match

### ⚠️ Risks
1. **No price change limits** — User can set price to $0.01 or $999,999
2. **No outlier detection** — No warning if price jumps 1000%
3. **No rollback** — Bad sync cannot be undone
4. **No approval workflow** — Single user can overwrite all prices

---

## Performance Analysis

### Current Performance
- **CSV parse**: O(n) rows, basic string operations
- **Matching**: O(n * m) where n = rows, m = 78 keyword rules
- **DB update**: O(n) individual UPDATE statements (not batched)

### Bottlenecks
1. **Individual UPDATEs** — Should batch into single query
2. **No caching** — Keyword rules parsed on every match
3. **No pagination** — Large CSVs (1000+ rows) load all into memory

### Recommendations
1. Batch UPDATE into single query with UNNEST
2. Add pagination to review UI
3. Stream large CSV files

---

## Integration Points

### Existing Integrations
1. **Supabase materials table** — Read/write materials
2. **Materials page** — Inline editing, manual add
3. **CSV import** — MaterialImport component (bulk add)

### Missing Integrations
1. **Lowe's API** — Placeholder only (no actual API)
2. **HD Pro API** — Placeholder only (no actual API)
3. **Price alert system** — No notifications on price changes
4. **BOM engine** — Works via materials table (indirect)

---

## Recommendations for Architecture Upgrade

### Priority 1: Critical for Production
1. **Sync History Table** — Audit trail for compliance
2. **Batch DB Updates** — Performance + atomicity
3. **Fuzzy Matching** — Handle product name variations
4. **Error Logging** — Track failed rows

### Priority 2: Enable Lowe's Connector
1. **Connector Interface** — Abstract supplier API/CSV
2. **Supplier Config Table** — Store auth tokens, endpoints
3. **Rate Limiting** — Prevent API bans
4. **Unit Normalization** — Handle pack sizes

### Priority 3: User Experience
1. **Mapping Management UI** — Teach system new SKUs
2. **Review Queue** — Save partial progress
3. **Price Change Alerts** — Notify on large jumps
4. **Duplicate Detection** — Prevent accidental re-imports

---

## Conclusion

**Current State: Working MVP with Hardcoded Rules**

The Material Price Sync feature is **functional for basic CSV imports** but lacks the architecture needed for:
- API-based supplier connectors
- Flexible SKU mapping
- Audit trails
- User-defined rules
- Production-grade reliability

**Next Steps:**
- Phase 2: Data Model Design (sync history, mapping tables)
- Phase 3: Connector Abstraction (supplier interface)
- Phase 4: SKU Mapping Layer (fuzzy matching + user rules)
- Phase 5: Review Queue (persistent state)
- Phase 6: Lowe's Connector (API integration)
- Phase 7: QA + Safety (tests, validation)

---

**Audit Completed:** April 9, 2026  
**Auditor:** Supplier Price Sync Architecture Agent  
**Status:** ✅ READY FOR PHASE 2 (Data Model Design)
