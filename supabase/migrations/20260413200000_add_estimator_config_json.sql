-- ═══════════════════════════════════════════════════════════════
-- Migration: Add estimator_config_json to org_settings
-- Purpose: Stores org-level estimator configuration (labor rates,
--          material assumptions, overhead, equipment, etc.)
-- ═══════════════════════════════════════════════════════════════

-- Add JSONB column for estimator config (nullable — null = use defaults)
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS estimator_config_json jsonb DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.org_settings.estimator_config_json IS
  'Org-level estimator config overrides. Deep-merged over DEFAULT_ESTIMATOR_CONFIG at runtime. null = use all defaults.';
