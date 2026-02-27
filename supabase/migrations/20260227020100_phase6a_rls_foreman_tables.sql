-- Phase 6A: RLS policies for foreman execution tables

-- ============================================================
-- job_checklists
-- ============================================================

-- SELECT: anyone who can see the parent job
CREATE POLICY "job_checklists_select" ON public.job_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklists.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'sales' AND (j.created_by = get_my_user_id() OR j.assigned_foreman_id = get_my_user_id()))
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- INSERT: owner, sales, foreman (for generating checklist on their assigned jobs)
CREATE POLICY "job_checklists_insert" ON public.job_checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklists.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR get_my_role() = 'sales'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- UPDATE: owner or assigned foreman only
CREATE POLICY "job_checklists_update" ON public.job_checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklists.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- ============================================================
-- job_material_verifications
-- ============================================================

-- SELECT: anyone who can see the parent job
CREATE POLICY "job_mat_ver_select" ON public.job_material_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_material_verifications.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'sales' AND (j.created_by = get_my_user_id() OR j.assigned_foreman_id = get_my_user_id()))
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- INSERT: owner, sales, foreman
CREATE POLICY "job_mat_ver_insert" ON public.job_material_verifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_material_verifications.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR get_my_role() = 'sales'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- UPDATE: owner or assigned foreman
CREATE POLICY "job_mat_ver_update" ON public.job_material_verifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_material_verifications.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- ============================================================
-- job_photos
-- ============================================================

-- SELECT: anyone who can see the parent job
CREATE POLICY "job_photos_select" ON public.job_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'sales' AND (j.created_by = get_my_user_id() OR j.assigned_foreman_id = get_my_user_id()))
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- INSERT: owner or assigned foreman
CREATE POLICY "job_photos_insert" ON public.job_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- DELETE: owner only
CREATE POLICY "job_photos_delete" ON public.job_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos.job_id
        AND j.org_id = get_my_org_id()
        AND get_my_role() = 'owner'
    )
  );
