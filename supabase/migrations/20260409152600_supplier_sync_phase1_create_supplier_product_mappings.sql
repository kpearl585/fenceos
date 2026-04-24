-- Supplier Price Sync Phase 1: Create supplier_product_mappings table
-- User-defined SKU mappings (teach the system new products)

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
  CONSTRAINT supplier_product_mappings_check_status CHECK (status IN ('active', 'inactive', 'pending_review')),
  CONSTRAINT supplier_product_mappings_check_mapping_type CHECK (mapping_type IN ('exact_match', 'fuzzy_match', 'manual', 'keyword'))
);

-- Indexes
CREATE INDEX idx_supplier_product_mappings_org ON supplier_product_mappings(org_id);
CREATE INDEX idx_supplier_product_mappings_connector ON supplier_product_mappings(connector_id);
CREATE INDEX idx_supplier_product_mappings_internal_sku ON supplier_product_mappings(internal_sku);
CREATE INDEX idx_supplier_product_mappings_supplier_sku ON supplier_product_mappings(supplier_sku);
CREATE INDEX idx_supplier_product_mappings_status ON supplier_product_mappings(org_id, status)
  WHERE status = 'active';

-- Full-text search on supplier descriptions (requires pg_trgm extension)
-- Extension will be created in a separate migration if needed
-- CREATE INDEX idx_mappings_description_trgm ON supplier_product_mappings USING gin(supplier_description gin_trgm_ops);

-- Comments
COMMENT ON TABLE supplier_product_mappings IS 'User-defined mappings from supplier products to internal SKUs';
COMMENT ON COLUMN supplier_product_mappings.confidence IS 'Match confidence score from 0.0 (no match) to 1.0 (exact match)';
COMMENT ON COLUMN supplier_product_mappings.unit_conversion_factor IS 'Multiply supplier price by this to normalize units (e.g., 0.01 for box of 100)';
COMMENT ON COLUMN supplier_product_mappings.verified IS 'True if user explicitly confirmed this mapping is correct';
