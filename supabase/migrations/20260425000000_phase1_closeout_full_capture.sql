-- Migration: persist full estimator closeout payload + analysis
-- Purpose:
--   1) keep the scalar Phase 1 columns for reporting
--   2) preserve the richer closeout payload that powers future tuning
--   3) preserve structured analysis output without forcing another schema
--      migration every time the learning engine grows

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS closeout_actuals_json jsonb,
  ADD COLUMN IF NOT EXISTS closeout_analysis_json jsonb;

COMMENT ON COLUMN public.fence_graphs.closeout_actuals_json IS
  'Full closeout actuals payload captured from the enhanced estimator closeout form, including category costs, quantity actuals, field conditions, and lessons learned.';

COMMENT ON COLUMN public.fence_graphs.closeout_analysis_json IS
  'Structured output from analyzeEstimateCloseout(): category variances, calibration signals, and learning summary generated when the estimate was closed.';
