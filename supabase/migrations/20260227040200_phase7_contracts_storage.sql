-- Phase 7: Contracts storage bucket
-- Stores estimate PDFs, signed contracts, and signatures

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contracts bucket
-- Authenticated users in the same org can read their org's contracts
CREATE POLICY "contracts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
  );

-- Owner and sales can insert (PDF generation)
CREATE POLICY "contracts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_my_org_id()::text
    AND get_my_role() IN ('owner', 'sales')
  );

-- Public read for signed contracts via accept token (handled by service role in API)
-- The acceptance route uses service role key to upload signatures and signed PDFs

-- Also allow anon inserts for signature uploads via acceptance route
-- These are validated server-side by token before upload
CREATE POLICY "contracts_anon_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND auth.role() = 'anon'
  );

-- Allow anon select for serving PDFs to customers via accept link
CREATE POLICY "contracts_anon_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND auth.role() = 'anon'
  );
