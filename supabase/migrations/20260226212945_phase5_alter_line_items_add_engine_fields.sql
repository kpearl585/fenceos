-- Phase 5A: Add engine fields to estimate_line_items
-- Already applied to the live DB; committed here for repo tracking.

ALTER TABLE public.estimate_line_items
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extended_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extended_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta jsonb;

ALTER TABLE public.estimate_line_items DROP CONSTRAINT IF EXISTS eli_type_check;
ALTER TABLE public.estimate_line_items ADD CONSTRAINT eli_type_check
  CHECK (type IN ('material', 'labor'));
