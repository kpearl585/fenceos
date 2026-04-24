-- ══════════════════════════════════════════════════════════════════
-- Phase 1 Estimator: Beta Observability & Feedback
-- ══════════════════════════════════════════════════════════════════
-- Purpose: Lightweight tracking for beta user behavior and feedback
-- Created: April 13, 2026
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Usage Events Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.phase1_estimator_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- auth_id from auth.users
  event_type text NOT NULL, -- 'started', 'completed', 'failed'
  design_id uuid REFERENCES public.fence_designs(id) ON DELETE SET NULL,

  -- Input parameters (for analysis)
  input_params jsonb,

  -- Results/errors
  result_summary jsonb,
  error_message text,

  -- Performance tracking
  duration_ms integer,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  user_agent text,

  CONSTRAINT valid_event_type CHECK (event_type IN ('started', 'completed', 'failed'))
);

CREATE INDEX idx_phase1_events_org_created ON public.phase1_estimator_events(org_id, created_at DESC);
CREATE INDEX idx_phase1_events_user_created ON public.phase1_estimator_events(user_id, created_at DESC);
CREATE INDEX idx_phase1_events_type ON public.phase1_estimator_events(event_type);
CREATE INDEX idx_phase1_events_design ON public.phase1_estimator_events(design_id) WHERE design_id IS NOT NULL;

COMMENT ON TABLE public.phase1_estimator_events IS
  'Lightweight usage tracking for Phase 1 estimator beta';

-- RLS Policies
ALTER TABLE public.phase1_estimator_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase1_events_org_policy" ON public.phase1_estimator_events
  FOR ALL
  USING (org_id = (SELECT get_my_org_id()));

-- ── 2. User Feedback Table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.phase1_estimator_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- auth_id from auth.users
  design_id uuid REFERENCES public.fence_designs(id) ON DELETE SET NULL,

  -- Feedback content
  feedback_type text NOT NULL, -- 'issue', 'suggestion', 'question'
  message text NOT NULL,

  -- Context
  page_url text,
  screenshot_url text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,

  CONSTRAINT valid_feedback_type CHECK (feedback_type IN ('issue', 'suggestion', 'question'))
);

CREATE INDEX idx_phase1_feedback_org_created ON public.phase1_estimator_feedback(org_id, created_at DESC);
CREATE INDEX idx_phase1_feedback_unresolved ON public.phase1_estimator_feedback(org_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_phase1_feedback_design ON public.phase1_estimator_feedback(design_id) WHERE design_id IS NOT NULL;

COMMENT ON TABLE public.phase1_estimator_feedback IS
  'User feedback submissions for Phase 1 estimator beta';

-- RLS Policies
ALTER TABLE public.phase1_estimator_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase1_feedback_org_policy" ON public.phase1_estimator_feedback
  FOR ALL
  USING (org_id = (SELECT get_my_org_id()));

-- ── 3. Analytics Views ───────────────────────────────────────────

-- Usage Summary View
CREATE OR REPLACE VIEW public.phase1_usage_summary AS
SELECT
  org_id,
  event_type,
  COUNT(*) as event_count,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM public.phase1_estimator_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY org_id, event_type;

COMMENT ON VIEW public.phase1_usage_summary IS
  'Last 30 days usage summary for Phase 1 estimator';

-- Error Summary View
CREATE OR REPLACE VIEW public.phase1_error_summary AS
SELECT
  org_id,
  user_id,
  error_message,
  COUNT(*) as occurrence_count,
  MAX(created_at) as last_occurred,
  MIN(created_at) as first_occurred,
  array_agg(DISTINCT design_id) FILTER (WHERE design_id IS NOT NULL) as affected_designs
FROM public.phase1_estimator_events
WHERE event_type = 'failed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY org_id, user_id, error_message;

COMMENT ON VIEW public.phase1_error_summary IS
  'Last 7 days error patterns for Phase 1 estimator';

-- ── 4. Helper Functions ──────────────────────────────────────────

-- Track event helper
CREATE OR REPLACE FUNCTION public.track_phase1_event(
  p_event_type text,
  p_design_id uuid DEFAULT NULL,
  p_input_params jsonb DEFAULT NULL,
  p_result_summary jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user's org_id
  SELECT org_id INTO v_org_id FROM public.users WHERE auth_id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User org not found';
  END IF;

  -- Insert event
  INSERT INTO public.phase1_estimator_events (
    org_id,
    user_id,
    event_type,
    design_id,
    input_params,
    result_summary,
    error_message,
    duration_ms,
    user_agent
  ) VALUES (
    v_org_id,
    auth.uid(),
    p_event_type,
    p_design_id,
    p_input_params,
    p_result_summary,
    p_error_message,
    p_duration_ms,
    p_user_agent
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.track_phase1_event IS
  'Helper function to track Phase 1 estimator usage events';

-- Submit feedback helper
CREATE OR REPLACE FUNCTION public.submit_phase1_feedback(
  p_feedback_type text,
  p_message text,
  p_design_id uuid DEFAULT NULL,
  p_page_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_feedback_id uuid;
  v_org_id uuid;
BEGIN
  -- Get current user's org_id
  SELECT org_id INTO v_org_id FROM public.users WHERE auth_id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User org not found';
  END IF;

  -- Insert feedback
  INSERT INTO public.phase1_estimator_feedback (
    org_id,
    user_id,
    feedback_type,
    message,
    design_id,
    page_url
  ) VALUES (
    v_org_id,
    auth.uid(),
    p_feedback_type,
    p_message,
    p_design_id,
    p_page_url
  )
  RETURNING id INTO v_feedback_id;

  RETURN v_feedback_id;
END;
$$;

COMMENT ON FUNCTION public.submit_phase1_feedback IS
  'Helper function to submit Phase 1 estimator feedback';

-- ══════════════════════════════════════════════════════════════════
-- End Phase 1 Beta Observability
-- ══════════════════════════════════════════════════════════════════
