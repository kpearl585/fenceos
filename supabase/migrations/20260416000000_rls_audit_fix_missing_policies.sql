-- ═══════════════════════════════════════════════════════════════
-- RLS AUDIT FIX: Add missing policies to 12 tables
-- Applied: 2026-04-16
--
-- Finding: 12 tables had RLS enabled but ZERO policies, meaning:
--   - Admin client (service_role) bypassed RLS → app worked
--   - Regular client (anon/authenticated) got 0 rows → silent lockout
--   - No DB-level org isolation safety net for admin client code paths
--
-- Critical fix: fence_graphs (saved estimates) and invoices now have
-- proper org_id = get_my_org_id() policies. Config/lookup tables get
-- authenticated read-only access. Leads + waitlist get appropriate
-- public/authenticated access.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. fence_graphs (CRITICAL — saved estimates) ────────────────
CREATE POLICY "fence_graphs_org_select"
  ON public.fence_graphs FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY "fence_graphs_org_insert"
  ON public.fence_graphs FOR INSERT
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "fence_graphs_org_update"
  ON public.fence_graphs FOR UPDATE
  USING (org_id = get_my_org_id());

CREATE POLICY "fence_graphs_org_delete"
  ON public.fence_graphs FOR DELETE
  USING (org_id = get_my_org_id() AND get_my_role() = 'owner');

-- ── 2. invoices (org-isolated financial data) ───────────────────
CREATE POLICY "invoices_org_select"
  ON public.invoices FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY "invoices_org_insert"
  ON public.invoices FOR INSERT
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "invoices_org_update"
  ON public.invoices FOR UPDATE
  USING (org_id = get_my_org_id());

CREATE POLICY "invoices_org_delete"
  ON public.invoices FOR DELETE
  USING (org_id = get_my_org_id() AND get_my_role() = 'owner');

-- ── 3. Config/lookup tables (global read-only reference data) ────
CREATE POLICY "concrete_rules_read"
  ON public.concrete_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "fence_types_read"
  ON public.fence_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "gate_configs_read"
  ON public.gate_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hardware_items_read"
  ON public.hardware_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hardware_kits_read"
  ON public.hardware_kits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "panel_configs_read"
  ON public.panel_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "post_configs_read"
  ON public.post_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "rail_configs_read"
  ON public.rail_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── 4. Leads (no org_id — public lead capture + auth read) ──────
CREATE POLICY "leads_authenticated_read"
  ON public."Leads" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_public_insert"
  ON public."Leads" FOR INSERT
  WITH CHECK (true);

-- ── 5. waitlist (public pre-signup) ─────────────────────────────
CREATE POLICY "waitlist_public_insert"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "waitlist_authenticated_read"
  ON public.waitlist FOR SELECT
  USING (auth.uid() IS NOT NULL);
