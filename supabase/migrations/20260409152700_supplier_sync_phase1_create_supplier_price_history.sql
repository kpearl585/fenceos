-- Supplier Price Sync Phase 1: Create supplier_price_history table
-- Audit trail of all price changes from sync operations

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

-- Indexes
CREATE INDEX idx_supplier_price_history_org ON supplier_price_history(org_id);
CREATE INDEX idx_supplier_price_history_material ON supplier_price_history(material_id);
CREATE INDEX idx_supplier_price_history_sync_run ON supplier_price_history(sync_run_id);
CREATE INDEX idx_supplier_price_history_applied_at ON supplier_price_history(applied_at DESC);
CREATE INDEX idx_supplier_price_history_material_date ON supplier_price_history(material_id, applied_at DESC);

-- Comments
COMMENT ON TABLE supplier_price_history IS 'Audit trail of all supplier price updates';
COMMENT ON COLUMN supplier_price_history.material_sku IS 'SKU snapshot at time of change (for audit if SKU is later modified)';
COMMENT ON COLUMN supplier_price_history.price_change_percent IS 'Percentage change: (new - old) / old * 100';
COMMENT ON COLUMN supplier_price_history.rolled_back IS 'True if this price change was later reverted';
