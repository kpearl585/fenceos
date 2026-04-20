-- Migration: AI Photo Estimator — funnel event log
-- Created: 2026-04-20
-- Purpose: In-house funnel tracking for the public AI Photo Estimator.
--          Stores one row per tracked event so we can measure the
--          funnel without standing up a separate analytics service.
--
--   upload → extraction → email capture → signup claim
--
-- Why not PostHog/Amplitude: zero new infra to launch. A single
-- Supabase table + an RPC keeps the whole acquisition loop visible
-- in the same DB that owns the domain data, with SQL queryable via
-- the Supabase dashboard. Swap to PostHog later if we need cross-
-- session cohorting or frontend event capture.
--
-- Events we track today (extend freely):
--   photo_upload_submitted   — server accepted an image + started the flow
--   extraction_returned      — OpenAI + engine produced a result; rendered to user
--   extraction_blocked       — extraction validation failed (low-quality photo, etc.)
--   email_captured           — user bound their email on /try-it result card
--   email_rebind_rejected    — someone with a claim_token tried to overwrite a
--                              different email (possible hijack attempt — alert if seen)
--   signup_claimed           — consumeClaimToken() transferred to fence_graphs
--
-- Idempotent (IF NOT EXISTS / CREATE OR REPLACE) so re-runs are safe.

CREATE TABLE IF NOT EXISTS public.photo_estimator_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event         TEXT NOT NULL,
  claim_token   UUID,
  ip_address    INET,
  properties    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photo_estimator_events_event_created_idx
  ON public.photo_estimator_events (event, created_at DESC);

CREATE INDEX IF NOT EXISTS photo_estimator_events_claim_token_idx
  ON public.photo_estimator_events (claim_token)
  WHERE claim_token IS NOT NULL;

ALTER TABLE public.photo_estimator_events ENABLE ROW LEVEL SECURITY;

-- Service-role only. No policies — authenticated and anon are denied
-- by default. All writes go through the RPC below with SECURITY
-- DEFINER so callers don't need direct table grants.

COMMENT ON TABLE public.photo_estimator_events IS
  'Funnel event log for the public AI Photo Estimator. Rows inserted by track_photo_estimator_event() RPC only.';

CREATE OR REPLACE FUNCTION public.track_photo_estimator_event(
  p_event        TEXT,
  p_claim_token  UUID DEFAULT NULL,
  p_ip_address   INET DEFAULT NULL,
  p_properties   JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  INSERT INTO public.photo_estimator_events (event, claim_token, ip_address, properties)
  VALUES (p_event, p_claim_token, p_ip_address, p_properties);
$$;

COMMENT ON FUNCTION public.track_photo_estimator_event(TEXT, UUID, INET, JSONB) IS
  'Append a funnel event row. Service-role callers invoke via supabase.rpc() from server actions / API routes. Never throw on a tracking failure at the caller — treat tracking as best-effort observability.';
