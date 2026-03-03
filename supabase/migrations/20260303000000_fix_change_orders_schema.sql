-- Fix: change_orders table schema mismatch
-- The initial table was created with a simple schema (id, org_id, job_id, description, amount, status, created_by, created_at)
-- The application code requires the richer schema defined in phase6b migration.
-- This migration adds the missing columns to the live table.

-- Add missing columns to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_profit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_pct numeric NOT NULL DEFAULT 0;

-- Add status CHECK constraint if it doesn't exist (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'change_orders_status_check'
      AND conrelid = 'public.change_orders'::regclass
  ) THEN
    ALTER TABLE public.change_orders
      ADD CONSTRAINT change_orders_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Fix org_settings: add target_margin_pct and default_labor_rate columns
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS target_margin_pct numeric NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS default_labor_rate numeric NOT NULL DEFAULT 0;

-- Add last_sent_at and last_sent_to to estimates (used by share email tracking)
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_to text;
