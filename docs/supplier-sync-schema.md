# Supplier Price Sync Schema Design

**Date:** April 9, 2026  
**Sprint:** Supplier Price Sync Architecture  
**Phase:** 2 - Data Model Design

---

## Design Principles

1. **Preserve CSV fallback** — All features must work with CSV upload
2. **API-ready architecture** — Support Lowe's API (and future connectors)
3. **Audit trail mandatory** — Track all price changes for compliance
4. **User teachable** — Allow custom mapping rules
5. **Multi-source support** — Same SKU can have prices from multiple suppliers
6. **Confidence tracking** — Store match quality for review
7. **Non-destructive** — Keep history, enable rollback

---

## Schema Overview

### New Tables

1. **`supplier_connectors`** — Supplier configuration (Lowe's, HD, custom)
2. **`supplier_sync_runs`** — Sync session tracking
3. **`supplier_product_mappings`** — User-defined SKU mappings
4. **`supplier_price_history`** — Audit trail of all price changes
5. **`supplier_sync_errors`** — Failed row logging

### Modified Tables

6. **`materials`** — Add sync metadata fields

---

## Detailed Schema

### 1. `supplier_connectors`

**Purpose:** Store configuration for each supplier integration

```sql
CREATE TABLE public.supplier_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Supplier identity
  name text NOT NULL,                    -- "Lowe's Pro", "HD Pro", "ABC Supply"
  slug text NOT NULL,                    -- "lowes_pro", "hd_pro", "abc_supply"
  supplier_type text NOT NULL,           -- "api" | "csv" | "manual"
  
  -- API configuration (null for CSV-only suppliers)
  api_base_url text,                     -- "https://api.lowes.com/v1/"
  api_auth_type text,                    -- "oauth2" | "api_key" | "basic"
  api_credentials jsonb,                 -- { "api_key": "...", "secret": "..." }
  api_rate_limit_per_hour int,          -- 1000
  
  -- CSV configuration
  csv_column_mapping jsonb,              -- { "description": 0, "price": 1, "sku": 2 }
  csv_format_hints jsonb,                -- { "delimiter": ",", "quote": "\"", "header": true }
  
  -- Sync settings
  auto_sync_enabled boolean DEFAULT false,
  auto_sync_frequency_hours int,        -- 24 = daily, 168 = weekly
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'active', -- "active" | "disabled" | "error"
  error_message text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT supplier_connectors_org_slug_unique UNIQUE (org_id, slug)
);

CREATE INDEX idx_supplier_connectors_org ON supplier_connectors(org_id);
CREATE INDEX idx_supplier_connectors_next_sync ON supplier_connectors(next_sync_at) WHERE auto_sync_enabled = true AND status = 'active';

COMMENT ON TABLE supplier_connectors IS 'Supplier integration configuration (API or CSV-based)';
```

**Example Rows:**
```sql
-- Lowe's Pro API connector
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type, api_base_url, api_auth_type)
VALUES (..., 'Lowe''s Pro', 'lowes_pro', 'api', 'https://api.lowes.com/v1', 'oauth2');

-- Home Depot CSV connector
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES (..., 'Home Depot Pro', 'hd_pro', 'csv');

-- Generic CSV
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES (..., 'Custom Supplier', 'custom_csv', 'csv');
```

---

### 2. `supplier_sync_runs`

**Purpose:** Track each sync session (manual CSV upload or automated API sync)

```sql
CREATE TABLE public.supplier_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.supplier_connectors(id) ON DELETE CASCADE,
  
  -- Run metadata
  sync_type text NOT NULL,               -- "manual_csv" | "auto_api" | "manual_api"
  status text NOT NULL DEFAULT 'pending',-- "pending" | "processing" | "completed" | "failed" | "partial"
  
  -- Timing
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds int,
  
  -- Input
  source_file_name text,                 -- "lowes_export_2026-04-09.csv"
  source_row_count int,                  -- Total rows in CSV/API response
  
  -- Results
  matched_count int DEFAULT 0,           -- Rows successfully matched to SKUs
  unmatched_count int DEFAULT 0,         -- Rows with no SKU match
  applied_count int DEFAULT 0,           -- Rows user approved and applied
  error_count int DEFAULT 0,             -- Rows that failed to process
  
  -- Confidence distribution
  high_confidence_count int DEFAULT 0,   -- confidence >= 0.9
  medium_confidence_count int DEFAULT 0, -- confidence >= 0.6 && < 0.9
  low_confidence_count int DEFAULT 0,    -- confidence < 0.6
  
  -- User actions
  initiated_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  -- Error tracking
  error_message text,
  error_details jsonb,
  
  CONSTRAINT supplier_sync_runs_check_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'))
);

CREATE INDEX idx_supplier_sync_runs_org ON supplier_sync_runs(org_id);
CREATE INDEX idx_supplier_sync_runs_connector ON supplier_sync_runs(connector_id);
CREATE INDEX idx_supplier_sync_runs_started_at ON supplier_sync_runs(started_at DESC);

COMMENT ON TABLE supplier_sync_runs IS 'Audit log of all price sync operations';
```

---

### 3. `supplier_product_mappings`

**Purpose:** User-defined SKU mappings (teach the system new products)

```sql
CREATE TABLE public.supplier_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.supplier_connectors(id) ON DELETE CASCADE,
  
  -- Supplier product
  supplier_sku text,                     -- Supplier's product ID
  supplier_description text NOT NULL,    -- Supplier's product name
  supplier_unit text,                    -- Supplier's unit (ea, box, case)
  supplier_pack_size int DEFAULT 1,     -- Items per pack
  
  -- Internal SKU
  internal_sku text NOT NULL,            -- References materials.sku
  
  -- Mapping metadata
  mapping_type text NOT NULL,            -- "exact_match" | "fuzzy_match" | "manual" | "keyword"
  confidence float NOT NULL,             -- 0.0 - 1.0
  match_reason text,                     -- "Exact SKU match" | "Manual user mapping" | etc.
  
  -- Unit normalization
  unit_conversion_factor float DEFAULT 1.0, -- Multiply supplier price by this to get per-unit cost
  
  -- Status
  status text NOT NULL DEFAULT 'active', -- "active" | "inactive" | "pending_review"
  verified boolean DEFAULT false,        -- User confirmed this mapping is correct
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_used_at timestamptz,              -- Last sync that used this mapping
  use_count int DEFAULT 0,               -- How many times this mapping has been used
  
  CONSTRAINT supplier_product_mappings_org_connector_sku UNIQUE (org_id, connector_id, supplier_sku),
  CONSTRAINT supplier_product_mappings_check_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT supplier_product_mappings_check_status CHECK (status IN ('active', 'inactive', 'pending_review'))
);

CREATE INDEX idx_supplier_product_mappings_org ON supplier_product_mappings(org_id);
CREATE INDEX idx_supplier_product_mappings_connector ON supplier_product_mappings(connector_id);
CREATE INDEX idx_supplier_product_mappings_internal_sku ON supplier_product_mappings(internal_sku);
CREATE INDEX idx_supplier_product_mappings_supplier_sku ON supplier_product_mappings(supplier_sku);

COMMENT ON TABLE supplier_product_mappings IS 'User-defined mappings from supplier products to internal SKUs';
```

**Example Rows:**
```sql
-- Exact match (supplier SKU matches internal SKU)
INSERT INTO supplier_product_mappings 
  (org_id, connector_id, supplier_sku, supplier_description, internal_sku, mapping_type, confidence, match_reason)
VALUES 
  (..., ..., 'VINYL_POST_5X5', 'Vinyl Post 5x5 White 10ft', 'VINYL_POST_5X5', 'exact_match', 1.0, 'Exact SKU match');

-- Fuzzy match (keyword-based)
INSERT INTO supplier_product_mappings 
  (org_id, connector_id, supplier_sku, supplier_description, internal_sku, mapping_type, confidence, match_reason)
VALUES 
  (..., ..., '123456', 'Vinyl Privacy Panel 6ft White', 'VINYL_PANEL_6FT', 'fuzzy_match', 0.85, '4/5 keywords matched');

-- Manual mapping (user taught the system)
INSERT INTO supplier_product_mappings 
  (org_id, connector_id, supplier_sku, supplier_description, internal_sku, mapping_type, confidence, match_reason, verified)
VALUES 
  (..., ..., 'HD-7890', 'PT 4x4x10 Treated Post', 'WOOD_POST_4X4_10', 'manual', 1.0, 'User mapped on 2026-04-09', true);

-- Pack size conversion (supplier sells by box, we track by unit)
INSERT INTO supplier_product_mappings 
  (org_id, connector_id, supplier_sku, supplier_description, internal_sku, mapping_type, confidence, supplier_pack_size, unit_conversion_factor)
VALUES 
  (..., ..., 'SCREW-BOX-100', 'Deck Screws Box of 100', 'SCREWS_2_5', 'manual', 1.0, 100, 0.01);
  -- If supplier price is $10 for box of 100, unit price = $10 * 0.01 = $0.10 per screw
```

---

### 4. `supplier_price_history`

**Purpose:** Audit trail of all price changes from sync operations

```sql
CREATE TABLE public.supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Material reference
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  material_sku text NOT NULL,            -- Snapshot of SKU at time of change
  material_name text NOT NULL,           -- Snapshot of name at time of change
  
  -- Price change
  previous_unit_cost numeric,            -- Old price (null if first sync)
  new_unit_cost numeric NOT NULL,        -- New price
  price_change_amount numeric,           -- new - previous
  price_change_percent numeric,          -- (new - previous) / previous * 100
  
  -- Source
  sync_run_id uuid REFERENCES public.supplier_sync_runs(id) ON DELETE SET NULL,
  connector_id uuid REFERENCES public.supplier_connectors(id) ON DELETE SET NULL,
  supplier_name text,                    -- Snapshot of supplier name
  supplier_sku text,                     -- Supplier's product ID
  
  -- Mapping info
  mapping_id uuid REFERENCES public.supplier_product_mappings(id) ON DELETE SET NULL,
  match_confidence float,                -- Confidence score at time of sync
  
  -- User action
  applied_by uuid REFERENCES auth.users(id),
  applied_at timestamptz DEFAULT now(),
  
  -- Rollback support
  rolled_back boolean DEFAULT false,
  rolled_back_at timestamptz,
  rolled_back_by uuid REFERENCES auth.users(id),
  rollback_reason text
);

CREATE INDEX idx_supplier_price_history_org ON supplier_price_history(org_id);
CREATE INDEX idx_supplier_price_history_material ON supplier_price_history(material_id);
CREATE INDEX idx_supplier_price_history_sync_run ON supplier_price_history(sync_run_id);
CREATE INDEX idx_supplier_price_history_applied_at ON supplier_price_history(applied_at DESC);

COMMENT ON TABLE supplier_price_history IS 'Audit trail of all supplier price updates';
```

---

### 5. `supplier_sync_errors`

**Purpose:** Log failed rows from sync operations for debugging

```sql
CREATE TABLE public.supplier_sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sync_run_id uuid NOT NULL REFERENCES public.supplier_sync_runs(id) ON DELETE CASCADE,
  
  -- Failed row data
  row_number int,                        -- Line number in CSV or API response
  supplier_sku text,
  supplier_description text,
  supplier_unit_cost numeric,
  
  -- Error details
  error_type text NOT NULL,              -- "no_match" | "parse_error" | "validation_error" | "db_error"
  error_message text NOT NULL,
  error_details jsonb,
  
  -- Resolution
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_note text,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT supplier_sync_errors_check_error_type CHECK (
    error_type IN ('no_match', 'parse_error', 'validation_error', 'db_error', 'duplicate', 'invalid_price')
  )
);

CREATE INDEX idx_supplier_sync_errors_sync_run ON supplier_sync_errors(sync_run_id);
CREATE INDEX idx_supplier_sync_errors_resolved ON supplier_sync_errors(resolved) WHERE resolved = false;

COMMENT ON TABLE supplier_sync_errors IS 'Failed rows from sync operations for debugging';
```

---

### 6. Modified `materials` Table

**Add sync metadata fields:**

```sql
ALTER TABLE public.materials
  -- Existing fields (already in DB)
  -- id, org_id, name, sku, unit, unit_cost, unit_price, category, supplier, supplier_sku, price_updated_at, notes
  
  -- NEW: Sync metadata
  ADD COLUMN IF NOT EXISTS sync_source text,              -- "api" | "csv" | "manual"
  ADD COLUMN IF NOT EXISTS last_sync_connector_id uuid REFERENCES public.supplier_connectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sync_run_id uuid REFERENCES public.supplier_sync_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sync_confidence float,    -- Match confidence from last sync (0-1)
  ADD COLUMN IF NOT EXISTS last_sync_mapping_id uuid REFERENCES public.supplier_product_mappings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_sync_count int DEFAULT 0, -- How many times this material has been synced
  ADD COLUMN IF NOT EXISTS price_change_alert boolean DEFAULT false; -- Flag large price changes for review

CREATE INDEX idx_materials_last_sync_connector ON materials(last_sync_connector_id);
CREATE INDEX idx_materials_price_updated_at ON materials(price_updated_at DESC);

COMMENT ON COLUMN materials.sync_source IS 'How this material was last updated: api, csv, or manual';
COMMENT ON COLUMN materials.last_sync_confidence IS 'Confidence score (0-1) from last supplier match';
COMMENT ON COLUMN materials.price_change_alert IS 'True if last price change was >30% and needs review';
```

---

## Relationships Diagram

```
┌─────────────────────┐
│  organizations      │
└──────┬──────────────┘
       │
       ├──────────────────────────────┐
       │                              │
       v                              v
┌─────────────────────┐        ┌─────────────────────┐
│ supplier_connectors │        │    materials        │
│ - name              │        │  - sku              │
│ - slug              │        │  - unit_cost        │
│ - supplier_type     │        │  - sync_source      │
│ - api_credentials   │        │  - last_sync_*      │
└──────┬──────────────┘        └──────┬──────────────┘
       │                              │
       │                              │
       v                              v
┌─────────────────────┐        ┌─────────────────────┐
│ supplier_sync_runs  │        │ supplier_price_     │
│ - status            │────────│   history           │
│ - matched_count     │        │ - previous_cost     │
│ - applied_count     │        │ - new_cost          │
└──────┬──────────────┘        │ - price_change_%    │
       │                       └─────────────────────┘
       │
       v
┌─────────────────────┐
│ supplier_product_   │
│   mappings          │
│ - supplier_sku      │
│ - internal_sku      │
│ - confidence        │
│ - verified          │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│ supplier_sync_      │
│   errors            │
│ - error_type        │
│ - error_message     │
│ - resolved          │
└─────────────────────┘
```

---

## Migration Strategy

### Phase 1: Add New Tables (Non-breaking)
```sql
-- Create all new tables
-- No impact on existing functionality
```

### Phase 2: Alter Materials Table (Non-breaking)
```sql
-- Add new columns with defaults
-- Existing data still works
```

### Phase 3: Backfill Existing Data
```sql
-- Set sync_source = 'manual' for all existing materials
UPDATE materials SET sync_source = 'manual' WHERE sync_source IS NULL;
```

### Phase 4: Update Application Code
```sql
-- Modify price sync actions to use new tables
-- Keep backward compatibility
```

---

## Data Retention Policy

### Price History
- **Retention:** Indefinite (compliance requirement)
- **Archival:** Move records >2 years old to archive table
- **Purpose:** Audit trail, regulatory compliance

### Sync Runs
- **Retention:** 90 days for completed runs
- **Archival:** Move to archive after 90 days
- **Exception:** Keep failed runs for 1 year for debugging

### Sync Errors
- **Retention:** Until resolved + 30 days
- **Cleanup:** Auto-delete resolved errors after 30 days

### Product Mappings
- **Retention:** Indefinite (while active)
- **Cleanup:** Move to inactive after 180 days of no use
- **Deletion:** User can manually delete

---

## Security & Permissions

### RLS Policies

```sql
-- supplier_connectors: Org-scoped
ALTER TABLE supplier_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_connectors_org_policy ON supplier_connectors
  FOR ALL USING (org_id = current_setting('app.current_org_id')::uuid);

-- supplier_sync_runs: Org-scoped
ALTER TABLE supplier_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_sync_runs_org_policy ON supplier_sync_runs
  FOR ALL USING (org_id = current_setting('app.current_org_id')::uuid);

-- supplier_product_mappings: Org-scoped
ALTER TABLE supplier_product_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_product_mappings_org_policy ON supplier_product_mappings
  FOR ALL USING (org_id = current_setting('app.current_org_id')::uuid);

-- supplier_price_history: Read-only for all org members, insert-only for admin
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_price_history_org_read ON supplier_price_history
  FOR SELECT USING (org_id = current_setting('app.current_org_id')::uuid);

-- supplier_sync_errors: Org-scoped
ALTER TABLE supplier_sync_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_sync_errors_org_policy ON supplier_sync_errors
  FOR ALL USING (org_id = current_setting('app.current_org_id')::uuid);
```

### API Credentials Security
- **Storage:** `api_credentials` column uses `jsonb` with encryption at rest
- **Access:** Only service role can read/write API credentials
- **Display:** UI shows "●●●●●●" for tokens (never plain text)
- **Rotation:** Support credential rotation without breaking syncs

---

## Query Patterns

### 1. Get all active connectors for an org
```sql
SELECT * FROM supplier_connectors
WHERE org_id = $1 AND status = 'active'
ORDER BY name;
```

### 2. Get price history for a material
```sql
SELECT
  h.applied_at,
  h.previous_unit_cost,
  h.new_unit_cost,
  h.price_change_percent,
  h.supplier_name,
  sr.sync_type,
  u.email as applied_by_email
FROM supplier_price_history h
LEFT JOIN supplier_sync_runs sr ON h.sync_run_id = sr.id
LEFT JOIN auth.users u ON h.applied_by = u.id
WHERE h.material_id = $1
ORDER BY h.applied_at DESC;
```

### 3. Get unmatched products from last sync
```sql
SELECT
  e.supplier_sku,
  e.supplier_description,
  e.supplier_unit_cost,
  e.error_message
FROM supplier_sync_errors e
WHERE e.sync_run_id = $1
  AND e.error_type = 'no_match'
  AND e.resolved = false
ORDER BY e.row_number;
```

### 4. Get stale materials that need price updates
```sql
SELECT
  m.sku,
  m.name,
  m.supplier,
  m.price_updated_at,
  EXTRACT(DAYS FROM (now() - m.price_updated_at)) as days_since_update
FROM materials m
WHERE m.org_id = $1
  AND m.price_updated_at < (now() - interval '30 days')
ORDER BY m.price_updated_at ASC;
```

### 5. Get mapping suggestions for a supplier product
```sql
-- Find exact SKU match
SELECT m.sku, m.name, 1.0 as confidence, 'exact_match' as reason
FROM materials m
WHERE m.org_id = $1 AND m.sku = $2

UNION ALL

-- Find fuzzy name match (using similarity or trigram)
SELECT m.sku, m.name, similarity(m.name, $3) as confidence, 'fuzzy_name' as reason
FROM materials m
WHERE m.org_id = $1 AND similarity(m.name, $3) > 0.6

UNION ALL

-- Find existing mapping
SELECT pm.internal_sku as sku, m.name, pm.confidence, 'existing_mapping' as reason
FROM supplier_product_mappings pm
JOIN materials m ON m.sku = pm.internal_sku
WHERE pm.org_id = $1
  AND pm.supplier_sku = $2
  AND pm.status = 'active'

ORDER BY confidence DESC
LIMIT 5;
```

---

## Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_materials_org_updated ON materials(org_id, price_updated_at DESC);
CREATE INDEX idx_sync_runs_org_status ON supplier_sync_runs(org_id, status, started_at DESC);
CREATE INDEX idx_price_history_material_date ON supplier_price_history(material_id, applied_at DESC);

-- Full-text search on supplier descriptions
CREATE INDEX idx_mappings_description_trgm ON supplier_product_mappings USING gin(supplier_description gin_trgm_ops);
```

---

## Conclusion

This schema design provides:

✅ **Complete audit trail** — Track every price change  
✅ **Multi-supplier support** — API and CSV connectors  
✅ **User-teachable mapping** — Custom SKU rules  
✅ **Confidence tracking** — Know which matches are reliable  
✅ **Unit normalization** — Handle pack sizes and conversions  
✅ **Error logging** — Debug failed imports  
✅ **Rollback support** — Undo bad syncs  
✅ **Performance optimized** — Indexed for common queries  
✅ **Security enforced** — RLS policies on all tables  

**Ready for Phase 3:** Connector Abstraction

---

**Schema Design Completed:** April 9, 2026  
**Designer:** Supplier Price Sync Architecture Agent  
**Status:** ✅ READY FOR IMPLEMENTATION
