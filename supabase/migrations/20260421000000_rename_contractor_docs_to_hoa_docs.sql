-- Rename contractor_docs → hoa_docs
-- The "contractor-docs" namespace belongs to the sister SaaS ContractorDocuments.com.
-- This table stores HOA-packet supporting documents (insurance cert, W-9, license)
-- and should be namespaced to its actual scope: HOA.
-- Pre-launch: 0 rows, 0 bucket objects — safe structural rename.
-- NOTE: Old `contractor-docs` bucket is left empty + orphaned (Supabase blocks
-- SQL-level bucket deletion); drop via Studio when convenient.

-- ── 1. Rename table ───────────────────────────────────────────────────
ALTER TABLE org_contractor_docs RENAME TO org_hoa_docs;

-- ── 2. Rename indexes ─────────────────────────────────────────────────
ALTER INDEX idx_org_contractor_docs_org_type
  RENAME TO idx_org_hoa_docs_org_type;

-- ── 3. Rename RLS policies on the table ───────────────────────────────
ALTER POLICY "org_contractor_docs_select" ON org_hoa_docs
  RENAME TO "org_hoa_docs_select";
ALTER POLICY "org_contractor_docs_insert" ON org_hoa_docs
  RENAME TO "org_hoa_docs_insert";
ALTER POLICY "org_contractor_docs_update" ON org_hoa_docs
  RENAME TO "org_hoa_docs_update";
ALTER POLICY "org_contractor_docs_delete" ON org_hoa_docs
  RENAME TO "org_hoa_docs_delete";

-- ── 4. Update table + column comments ─────────────────────────────────
COMMENT ON TABLE org_hoa_docs IS
  'Per-org HOA-packet supporting documents (insurance cert, W-9, license).';
COMMENT ON COLUMN org_hoa_docs.storage_path IS
  'Path in hoa-docs storage bucket, format: {org_id}/{doc_type}.pdf';
COMMENT ON COLUMN org_hoa_docs.expires_at IS
  'Insurance cert expiration — UI warns when within 30 days.';

-- ── 5. New storage bucket + RLS policies ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('hoa-docs', 'hoa-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hoa_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hoa-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
  );
CREATE POLICY "hoa_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hoa-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );
CREATE POLICY "hoa_docs_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hoa-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );
CREATE POLICY "hoa_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'hoa-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );

-- ── 6. Drop old storage RLS policies (empty bucket, safe) ─────────────
DROP POLICY IF EXISTS "contractor_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "contractor_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "contractor_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "contractor_docs_delete" ON storage.objects;
