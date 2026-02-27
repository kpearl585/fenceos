-- Phase 6A: Supabase Storage bucket + policies for job photos
-- NOTE: Bucket created via Supabase API; this file documents the config.

-- Bucket: job-photos
-- public: false
-- file_size_limit: 10485760 (10 MB)
-- allowed_mime_types: image/jpeg, image/png, image/webp, image/heic

-- Storage policies (created via Supabase dashboard/API):
-- 1. upload: authenticated users can upload to job-photos/*
-- 2. view: authenticated users can read from job-photos/*
-- 3. delete: authenticated users can delete from job-photos/*
