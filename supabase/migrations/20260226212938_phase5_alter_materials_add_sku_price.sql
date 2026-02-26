-- Phase 5A: Add sku and unit_price columns to materials
-- Already applied to the live DB; committed here for repo tracking.

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS materials_org_sku_unique
  ON public.materials (org_id, sku)
  WHERE sku IS NOT NULL;
