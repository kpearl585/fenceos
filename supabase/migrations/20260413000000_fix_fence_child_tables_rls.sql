-- Fix RLS for fence child tables
-- fence_nodes, fence_sections, and gates don't have org_id, so they need
-- policies that check access through their parent fence_designs table

-- ================================================================
-- FENCE_NODES RLS
-- ================================================================
ALTER TABLE public.fence_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fence_nodes_access_via_design" ON public.fence_nodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = fence_nodes.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );

-- ================================================================
-- FENCE_SECTIONS RLS
-- ================================================================
ALTER TABLE public.fence_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fence_sections_access_via_design" ON public.fence_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = fence_sections.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );

-- ================================================================
-- GATES RLS
-- ================================================================
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gates_access_via_design" ON public.gates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fence_designs
      WHERE fence_designs.id = gates.design_id
        AND fence_designs.org_id = (SELECT get_my_org_id())
    )
  );
