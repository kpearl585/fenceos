-- ================================================================
-- RLS FIX FOR BOM_LINES TABLE
-- ================================================================
-- bom_lines needs RLS policy that checks access via parent boms table

ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bom_lines_access_via_bom" ON public.bom_lines;

CREATE POLICY "bom_lines_access_via_bom" ON public.bom_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.boms
      WHERE boms.id = bom_lines.bom_id
        AND boms.org_id = (SELECT get_my_org_id())
    )
  );

-- Verification
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'bom_lines';
