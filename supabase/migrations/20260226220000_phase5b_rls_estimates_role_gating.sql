-- Phase 5B: Role-gated RLS for estimates + estimate_line_items
-- Owner = full org access, Sales = created_by only, Foreman = blocked

-- Helper: current auth user id
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid()
$$;

-- ============================================================
-- ESTIMATES
-- ============================================================

-- Drop broad org-isolation policies (created in Phase 5A)
DROP POLICY IF EXISTS "Org isolation: estimates" ON estimates;
DROP POLICY IF EXISTS "Org insert: estimates"    ON estimates;

-- SELECT: owner sees all in org, sales sees own
CREATE POLICY estimates_select ON estimates FOR SELECT USING (
  org_id = get_my_org_id()
  AND (
    get_my_role() = 'owner'
    OR (get_my_role() = 'sales' AND created_by = get_my_user_id())
  )
);

-- INSERT: owner and sales only
CREATE POLICY estimates_insert ON estimates FOR INSERT WITH CHECK (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);

-- UPDATE: owner all in org, sales own only
CREATE POLICY estimates_update ON estimates FOR UPDATE USING (
  org_id = get_my_org_id()
  AND (
    get_my_role() = 'owner'
    OR (get_my_role() = 'sales' AND created_by = get_my_user_id())
  )
);

-- DELETE: owner only
CREATE POLICY estimates_delete ON estimates FOR DELETE USING (
  org_id = get_my_org_id()
  AND get_my_role() = 'owner'
);

-- ============================================================
-- ESTIMATE_LINE_ITEMS  (follow parent estimate visibility)
-- ============================================================

DROP POLICY IF EXISTS "Org isolation: estimate_line_items" ON estimate_line_items;
DROP POLICY IF EXISTS "Org insert: estimate_line_items"    ON estimate_line_items;

CREATE POLICY eli_select ON estimate_line_items FOR SELECT USING (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);

CREATE POLICY eli_insert ON estimate_line_items FOR INSERT WITH CHECK (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);

CREATE POLICY eli_update ON estimate_line_items FOR UPDATE USING (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);

CREATE POLICY eli_delete ON estimate_line_items FOR DELETE USING (
  org_id = get_my_org_id()
  AND get_my_role() IN ('owner', 'sales')
);
