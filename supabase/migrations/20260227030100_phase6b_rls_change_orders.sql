-- Phase 6B: RLS for change_orders and change_order_line_items

-- change_orders: SELECT — anyone who can see the parent job
CREATE POLICY co_select ON public.change_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = change_orders.job_id
        AND j.org_id = get_my_org_id()
    )
  );

-- change_orders: INSERT — owner + foreman on assigned jobs
CREATE POLICY co_insert ON public.change_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = change_orders.job_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
    AND created_by = get_my_user_id()
  );

-- change_orders: UPDATE — owner only (for approve/reject)
CREATE POLICY co_update ON public.change_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = change_orders.job_id
        AND j.org_id = get_my_org_id()
    )
    AND get_my_role() = 'owner'
  );

-- change_orders: DELETE — owner only
CREATE POLICY co_delete ON public.change_orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = change_orders.job_id
        AND j.org_id = get_my_org_id()
    )
    AND get_my_role() = 'owner'
  );

-- change_order_line_items: SELECT — via parent change_order → job visibility
CREATE POLICY coli_select ON public.change_order_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      JOIN public.jobs j ON j.id = co.job_id
      WHERE co.id = change_order_line_items.change_order_id
        AND j.org_id = get_my_org_id()
    )
  );

-- change_order_line_items: INSERT — owner + assigned foreman
CREATE POLICY coli_insert ON public.change_order_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      JOIN public.jobs j ON j.id = co.job_id
      WHERE co.id = change_order_line_items.change_order_id
        AND j.org_id = get_my_org_id()
        AND (
          get_my_role() = 'owner'
          OR (get_my_role() = 'foreman' AND j.assigned_foreman_id = get_my_user_id())
        )
    )
  );

-- change_order_line_items: DELETE — owner only
CREATE POLICY coli_delete ON public.change_order_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      JOIN public.jobs j ON j.id = co.job_id
      WHERE co.id = change_order_line_items.change_order_id
        AND j.org_id = get_my_org_id()
    )
    AND get_my_role() = 'owner'
  );
