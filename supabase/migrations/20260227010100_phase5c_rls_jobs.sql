-- Phase 5C: RLS policies for jobs + job_line_items
-- Owner = full org access
-- Sales = jobs where created_by = self OR assigned_foreman_id = self
-- Foreman = read-only where assigned_foreman_id = self

-- Drop any pre-existing policies
DROP POLICY IF EXISTS jobs_select ON public.jobs;
DROP POLICY IF EXISTS jobs_insert ON public.jobs;
DROP POLICY IF EXISTS jobs_update ON public.jobs;
DROP POLICY IF EXISTS jobs_delete ON public.jobs;
DROP POLICY IF EXISTS jli_select ON public.job_line_items;
DROP POLICY IF EXISTS jli_insert ON public.job_line_items;
DROP POLICY IF EXISTS jli_update ON public.job_line_items;
DROP POLICY IF EXISTS jli_delete ON public.job_line_items;

-- ============================================================
-- JOBS
-- ============================================================

CREATE POLICY jobs_select ON public.jobs FOR SELECT USING (
  org_id = get_my_org_id()
  AND (
    get_my_role() = 'owner'
    OR (get_my_role() = 'sales' AND (
      created_by = get_my_user_id()
      OR assigned_foreman_id = get_my_user_id()
    ))
    OR (get_my_role() = 'foreman' AND assigned_foreman_id = get_my_user_id())
  )
);

CREATE POLICY jobs_insert ON public.jobs FOR INSERT WITH CHECK (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);

CREATE POLICY jobs_update ON public.jobs FOR UPDATE USING (
  org_id = get_my_org_id()
  AND (
    get_my_role() = 'owner'
    OR (get_my_role() = 'sales' AND created_by = get_my_user_id())
    OR (get_my_role() = 'foreman' AND assigned_foreman_id = get_my_user_id())
  )
);

CREATE POLICY jobs_delete ON public.jobs FOR DELETE USING (
  org_id = get_my_org_id()
  AND get_my_role() = 'owner'
);

-- ============================================================
-- JOB_LINE_ITEMS (follow parent job visibility)
-- ============================================================

CREATE POLICY jli_select ON public.job_line_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_line_items.job_id
    AND j.org_id = get_my_org_id()
    AND (
      get_my_role() = 'owner'
      OR (get_my_role() = 'sales' AND (
        j.created_by = get_my_user_id()
        OR j.assigned_foreman_id = get_my_user_id()
      ))
      OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
    )
  )
);

CREATE POLICY jli_insert ON public.job_line_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_line_items.job_id
    AND j.org_id = get_my_org_id()
    AND get_my_role() IN ('owner', 'sales')
  )
);

CREATE POLICY jli_update ON public.job_line_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_line_items.job_id
    AND j.org_id = get_my_org_id()
    AND get_my_role() IN ('owner', 'sales')
  )
);

CREATE POLICY jli_delete ON public.job_line_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_line_items.job_id
    AND j.org_id = get_my_org_id()
    AND get_my_role() = 'owner'
  )
);
