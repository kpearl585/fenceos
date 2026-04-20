-- HOA Packet v1 — contractor document storage
-- Stores per-org contractor documents (insurance certs, W-9s, licenses) that
-- get bundled into HOA submittal packets for each job.
--
-- Storage layout: contractor-docs/{org_id}/{doc_type}.pdf (upserted)
-- One row per (org_id, doc_type) so the UI can replace a cert without leaving
-- orphan rows. Storage cleanup happens via upsert:true in the client upload.

-- ── 1. Storage bucket ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-docs', 'contractor-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Same-org authenticated users can read their org's docs.
-- Folder[1] convention matches the existing `contracts` bucket.
CREATE POLICY "contractor_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contractor-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
  );

-- Only owners can upload / replace contractor documents.
CREATE POLICY "contractor_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contractor-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );

CREATE POLICY "contractor_docs_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'contractor-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );

CREATE POLICY "contractor_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contractor-docs'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() = 'owner'
  );

-- ── 2. org_contractor_docs table ──────────────────────────────────────
-- Metadata for uploaded contractor documents. Storage path lives in
-- `storage_path` — we don't store signed URLs because they expire; we
-- generate them on demand in the server when bundling packets.
CREATE TABLE IF NOT EXISTS org_contractor_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('insurance_cert', 'w9', 'license')),
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,  -- Insurance certs expire; UI can warn when < 30 days out
  -- One row per (org_id, doc_type) — replacing an insurance cert overwrites
  -- the existing row rather than creating a second.
  UNIQUE (org_id, doc_type)
);

ALTER TABLE org_contractor_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_contractor_docs_select" ON org_contractor_docs
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "org_contractor_docs_insert" ON org_contractor_docs
  FOR INSERT WITH CHECK (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

CREATE POLICY "org_contractor_docs_update" ON org_contractor_docs
  FOR UPDATE USING (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

CREATE POLICY "org_contractor_docs_delete" ON org_contractor_docs
  FOR DELETE USING (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

CREATE INDEX IF NOT EXISTS idx_org_contractor_docs_org_type
  ON org_contractor_docs(org_id, doc_type);

COMMENT ON TABLE org_contractor_docs IS
  'Per-org contractor documents (insurance cert, W-9, license) bundled into HOA packets.';
COMMENT ON COLUMN org_contractor_docs.storage_path IS
  'Path in contractor-docs storage bucket, format: {org_id}/{doc_type}.pdf';
COMMENT ON COLUMN org_contractor_docs.expires_at IS
  'Insurance cert expiration — UI warns when within 30 days.';
