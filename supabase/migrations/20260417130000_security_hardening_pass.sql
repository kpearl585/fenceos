-- Security hardening pass from the Supabase advisor audit.
--
-- Covers three classes of finding, all mechanical + low-risk:
--
-- 1) SECURITY DEFINER views (4 errors)
--    Four analytics views were created with the default SECURITY DEFINER
--    property. DEFINER views run with the creator's permissions and bypass
--    row-level security on the underlying tables. In a multi-tenant SaaS
--    with per-org RLS, that means a caller who forgets .eq("org_id", ...)
--    in application code can read every org's data through the view.
--    All call sites currently do include the org_id filter, but that's
--    defence-in-depth relying on code discipline rather than DB enforcement.
--
--    Switching to SECURITY INVOKER makes the views respect the caller's
--    RLS on the underlying tables (fence_graphs, estimator_events,
--    estimates, jobs, change_orders — all confirmed as having org-scoped
--    RLS policies before this migration runs). Admin client usage is
--    unaffected (service_role bypasses RLS regardless).
--
-- 2) Function search_path mutable (6 warns)
--    The listed functions were created without an explicit search_path.
--    A malicious caller with CREATE privilege on any schema in their
--    search_path can shadow tables/functions the trusted function relies
--    on, leading to privilege escalation. Setting search_path to
--    'public, pg_temp' locks resolution and closes the vector.
--
-- 3) Duplicate index (1 warn)
--    change_orders has two identical btree(job_id) indexes. Keeps disk
--    bloat and doubles insert/update cost. Drop the less-idiomatic name.
--
-- Deferred to a follow-up migration (each needs more targeted testing):
--   - auth_rls_initplan (16 policies with auth.uid() not in subselect)
--   - multiple_permissive_policies (28 overlapping policies, mostly on
--     change_orders which has 8 — legacy co_* policies duplicating newer
--     "Org isolation X" policies)

-- ── 1. Views: SECURITY DEFINER → SECURITY INVOKER ─────────────────────
ALTER VIEW public.estimator_error_summary       SET (security_invoker = on);
ALTER VIEW public.estimator_usage_summary       SET (security_invoker = on);
ALTER VIEW public.estimate_accuracy_analytics   SET (security_invoker = on);
ALTER VIEW public.owner_margin_summary_view     SET (security_invoker = on);

-- ── 2. Functions: explicit search_path ────────────────────────────────
ALTER FUNCTION public.get_accuracy_summary(p_org_id uuid, p_days integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_job_workaround(p_title text, p_notes text, p_customer_id uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.track_estimator_event(
  p_event_type text, p_design_id uuid, p_input_params jsonb,
  p_result_summary jsonb, p_error_message text,
  p_duration_ms integer, p_user_agent text
) SET search_path = public, pg_temp;

ALTER FUNCTION public.submit_estimator_feedback(
  p_feedback_type text, p_message text, p_design_id uuid, p_page_url text
) SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_converted_estimate_edit()
  SET search_path = public, pg_temp;

-- ── 3. Drop duplicate index ───────────────────────────────────────────
-- idx_change_orders_job and idx_change_orders_job_id are both
-- CREATE INDEX ... USING btree (job_id). Keep the _id suffix (more
-- consistent with the rest of the schema's naming).
DROP INDEX IF EXISTS public.idx_change_orders_job;
