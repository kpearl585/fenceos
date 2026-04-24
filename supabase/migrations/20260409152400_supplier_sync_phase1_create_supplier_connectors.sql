-- Supplier Price Sync Phase 1: Create supplier_connectors table
-- Stores configuration for each supplier integration (API or CSV-based)

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

  CONSTRAINT supplier_connectors_org_slug_unique UNIQUE (org_id, slug),
  CONSTRAINT supplier_connectors_check_type CHECK (supplier_type IN ('api', 'csv', 'manual')),
  CONSTRAINT supplier_connectors_check_status CHECK (status IN ('active', 'disabled', 'error'))
);

-- Indexes
CREATE INDEX idx_supplier_connectors_org ON supplier_connectors(org_id);
CREATE INDEX idx_supplier_connectors_next_sync ON supplier_connectors(next_sync_at)
  WHERE auto_sync_enabled = true AND status = 'active';

-- Comments
COMMENT ON TABLE supplier_connectors IS 'Supplier integration configuration (API or CSV-based)';
COMMENT ON COLUMN supplier_connectors.slug IS 'Unique identifier within org (lowes_pro, hd_pro, etc)';
COMMENT ON COLUMN supplier_connectors.api_credentials IS 'Encrypted JSON storing API keys/tokens';
COMMENT ON COLUMN supplier_connectors.csv_column_mapping IS 'Column indexes for description, price, sku';
