-- Migration: AI Photo Estimator — database foundation
-- Created: 2026-04-20
-- Purpose: Scaffold the persistence + cost-control layer for the public
--          AI Photo Estimator free-tier flow.
--
-- The public AI Photo Estimator lets anyone at fenceestimatepro.com/try-it
-- upload a yard photo, runs it through OpenAI GPT-4o Vision using the
-- existing fence-graph ai-extract pipeline, and returns a structured
-- estimate. This migration adds:
--
--   1) public_photo_estimates  — anonymous estimates keyed by a
--                                claim_token UUID. Written by the
--                                service role in /api/public/photo-estimate
--                                (anon flow; no auth required). Read by
--                                authenticated users once claimed.
--
--   2) photo_estimate_daily_cost — single-row-per-day counter of OpenAI
--                                 spend (cents) and call count. Used to
--                                 enforce a daily $ cap on the free tier.
--
--   3) increment_photo_estimate_cost() — atomic upsert + cap check. Locks
--                                 the day's row with FOR UPDATE, rejects
--                                 with DAILY_COST_CAP_EXCEEDED (SQLSTATE
--                                 P0001) if the call would push over the
--                                 cap. Callers pre-check before the
--                                 OpenAI call; this RPC is the post-call
--                                 accounting step that also enforces the
--                                 limit in concurrent scenarios.
--
--   4) Storage bucket photo-estimate-uploads — private. Anon uploads go
--                                 through service-role inside the API
--                                 route. Objects are purged by a
--                                 scheduled job (set up separately) after
--                                 7 days.
--
-- The free-tier cap is $5.00/day (500 cents), hardcoded in the RPC. To
-- change it, run ALTER FUNCTION ... or re-issue the CREATE OR REPLACE.
--
-- All tables/indexes/policies are idempotent (IF NOT EXISTS / DROP POLICY
-- IF EXISTS / ON CONFLICT DO NOTHING) so this migration can be re-run
-- safely in dev/staging.

-- ─────────────────────────────────────────────────────────────────────
-- 1) public_photo_estimates — anonymous estimates with claim tokens
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.public_photo_estimates (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_token               UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ip_address                INET,
  user_agent                TEXT,
  image_storage_path        TEXT NOT NULL,
  extraction_json           JSONB NOT NULL,
  estimate_json             JSONB NOT NULL,
  openai_cost_cents         INTEGER NOT NULL DEFAULT 0,
  email                     TEXT,
  email_captured_at         TIMESTAMPTZ,
  claimed_at                TIMESTAMPTZ,
  claimed_by_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_fence_graph_id    UUID REFERENCES public.fence_graphs(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_photo_estimates_claim_token_idx
  ON public.public_photo_estimates (claim_token);

CREATE INDEX IF NOT EXISTS public_photo_estimates_ip_created_idx
  ON public.public_photo_estimates (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS public_photo_estimates_email_idx
  ON public.public_photo_estimates (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_photo_estimates_claimed_by_user_idx
  ON public.public_photo_estimates (claimed_by_user_id)
  WHERE claimed_by_user_id IS NOT NULL;

ALTER TABLE public.public_photo_estimates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read rows they've claimed. The anon write path
-- goes through the service role inside /api/public/photo-estimate, so no
-- anon INSERT policy is required here.
DROP POLICY IF EXISTS "public_photo_estimates_select_own_claim" ON public.public_photo_estimates;
CREATE POLICY "public_photo_estimates_select_own_claim"
  ON public.public_photo_estimates FOR SELECT
  TO authenticated
  USING (claimed_by_user_id = auth.uid());

COMMENT ON TABLE  public.public_photo_estimates IS
  'Anonymous estimate output from the public AI Photo Estimator. Rows are created by the service role in the /api/public/photo-estimate route. Users claim a row by email/signup, which copies the extraction + estimate into a new fence_graphs row.';
COMMENT ON COLUMN public.public_photo_estimates.claim_token IS
  'Opaque token used to retrieve and claim this estimate from the result page or the claim email. Safe to share in a URL.';
COMMENT ON COLUMN public.public_photo_estimates.image_storage_path IS
  'Path inside the photo-estimate-uploads bucket. Private bucket; served via signed URLs only.';
COMMENT ON COLUMN public.public_photo_estimates.openai_cost_cents IS
  'Actual cost (cents, rounded up) of the OpenAI Vision call that produced this row. Recorded for observability and cost reconciliation.';

-- ─────────────────────────────────────────────────────────────────────
-- 2) photo_estimate_daily_cost — daily OpenAI spend counter
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.photo_estimate_daily_cost (
  date              DATE PRIMARY KEY,
  total_cost_cents  INTEGER NOT NULL DEFAULT 0,
  call_count        INTEGER NOT NULL DEFAULT 0,
  last_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.photo_estimate_daily_cost ENABLE ROW LEVEL SECURITY;

-- Service-role only. No policies defined; RLS enabled means authenticated
-- and anon roles are denied by default. The API route and the RPC use
-- createAdminClient() to access this table.

COMMENT ON TABLE public.photo_estimate_daily_cost IS
  'One row per calendar day; maintained by increment_photo_estimate_cost(). Enforces the daily free-tier spend cap on the public AI Photo Estimator.';

-- ─────────────────────────────────────────────────────────────────────
-- 3) increment_photo_estimate_cost() — atomic cost-counter increment
-- ─────────────────────────────────────────────────────────────────────
-- Holds a row-level lock on today's counter row (SELECT ... FOR UPDATE)
-- so concurrent callers serialize. RAISEs DAILY_COST_CAP_EXCEEDED (P0001)
-- if this call would push over the cap; the UPDATE is not applied.
--
-- Hardcoded cap: 500 cents ($5.00/day). Change by editing this function.

CREATE OR REPLACE FUNCTION public.increment_photo_estimate_cost(
  p_cents INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_total INTEGER;
  v_count INTEGER;
  v_cap   INTEGER := 500;
BEGIN
  IF p_cents IS NULL OR p_cents < 0 THEN
    RAISE EXCEPTION 'INVALID_COST_INCREMENT' USING ERRCODE = 'P0001';
  END IF;

  -- Ensure today's row exists (no-op if already there).
  INSERT INTO public.photo_estimate_daily_cost (date)
    VALUES (CURRENT_DATE)
    ON CONFLICT (date) DO NOTHING;

  -- Lock today's row for the rest of the transaction.
  SELECT total_cost_cents, call_count
    INTO v_total, v_count
    FROM public.photo_estimate_daily_cost
    WHERE date = CURRENT_DATE
    FOR UPDATE;

  IF v_total + p_cents > v_cap THEN
    RAISE EXCEPTION 'DAILY_COST_CAP_EXCEEDED' USING
      ERRCODE = 'P0001',
      DETAIL  = format('Daily cap %s cents; current total %s, proposed add %s',
                       v_cap, v_total, p_cents);
  END IF;

  UPDATE public.photo_estimate_daily_cost
    SET total_cost_cents = total_cost_cents + p_cents,
        call_count       = call_count + 1,
        last_updated_at  = NOW()
    WHERE date = CURRENT_DATE
    RETURNING total_cost_cents, call_count INTO v_total, v_count;

  RETURN jsonb_build_object(
    'total_cost_cents', v_total,
    'call_count',       v_count,
    'remaining_cents',  v_cap - v_total
  );
END;
$$;

COMMENT ON FUNCTION public.increment_photo_estimate_cost(INTEGER) IS
  'Atomically increment the daily OpenAI cost counter with a FOR UPDATE lock. Raises DAILY_COST_CAP_EXCEEDED (P0001) if the call would exceed the $5/day cap. Returns JSONB with total_cost_cents, call_count, remaining_cents.';

-- ─────────────────────────────────────────────────────────────────────
-- 4) Storage bucket — photo-estimate-uploads (private)
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES
  ('photo-estimate-uploads', 'photo-estimate-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Service-role only. No anon/authenticated policies are defined; the API
-- route uses createAdminClient() to write uploaded photos. Reads go
-- through server-generated signed URLs when a user claims their estimate.
