-- Migration: AR Quote feature — database foundation
-- Created: 2026-04-19
-- Purpose: Scaffold the persistence and storage layer for the AR Quote
--          customer-facing feature.
--
-- The AR Quote feature lets a customer open a shared fence_graph quote on
-- their phone and drop a life-size 3D fence model into their yard using
-- the OS-native AR viewer (iOS Quick Look / Android Scene Viewer). This
-- migration adds:
--
--   1) ar_model_assets   — catalog of reusable GLB/USDZ panel models
--                          keyed by fence_type_id + asset_type. Read by
--                          both authenticated contractor flows and anon
--                          customer-token flows, so SELECT is open to
--                          both auth.role()s. Catalog data only — no
--                          per-org rows.
--
--   2) ar_sessions       — telemetry row per AR launch. Org-scoped via
--                          RLS for authenticated (contractor) flows.
--                          The anon customer flow uses the service role
--                          inside /api/ar/* routes to write rows, so no
--                          anon policy is needed here.
--
--   3) ar_screenshots    — scaffold for Phase 2 (capture + proposal
--                          attach). Org-scoped RLS.
--
--   4) fence_graphs      — two new columns: ar_enabled flag and an
--                          ar_fence_type_hint string for cases where the
--                          derive helper can't infer from product_line_id.
--
--   5) Storage buckets   — ar-assets (public, serves GLB/USDZ) and
--                          ar-screenshots (private, org-folder-scoped
--                          using the same `(storage.foldername(name))[1]
--                          = get_my_org_id()::text` pattern as job-photos).
--
--   6) derive_ar_fence_type_id() — stable SQL helper that maps a
--                          product_line_id + height to the asset
--                          catalog's fence_type_id (empty start; only
--                          wood_privacy_6ft ships today).
--
-- Seeds one catalog row (wood_privacy_6ft panel, 8ft segment, 6ft high)
-- so a real quote can render the day this ships. Actual GLB/USDZ files
-- are uploaded to the ar-assets bucket out-of-band.
--
-- All tables/indexes/policies are idempotent (IF NOT EXISTS / DROP POLICY
-- IF EXISTS / ON CONFLICT DO NOTHING) so this migration can be re-run
-- safely in dev/staging.

-- ─────────────────────────────────────────────────────────────────────
-- 1) ar_model_assets — public catalog of 3D panel/gate/corner-post models
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ar_model_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_type_id      TEXT NOT NULL,
  asset_type         TEXT NOT NULL CHECK (asset_type IN ('panel', 'gate', 'corner_post')),
  segment_length_ft  DECIMAL(4,1) NOT NULL DEFAULT 8.0,
  height_ft          DECIMAL(4,1),
  glb_path           TEXT NOT NULL,
  usdz_path          TEXT NOT NULL,
  thumbnail_path     TEXT,
  poly_count         INTEGER,
  file_size_kb_glb   INTEGER,
  file_size_kb_usdz  INTEGER,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ar_model_assets_fence_type_idx
  ON public.ar_model_assets (fence_type_id, asset_type)
  WHERE is_active;

ALTER TABLE public.ar_model_assets ENABLE ROW LEVEL SECURITY;

-- Catalog is readable by both contractor (authenticated) and customer
-- (anon token) flows. No per-org scoping — same rows serve everyone.
DROP POLICY IF EXISTS "ar_model_assets_select_all" ON public.ar_model_assets;
CREATE POLICY "ar_model_assets_select_all"
  ON public.ar_model_assets FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'anon'
  );

-- Seed the one model we ship with on day one. Additional rows land
-- via follow-up seed migrations as new fence types get modeled.
INSERT INTO public.ar_model_assets (
  fence_type_id,
  asset_type,
  segment_length_ft,
  height_ft,
  glb_path,
  usdz_path,
  thumbnail_path
) VALUES (
  'wood_privacy_6ft',
  'panel',
  8,
  6,
  'panels/wood_privacy_6ft_8panel.glb',
  'panels/wood_privacy_6ft_8panel.usdz',
  'panels/wood_privacy_6ft_8panel.jpg'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 2) ar_sessions — per-launch telemetry, org-scoped
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ar_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_graph_id     UUID NOT NULL REFERENCES public.fence_graphs(id) ON DELETE CASCADE,
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  launched_by        TEXT NOT NULL CHECK (launched_by IN ('contractor', 'customer')),
  public_token       UUID,
  device_type        TEXT CHECK (device_type IN ('ios', 'android', 'desktop', 'unknown')),
  ar_mode            TEXT CHECK (ar_mode IN ('quick_look', 'scene_viewer', 'webxr', 'fallback_3d')),
  user_agent         TEXT,
  status             TEXT NOT NULL DEFAULT 'initiated'
                      CHECK (status IN ('initiated', 'launched', 'placed', 'screenshot_taken', 'abandoned', 'completed')),
  initiated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ar_launched_at     TIMESTAMPTZ,
  first_placed_at    TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  duration_seconds   INTEGER,
  panel_count        INTEGER,
  total_linear_ft    DECIMAL(8,2)
);

CREATE INDEX IF NOT EXISTS ar_sessions_fence_graph_id_idx
  ON public.ar_sessions (fence_graph_id);

CREATE INDEX IF NOT EXISTS ar_sessions_org_id_idx
  ON public.ar_sessions (org_id);

CREATE INDEX IF NOT EXISTS ar_sessions_public_token_idx
  ON public.ar_sessions (public_token)
  WHERE public_token IS NOT NULL;

ALTER TABLE public.ar_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated-only policies. The anon customer path writes via service
-- role inside /api/ar/* route handlers, bypassing RLS intentionally.
DROP POLICY IF EXISTS "ar_sessions_select_own_org" ON public.ar_sessions;
CREATE POLICY "ar_sessions_select_own_org"
  ON public.ar_sessions FOR SELECT
  TO authenticated
  USING (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "ar_sessions_insert_own_org" ON public.ar_sessions;
CREATE POLICY "ar_sessions_insert_own_org"
  ON public.ar_sessions FOR INSERT
  TO authenticated
  WITH CHECK (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "ar_sessions_update_own_org" ON public.ar_sessions;
CREATE POLICY "ar_sessions_update_own_org"
  ON public.ar_sessions FOR UPDATE
  TO authenticated
  USING (org_id = public.get_my_org_id())
  WITH CHECK (org_id = public.get_my_org_id());

-- ─────────────────────────────────────────────────────────────────────
-- 3) ar_screenshots — scaffold for Phase 2 capture-and-attach
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ar_screenshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES public.ar_sessions(id) ON DELETE CASCADE,
  fence_graph_id        UUID NOT NULL REFERENCES public.fence_graphs(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path          TEXT NOT NULL,
  thumbnail_path        TEXT,
  taken_by              TEXT CHECK (taken_by IN ('contractor', 'customer')),
  width_px              INTEGER,
  height_px             INTEGER,
  file_size_bytes       INTEGER,
  included_in_proposal  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ar_screenshots_fence_graph_id_idx
  ON public.ar_screenshots (fence_graph_id);

CREATE INDEX IF NOT EXISTS ar_screenshots_session_id_idx
  ON public.ar_screenshots (session_id);

ALTER TABLE public.ar_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_screenshots_select_own_org" ON public.ar_screenshots;
CREATE POLICY "ar_screenshots_select_own_org"
  ON public.ar_screenshots FOR SELECT
  TO authenticated
  USING (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "ar_screenshots_insert_own_org" ON public.ar_screenshots;
CREATE POLICY "ar_screenshots_insert_own_org"
  ON public.ar_screenshots FOR INSERT
  TO authenticated
  WITH CHECK (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "ar_screenshots_update_own_org" ON public.ar_screenshots;
CREATE POLICY "ar_screenshots_update_own_org"
  ON public.ar_screenshots FOR UPDATE
  TO authenticated
  USING (org_id = public.get_my_org_id())
  WITH CHECK (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "ar_screenshots_delete_own_org" ON public.ar_screenshots;
CREATE POLICY "ar_screenshots_delete_own_org"
  ON public.ar_screenshots FOR DELETE
  TO authenticated
  USING (org_id = public.get_my_org_id());

-- ─────────────────────────────────────────────────────────────────────
-- 4) fence_graphs — AR enablement columns
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS ar_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ar_fence_type_hint  TEXT;

COMMENT ON COLUMN public.fence_graphs.ar_enabled IS
  'True when the AR Quote surface should be offered for this graph. Gated by contractor opt-in and by whether we have a model for the graph''s fence type.';
COMMENT ON COLUMN public.fence_graphs.ar_fence_type_hint IS
  'Optional override for derive_ar_fence_type_id() when the product_line_id parser cannot infer an asset catalog key. Set manually by contractor or admin.';

-- ─────────────────────────────────────────────────────────────────────
-- 5) Storage buckets — ar-assets (public) and ar-screenshots (private)
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES
  ('ar-assets',      'ar-assets',      true),
  ('ar-screenshots', 'ar-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 6) Storage RLS — ar-screenshots (ar-assets is public, no RLS needed)
-- ─────────────────────────────────────────────────────────────────────
-- Path convention matches job-photos: `{org_id}/...`, so
-- (storage.foldername(name))[1] extracts the org_id segment. ar-assets
-- is a public read bucket so no policies are defined for it here.

DROP POLICY IF EXISTS "Org members can view AR screenshots"                    ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload AR screenshots to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete their org's AR screenshots"      ON storage.objects;

CREATE POLICY "Org members can view AR screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ar-screenshots'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );

CREATE POLICY "Org members can upload AR screenshots to their org folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ar-screenshots'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );

CREATE POLICY "Org members can delete their org's AR screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ar-screenshots'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
  );

-- ─────────────────────────────────────────────────────────────────────
-- 7) derive_ar_fence_type_id() — productLineId → catalog key helper
-- ─────────────────────────────────────────────────────────────────────
-- STABLE: same inputs yield the same output within a statement. Returns
-- NULL when no mapping exists, letting callers fall back to
-- fence_graphs.ar_fence_type_hint or simply not enable AR for that graph.

CREATE OR REPLACE FUNCTION public.derive_ar_fence_type_id(
  product_line_id TEXT,
  fence_height    INTEGER
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF product_line_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF product_line_id ILIKE '%wood%' AND fence_height = 6 THEN
    RETURN 'wood_privacy_6ft';
  END IF;

  RETURN NULL;
END;
$$;
