-- Add org_settings.target_margin_pct and default_labor_rate.
--
-- These columns were defined in an earlier migration
-- (supabase/migrations/20260303000000_fix_change_orders_schema.sql) that was
-- never applied to production — the file lives in the repo but does not
-- appear in supabase.migrations list on prod. The change_orders portion of
-- that migration was later re-applied via the phase6b migration, but the
-- org_settings portion was forgotten.
--
-- Consequence up until now: every new user's onboarding form input for
-- target margin and labor rate silently no-oped (server action upsert to
-- non-existent columns), and the dashboard OnboardingChecklist's
-- "Set up company profile" step could never flip to done because it reads
-- a column that also doesn't exist.
--
-- This migration resurrects the org_settings portion in isolation so the
-- fix is obvious in git blame. The estimates.last_sent_at columns from
-- that older file are a separate unresolved gap, left for a follow-up
-- migration focused on email-send tracking.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS target_margin_pct numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS default_labor_rate numeric NOT NULL DEFAULT 65;

COMMENT ON COLUMN public.org_settings.target_margin_pct IS
  'Target gross margin as a decimal (0.35 = 35%). Drives the "jobs below target" alert on the owner dashboard and the default margin warnings in the estimator. Written during onboarding, editable in Settings.';

COMMENT ON COLUMN public.org_settings.default_labor_rate IS
  'Default labor $/hr applied to new estimates. Written during onboarding, editable in Settings.';
