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

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS policies for anonymous acceptance flow
-- The public acceptance page uses an anon client to read estimates by token
-- and update them when customer accepts.
-- ═══════════════════════════════════════════════════════════════════════════

-- estimates: anon can SELECT when filtering by a valid accept_token
CREATE POLICY estimates_anon_select ON estimates
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND accept_token IS NOT NULL
  );

-- estimates: anon can UPDATE when filtering by a valid accept_token
-- (only status = 'quoted' can be accepted, enforced in app logic)
CREATE POLICY estimates_anon_update ON estimates
  FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND accept_token IS NOT NULL
  );

-- estimate_line_items: anon can SELECT items for estimates with accept_token
CREATE POLICY eli_anon_select ON estimate_line_items
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_line_items.estimate_id
      AND e.accept_token IS NOT NULL
    )
  );

-- customers: anon can SELECT customers linked to estimates with accept_token
CREATE POLICY customers_anon_select ON customers
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.customer_id = customers.id
      AND e.accept_token IS NOT NULL
    )
  );

-- organizations: anon can SELECT orgs linked to estimates with accept_token
CREATE POLICY organizations_anon_select ON organizations
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.org_id = organizations.id
      AND e.accept_token IS NOT NULL
    )
  );

-- org_branding: anon can SELECT branding for orgs linked to estimates with accept_token
CREATE POLICY org_branding_anon_select ON org_branding
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.org_id = org_branding.org_id
      AND e.accept_token IS NOT NULL
    )
  );
