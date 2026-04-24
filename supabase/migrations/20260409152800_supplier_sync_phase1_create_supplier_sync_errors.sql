-- Supplier Price Sync Phase 1: Create supplier_sync_errors table
-- Log failed rows from sync operations for debugging

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

-- Indexes
CREATE INDEX idx_supplier_sync_errors_sync_run ON supplier_sync_errors(sync_run_id);
CREATE INDEX idx_supplier_sync_errors_resolved ON supplier_sync_errors(resolved) WHERE resolved = false;
CREATE INDEX idx_supplier_sync_errors_org_unresolved ON supplier_sync_errors(org_id, resolved, created_at DESC)
  WHERE resolved = false;

-- Comments
COMMENT ON TABLE supplier_sync_errors IS 'Failed rows from sync operations for debugging';
COMMENT ON COLUMN supplier_sync_errors.error_type IS 'Category of error: no_match, parse_error, validation_error, db_error, duplicate, invalid_price';
COMMENT ON COLUMN supplier_sync_errors.resolved IS 'True if user has addressed this error (e.g., created mapping)';
