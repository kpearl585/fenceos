-- Migration: fence_graphs bid price + markup snapshot
-- Created: 2026-04-20
-- Purpose: The customer-facing /quote/[token] page was showing the
--          contractor's cost (fence_graphs.total_cost) as the
--          "investment" number. total_cost is the engine's computed
--          material + labor + overhead cost with no markup applied,
--          so customers were seeing the wholesale number. Contractors
--          would lose their entire margin on any quote accepted
--          through the share link.
--
-- Adds two columns:
--   bid_price  - the markup-applied customer price, snapshotted at
--                save time so historical quotes reflect the markup
--                the contractor chose at that moment.
--   markup_pct - percentage applied on top of total_cost to produce
--                bid_price. Stored for audit / future editing. Null
--                for legacy rows; the share quote falls back to
--                computing bid_price from org_settings.target_margin_pct
--                when the column is null (see getQuoteByToken).
--
-- No backfill — legacy fence_graphs keep bid_price NULL and the read
-- path applies the fallback. This is deliberate: we don't know the
-- contractor's intended markup for historical quotes, so the org's
-- current target margin is the safest default.

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS bid_price  NUMERIC,
  ADD COLUMN IF NOT EXISTS markup_pct NUMERIC;

COMMENT ON COLUMN public.fence_graphs.bid_price IS
  'Customer-facing price = total_cost * (1 + markup_pct/100), snapshotted at save time. Displayed on the customer share quote (/quote/[token]) as the total investment. Null on legacy rows; callers fall back to applying org_settings.target_margin_pct to total_cost.';

COMMENT ON COLUMN public.fence_graphs.markup_pct IS
  'Markup percentage applied to total_cost to produce bid_price. Passed from the Advanced Estimator''s markup UI at save time.';
