-- Phase 7: Legal Snapshot + Digital Acceptance columns on estimates
-- Adds fields for legal term snapshots, digital acceptance, and contract storage

-- 1. Update status check to include 'accepted'
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text, 'quoted'::text, 'sent'::text,
    'approved'::text, 'rejected'::text, 'expired'::text,
    'accepted'::text, 'converted'::text
  ]));

-- 2. Legal snapshot columns
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS legal_terms_snapshot text,
  ADD COLUMN IF NOT EXISTS payment_terms_snapshot text,
  ADD COLUMN IF NOT EXISTS legal_version integer,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at timestamptz;

-- 3. Digital acceptance columns
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_by_email text,
  ADD COLUMN IF NOT EXISTS accepted_ip text,
  ADD COLUMN IF NOT EXISTS accepted_signature_url text,
  ADD COLUMN IF NOT EXISTS acceptance_hash text,
  ADD COLUMN IF NOT EXISTS contract_pdf_url text,
  ADD COLUMN IF NOT EXISTS accept_token text;

-- Index for token lookup (used by public acceptance route)
CREATE INDEX IF NOT EXISTS idx_estimates_accept_token
  ON estimates (accept_token) WHERE accept_token IS NOT NULL;
