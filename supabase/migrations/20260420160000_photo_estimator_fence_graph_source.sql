-- Migration: AI Photo Estimator — source photo on claimed estimates
-- Created: 2026-04-20
-- Purpose: Preserve the uploaded photo alongside the claimed fence_graph
--          so the user can see it in their dashboard after signup.
--
-- Before this migration, consumeClaimToken() copied extraction + estimate
-- JSON into fence_graphs but dropped image_storage_path on the floor.
-- User signed up, landed in the dashboard, found a rows with no trace of
-- the photo that generated it — confusing and a minor trust gap.
--
-- Adds one column (nullable — pre-existing rows stay as-is). The path
-- references photo-estimate-uploads/<YYYY-MM-DD>/<uuid>.<ext>. A signed
-- URL is generated server-side at render time.

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS source_photo_storage_path TEXT;

COMMENT ON COLUMN public.fence_graphs.source_photo_storage_path IS
  'Path inside the photo-estimate-uploads bucket, copied from public_photo_estimates.image_storage_path when a user claims an AI photo estimate on signup. Nullable — estimates created through the Advanced Estimator (not photo flow) have no source photo.';
