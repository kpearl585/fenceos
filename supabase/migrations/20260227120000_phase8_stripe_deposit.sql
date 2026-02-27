-- Phase 8: Stripe Deposit Enforcement
-- Adds deposit tracking + Stripe session columns to estimates
-- Adds 'deposit_paid' to status lifecycle

-- 1. Update status check to include 'deposit_paid'
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text, 'quoted'::text, 'sent'::text,
    'approved'::text, 'rejected'::text, 'expired'::text,
    'accepted'::text, 'deposit_paid'::text, 'converted'::text
  ]));

-- 2. Deposit tracking columns
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS deposit_required_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_status text;
