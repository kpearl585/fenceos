-- Supplier Price Sync Phase 1: Add sync metadata columns to materials table
-- Track which connector last updated each material and matching confidence

ALTER TABLE public.materials
  -- Sync metadata
  ADD COLUMN IF NOT EXISTS sync_source text,              -- "api" | "csv" | "manual"
  ADD COLUMN IF NOT EXISTS last_sync_connector_id uuid REFERENCES public.supplier_connectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sync_run_id uuid REFERENCES public.supplier_sync_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sync_confidence float,    -- Match confidence from last sync (0-1)
  ADD COLUMN IF NOT EXISTS last_sync_mapping_id uuid REFERENCES public.supplier_product_mappings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_sync_count int DEFAULT 0, -- How many times this material has been synced
  ADD COLUMN IF NOT EXISTS price_change_alert boolean DEFAULT false, -- Flag large price changes for review
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,  -- When price was last updated
  ADD COLUMN IF NOT EXISTS supplier_sku text;             -- Supplier's SKU for this product

-- Indexes
CREATE INDEX IF NOT EXISTS idx_materials_last_sync_connector ON materials(last_sync_connector_id);
CREATE INDEX IF NOT EXISTS idx_materials_price_updated_at ON materials(price_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_sync_source ON materials(org_id, sync_source);
CREATE INDEX IF NOT EXISTS idx_materials_price_change_alert ON materials(org_id, price_change_alert)
  WHERE price_change_alert = true;

-- Constraints (use DO block for IF NOT EXISTS behavior)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_check_sync_source') THEN
    ALTER TABLE materials
      ADD CONSTRAINT materials_check_sync_source CHECK (sync_source IS NULL OR sync_source IN ('api', 'csv', 'manual'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_check_sync_confidence') THEN
    ALTER TABLE materials
      ADD CONSTRAINT materials_check_sync_confidence CHECK (last_sync_confidence IS NULL OR (last_sync_confidence >= 0 AND last_sync_confidence <= 1));
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN materials.sync_source IS 'How this material was last updated: api, csv, or manual';
COMMENT ON COLUMN materials.last_sync_confidence IS 'Confidence score (0-1) from last supplier match';
COMMENT ON COLUMN materials.price_change_alert IS 'True if last price change was >30% and needs review';
COMMENT ON COLUMN materials.price_sync_count IS 'Number of times this material has been updated via sync';
COMMENT ON COLUMN materials.price_updated_at IS 'Timestamp of last price update (manual or sync)';
COMMENT ON COLUMN materials.supplier_sku IS 'Supplier SKU reference for this material';

-- Backfill existing materials with manual sync source
UPDATE materials
SET sync_source = 'manual',
    price_updated_at = COALESCE(updated_at, created_at)
WHERE sync_source IS NULL;
