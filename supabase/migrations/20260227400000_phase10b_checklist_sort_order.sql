-- Phase 10B: Add sort_order column to job_checklists for ordering items
ALTER TABLE public.job_checklists 
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
