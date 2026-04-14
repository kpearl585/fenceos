-- ================================================================
-- RLS FIX FOR PHASE 1 ESTIMATOR - APPLY IMMEDIATELY
-- ================================================================
-- This fixes the 42501 RLS violation blocking E2E tests
--
-- TO APPLY:
-- 1. Go to: https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/sql/new
-- 2. Copy ALL of this SQL
-- 3. Paste into SQL Editor
-- 4. Click "Run"
-- ================================================================

-- FENCE_NODES RLS
ALTER TABLE public.fence_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fence_nodes_access_via_design" ON public.fence_nodes;

CREATE POLICY "fence_nodes_access_via_design" ON public.fence_nodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = fence_nodes.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );

-- FENCE_SECTIONS RLS
ALTER TABLE public.fence_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fence_sections_access_via_design" ON public.fence_sections;

CREATE POLICY "fence_sections_access_via_design" ON public.fence_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = fence_sections.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );

-- GATES RLS
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gates_access_via_design" ON public.gates;

CREATE POLICY "gates_access_via_design" ON public.gates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = gates.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );

-- VERIFICATION QUERY (run this after to confirm policies exist)
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('fence_nodes', 'fence_sections', 'gates')
ORDER BY tablename, policyname;
