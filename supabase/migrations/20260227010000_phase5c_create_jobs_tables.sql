-- Phase 5C: Alter existing jobs table to add financial snapshot fields
-- and align status values. job_line_items already matches spec.

-- Add missing financial + tracking columns
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS total_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_profit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);

-- Rename assigned_to → assigned_foreman_id for clarity
ALTER TABLE public.jobs RENAME COLUMN assigned_to TO assigned_foreman_id;

-- Update status CHECK: replace 'in_progress' → 'active', 'completed' → 'complete'
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('scheduled', 'active', 'complete', 'cancelled'));

-- Update any existing rows with old status values
UPDATE public.jobs SET status = 'active' WHERE status = 'in_progress';
UPDATE public.jobs SET status = 'complete' WHERE status = 'completed';

-- Make estimate_id UNIQUE (one job per estimate)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_estimate_id_unique
  ON public.jobs(estimate_id);

-- Ensure org_id index exists
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON public.jobs(org_id);

-- Ensure RLS enabled on both tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;

-- Ensure job_line_items job_id index exists
CREATE INDEX IF NOT EXISTS idx_job_line_items_job_id ON public.job_line_items(job_id);
