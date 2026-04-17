-- Scope the job-photos bucket policies to the caller's org.
--
-- The advisor flagged `public_bucket_allows_listing` on the SELECT policy,
-- but inspecting the full policy set revealed a bigger issue: all three
-- policies (SELECT / INSERT / DELETE) gate only on bucket_id = 'job-photos'.
-- Any authenticated user could read, upload to, or delete any other org's
-- job photos. Only the INSERT path was protected indirectly by the app
-- layer's uploadJobPhoto() helper (which builds `${orgId}/${jobId}/...`
-- paths), but a malicious client with a valid session could bypass the
-- helper and hit storage directly.
--
-- Path convention (see src/lib/jobs/uploadJobPhoto.ts):
--   `{org_id}/{job_id}/{timestamp}_{filename}`
-- First folder is always the org_id. We use Supabase's built-in
-- storage.foldername(name) to extract it and compare to get_my_org_id()
-- (the helper defined in 20260226203310_rls_helper_function).
--
-- Public-bucket implications unchanged: files are still accessible by
-- direct URL to anyone who has the URL. If that becomes an issue, convert
-- the bucket to private + use signed URLs. Today the URL is handed to the
-- contractor + their customer; photo content isn't expected to be secret.

DROP POLICY IF EXISTS "Authenticated users can view job photos"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete job photos"               ON storage.objects;

CREATE POLICY "Org members can view job photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );

CREATE POLICY "Org members can upload job photos to their org folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );

CREATE POLICY "Org members can delete their org's job photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );
