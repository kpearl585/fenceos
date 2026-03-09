-- Add win-back email tracking column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_winback_sent timestamptz DEFAULT NULL;
