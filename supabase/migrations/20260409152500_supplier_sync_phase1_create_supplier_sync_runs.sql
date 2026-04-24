-- Supplier Price Sync Phase 1: Create supplier_sync_runs table
-- Tracks each sync session (manual CSV upload or automated API sync)

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

  CONSTRAINT supplier_sync_runs_check_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  CONSTRAINT supplier_sync_runs_check_sync_type CHECK (sync_type IN ('manual_csv', 'auto_api', 'manual_api'))
);

-- Indexes
CREATE INDEX idx_supplier_sync_runs_org ON supplier_sync_runs(org_id);
CREATE INDEX idx_supplier_sync_runs_connector ON supplier_sync_runs(connector_id);
CREATE INDEX idx_supplier_sync_runs_started_at ON supplier_sync_runs(started_at DESC);
CREATE INDEX idx_supplier_sync_runs_org_status ON supplier_sync_runs(org_id, status, started_at DESC);

-- Comments
COMMENT ON TABLE supplier_sync_runs IS 'Audit log of all price sync operations';
COMMENT ON COLUMN supplier_sync_runs.sync_type IS 'How sync was initiated: manual CSV, auto API, or manual API';
COMMENT ON COLUMN supplier_sync_runs.status IS 'Current state of sync operation';
COMMENT ON COLUMN supplier_sync_runs.matched_count IS 'Number of supplier products matched to internal SKUs';
COMMENT ON COLUMN supplier_sync_runs.applied_count IS 'Number of price updates user approved';
