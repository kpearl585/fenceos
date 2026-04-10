-- ══════════════════════════════════════════════════════════════════
-- Phase 1: Accuracy Tracking - Expand Closeout System
-- ══════════════════════════════════════════════════════════════════
-- Purpose: Track labor hours, total cost variance, and site complexity
--          to build feedback loop for estimate accuracy improvement
--
-- Created: April 9, 2026
-- Author: Claude Code (Phase 1 Accuracy Initiative)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Add Labor Tracking Columns ────────────────────────────────────

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS estimated_labor_hours numeric,
  ADD COLUMN IF NOT EXISTS closeout_actual_labor_hours numeric,
  ADD COLUMN IF NOT EXISTS closeout_crew_size integer,
  ADD COLUMN IF NOT EXISTS closeout_weather_conditions text;

COMMENT ON COLUMN public.fence_graphs.estimated_labor_hours IS
  'Estimated total labor hours from timeline calculation';
COMMENT ON COLUMN public.fence_graphs.closeout_actual_labor_hours IS
  'Actual labor hours logged by crew at job completion';
COMMENT ON COLUMN public.fence_graphs.closeout_crew_size IS
  'Number of crew members on the job (2-person, 3-person, etc.)';
COMMENT ON COLUMN public.fence_graphs.closeout_weather_conditions IS
  'Weather conditions during install: clear, rain, heat, cold, etc.';

-- ── 2. Add Total Cost Tracking Columns ───────────────────────────────

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS closeout_actual_material_cost numeric,
  ADD COLUMN IF NOT EXISTS closeout_actual_labor_cost numeric,
  ADD COLUMN IF NOT EXISTS closeout_actual_total_cost numeric;

COMMENT ON COLUMN public.fence_graphs.closeout_actual_material_cost IS
  'Actual material cost from invoices/receipts';
COMMENT ON COLUMN public.fence_graphs.closeout_actual_labor_cost IS
  'Actual labor cost (actual hours × labor rate)';
COMMENT ON COLUMN public.fence_graphs.closeout_actual_total_cost IS
  'Total actual cost: materials + labor + misc';

-- ── 3. Add Site Complexity Scoring ───────────────────────────────────

ALTER TABLE public.fence_graphs
  ADD COLUMN IF NOT EXISTS site_complexity_json jsonb;

COMMENT ON COLUMN public.fence_graphs.site_complexity_json IS
  'Site complexity assessment: {access: 1-5, obstacles: 1-5, ground: 1-5, demo: bool, permits: 1-5}';

-- Example structure:
-- {
--   "access_difficulty": 3,        // 1=easy truck access, 5=tight backyard
--   "obstacles": 2,                // 1=clear, 5=dense trees/rocks
--   "ground_hardness": 3,          // 1=soft soil, 5=rocky/concrete
--   "demo_required": false,        // true/false/partial
--   "permit_complexity": 2,        // 1=none, 5=multiple permits/HOA
--   "overall_score": 2.4           // weighted average
-- }

-- ── 4. Create Accuracy Analytics View ────────────────────────────────

CREATE OR REPLACE VIEW public.estimate_accuracy_analytics AS
SELECT
  org_id,
  status,

  -- Material Variance
  CASE
    WHEN closeout_actual_material_cost IS NOT NULL AND total_cost > 0
    THEN ((closeout_actual_material_cost - (total_cost - (estimated_labor_hours * labor_rate))) /
          (total_cost - (estimated_labor_hours * labor_rate)) * 100)
    ELSE NULL
  END AS material_variance_pct,

  -- Labor Variance
  CASE
    WHEN closeout_actual_labor_hours IS NOT NULL AND estimated_labor_hours > 0
    THEN ((closeout_actual_labor_hours - estimated_labor_hours) / estimated_labor_hours * 100)
    ELSE NULL
  END AS labor_hours_variance_pct,

  CASE
    WHEN closeout_actual_labor_cost IS NOT NULL AND (estimated_labor_hours * labor_rate) > 0
    THEN ((closeout_actual_labor_cost - (estimated_labor_hours * labor_rate)) /
          (estimated_labor_hours * labor_rate) * 100)
    ELSE NULL
  END AS labor_cost_variance_pct,

  -- Total Cost Variance
  CASE
    WHEN closeout_actual_total_cost IS NOT NULL AND total_cost > 0
    THEN ((closeout_actual_total_cost - total_cost) / total_cost * 100)
    ELSE NULL
  END AS total_cost_variance_pct,

  -- Waste Variance (already tracked)
  CASE
    WHEN closeout_actual_waste_pct IS NOT NULL AND waste_pct > 0
    THEN ((closeout_actual_waste_pct - waste_pct) / waste_pct * 100)
    ELSE NULL
  END AS waste_variance_pct,

  -- Site Complexity
  (site_complexity_json->>'overall_score')::numeric AS site_complexity_score,

  -- Raw Data
  id,
  name,
  created_at,
  closed_at,
  total_lf,
  total_cost,
  estimated_labor_hours,
  closeout_actual_labor_hours,
  closeout_actual_material_cost,
  closeout_actual_labor_cost,
  closeout_actual_total_cost,
  input_json->>'fenceType' AS fence_type

FROM public.fence_graphs
WHERE status = 'closed';

COMMENT ON VIEW public.estimate_accuracy_analytics IS
  'Analytics view for tracking estimation accuracy across completed jobs';

-- ── 5. Create Accuracy Summary Function ──────────────────────────────

CREATE OR REPLACE FUNCTION public.get_accuracy_summary(
  p_org_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_closed_jobs', COUNT(*),
    'avg_material_variance_pct', ROUND(AVG(material_variance_pct)::numeric, 2),
    'avg_labor_hours_variance_pct', ROUND(AVG(labor_hours_variance_pct)::numeric, 2),
    'avg_labor_cost_variance_pct', ROUND(AVG(labor_cost_variance_pct)::numeric, 2),
    'avg_total_cost_variance_pct', ROUND(AVG(total_cost_variance_pct)::numeric, 2),
    'avg_waste_variance_pct', ROUND(AVG(waste_variance_pct)::numeric, 2),
    'accuracy_by_fence_type', (
      SELECT jsonb_object_agg(
        fence_type,
        jsonb_build_object(
          'count', COUNT(*),
          'avg_variance_pct', ROUND(AVG(total_cost_variance_pct)::numeric, 2)
        )
      )
      FROM estimate_accuracy_analytics
      WHERE org_id = p_org_id
        AND closed_at >= NOW() - (p_days || ' days')::interval
        AND fence_type IS NOT NULL
      GROUP BY fence_type
    )
  ) INTO v_result
  FROM estimate_accuracy_analytics
  WHERE org_id = p_org_id
    AND closed_at >= NOW() - (p_days || ' days')::interval;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_accuracy_summary IS
  'Returns accuracy metrics summary for an org over specified time period';

-- ══════════════════════════════════════════════════════════════════
-- End Phase 1: Accuracy Tracking
-- ══════════════════════════════════════════════════════════════════
