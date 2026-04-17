-- Supabase advisor performance pass:
--
--   Phase 1: 16 auth_rls_initplan findings — wrap auth.uid() in a scalar
--            subselect so Postgres evaluates it once per query instead
--            of per-row. Pure perf win, no behavior change.
--
--   Phase 2:  7 multiple_permissive_policies fixes on change_orders
--            and jobs — these turn out to be a security cleanup as well
--            as a perf win (explanation below).
--
-- Why Phase 2 is security-adjacent, not just perf:
--
-- The April 16 RLS audit (commit 518fb13) added "Org isolation {select,
-- insert,update,delete}" policies to a set of tables. For most tables
-- (estimate_line_items, materials, invoices, fence_graphs…) that was
-- correct — they had RLS enabled with no policies, so Org isolation was
-- the only policy. But change_orders and jobs already had role-aware
-- policies (co_* and jobs_*). Adding the simpler Org isolation policies
-- ON TOP of those creates two PERMISSIVE policies per command, which
-- Postgres OR's together. A user who fails the strict role check (e.g.,
-- a sales user trying to insert a change order) now passes via the
-- loose "Org isolation" policy instead. The role gates became decorative.
--
-- Concrete examples of what's broken today and fixes here:
--
--   change_orders.co_insert requires owner OR assigned-foreman AND
--   created_by = self. "Org isolation insert" requires only org_id match.
--   → Today: any org member can insert change orders.
--   → After this migration: only owners or assigned foremen can, matching design.
--
--   jobs.jobs_update requires owner / sales-who-created / foreman-assigned.
--   "Org isolation update" requires only org_id match.
--   → Today: any org member can mutate any job in their org.
--   → After: role-scoped mutation restored.
--
-- We KEEP "Org isolation insert" on jobs because there is no jobs_insert
-- policy — dropping it would leave INSERT with no permissive policy and
-- block all job creation.

-- ─────────────────────────────────────────────────────────────────────
-- Phase 2: drop redundant-and-loosening "Org isolation" policies
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Org isolation select" ON public.change_orders;
DROP POLICY IF EXISTS "Org isolation insert" ON public.change_orders;
DROP POLICY IF EXISTS "Org isolation update" ON public.change_orders;
DROP POLICY IF EXISTS "Org isolation delete" ON public.change_orders;

DROP POLICY IF EXISTS "Org isolation select" ON public.jobs;
DROP POLICY IF EXISTS "Org isolation update" ON public.jobs;
DROP POLICY IF EXISTS "Org isolation delete" ON public.jobs;
-- NB: "Org isolation insert" on jobs is intentionally preserved — there
-- is no jobs_insert policy, so this is the only thing allowing job rows
-- to be created.

-- ─────────────────────────────────────────────────────────────────────
-- Phase 1: rewrite 16 auth.uid() callers to use scalar subselect
-- ─────────────────────────────────────────────────────────────────────
-- Postgres can only hoist (SELECT auth.uid()) out of the per-row loop
-- when it's explicitly a subquery. Naked auth.uid() is evaluated per row.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- Tables that just check "is there a session" — flip auth.uid() IS NOT NULL
-- to (SELECT auth.uid()) IS NOT NULL across all the read-only config/lookup
-- tables plus the public-read endpoints on Leads + waitlist.

DROP POLICY IF EXISTS "gate_configs_read" ON public.gate_configs;
CREATE POLICY "gate_configs_read" ON public.gate_configs FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "hardware_items_read" ON public.hardware_items;
CREATE POLICY "hardware_items_read" ON public.hardware_items FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "hardware_kits_read" ON public.hardware_kits;
CREATE POLICY "hardware_kits_read" ON public.hardware_kits FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "panel_configs_read" ON public.panel_configs;
CREATE POLICY "panel_configs_read" ON public.panel_configs FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "post_configs_read" ON public.post_configs;
CREATE POLICY "post_configs_read" ON public.post_configs FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "rail_configs_read" ON public.rail_configs;
CREATE POLICY "rail_configs_read" ON public.rail_configs FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "concrete_rules_read" ON public.concrete_rules;
CREATE POLICY "concrete_rules_read" ON public.concrete_rules FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "fence_types_read" ON public.fence_types;
CREATE POLICY "fence_types_read" ON public.fence_types FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "leads_authenticated_read" ON public."Leads";
CREATE POLICY "leads_authenticated_read" ON public."Leads" FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "waitlist_authenticated_read" ON public.waitlist;
CREATE POLICY "waitlist_authenticated_read" ON public.waitlist FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- organizations: insert gate on authenticated session
DROP POLICY IF EXISTS "Authenticated users can insert org" ON public.organizations;
CREATE POLICY "Authenticated users can insert org" ON public.organizations FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- users table: both policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT
  WITH CHECK (auth_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view same-org users" ON public.users;
CREATE POLICY "Users can view same-org users" ON public.users FOR SELECT
  USING ((org_id = get_my_org_id()) OR (auth_id = (SELECT auth.uid())));

-- referrals view — users-lookup subquery already exists, just wrap the inner auth.uid()
DROP POLICY IF EXISTS "org members can view own referrals" ON public.referrals;
CREATE POLICY "org members can view own referrals" ON public.referrals FOR SELECT
  USING (
    referring_org_id IN (
      SELECT org_id FROM public.users WHERE auth_id = (SELECT auth.uid())
    )
  );

-- ai_extraction_log: same pattern on both policies
DROP POLICY IF EXISTS "Users can view their org's extraction logs" ON public.ai_extraction_log;
CREATE POLICY "Users can view their org's extraction logs" ON public.ai_extraction_log FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE auth_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert extraction logs for their org" ON public.ai_extraction_log;
CREATE POLICY "Users can insert extraction logs for their org" ON public.ai_extraction_log FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.users WHERE auth_id = (SELECT auth.uid())
    )
  );
