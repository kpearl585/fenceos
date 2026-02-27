-- Phase 6A: Foreman execution tables
-- job_checklists, job_material_verifications, job_photos

-- 1. Job Checklists
CREATE TABLE IF NOT EXISTS public.job_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, item_key)
);

CREATE INDEX idx_job_checklists_job ON public.job_checklists(job_id);
ALTER TABLE public.job_checklists ENABLE ROW LEVEL SECURITY;

-- 2. Job Material Verifications
CREATE TABLE IF NOT EXISTS public.job_material_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  required_qty numeric NOT NULL DEFAULT 0,
  verified_qty numeric,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, sku)
);

CREATE INDEX idx_job_mat_ver_job ON public.job_material_verifications(job_id);
ALTER TABLE public.job_material_verifications ENABLE ROW LEVEL SECURITY;

-- 3. Job Photos
CREATE TABLE IF NOT EXISTS public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_photos_job ON public.job_photos(job_id);
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
