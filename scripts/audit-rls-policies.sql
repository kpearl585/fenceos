-- ═══════════════════════════════════════════════════════════════
-- RLS POLICY AUDIT SCRIPT
-- Run this in Supabase SQL Editor to verify Row Level Security
-- ═══════════════════════════════════════════════════════════════

-- ── List all RLS policies ────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── Check which tables have RLS enabled ─────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── Find tables WITHOUT RLS enabled (SECURITY RISK!) ─────────────
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- ── Verify org_id column exists on all critical tables ──────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'org_id'
ORDER BY table_name;

-- ── Check for tables missing org_id (POTENTIAL LEAK!) ───────────
-- These tables might not have multi-tenant isolation
SELECT DISTINCT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'org_id'
      AND table_schema = 'public'
  )
  AND table_name NOT IN (
    -- Exclude system/lookup tables that don't need org_id
    'organizations',
    'profiles',
    'schema_migrations',
    'spatial_ref_sys'
  )
ORDER BY table_name;

-- ── Verify get_my_org_id() function exists ─────────────────────
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_my_org_id';

-- ── Test RLS isolation (manual test) ────────────────────────────
-- Instructions:
-- 1. Create two test users in different orgs
-- 2. Run these queries as each user:
--
-- SELECT * FROM fence_graphs WHERE org_id = '<other_org_id>';
-- -- Should return 0 rows (blocked by RLS)
--
-- SELECT * FROM materials WHERE org_id = '<other_org_id>';
-- -- Should return 0 rows (blocked by RLS)
--
-- SELECT * FROM customers WHERE org_id = '<other_org_id>';
-- -- Should return 0 rows (blocked by RLS)

-- ═══════════════════════════════════════════════════════════════
-- CRITICAL TABLES TO VERIFY
-- All these must have RLS enabled + org_id filter
-- ═══════════════════════════════════════════════════════════════

-- fence_graphs (saved estimates)
-- materials (org-specific materials)
-- customers (customer data)
-- estimates (quote data)
-- jobs (job data)
-- ai_extraction_log (AI usage audit)
-- supplier_connectors (price sync config)
-- supplier_catalog_snapshots (price data)

-- ═══════════════════════════════════════════════════════════════
-- EXPECTED POLICY PATTERN
-- ═══════════════════════════════════════════════════════════════

-- CREATE POLICY "table_name_org_policy" ON table_name
--   FOR ALL
--   USING (org_id = get_my_org_id());

-- ═══════════════════════════════════════════════════════════════
-- PASS CRITERIA
-- ═══════════════════════════════════════════════════════════════

-- ✅ All critical tables have rowsecurity = true
-- ✅ All critical tables have org_id column
-- ✅ All critical tables have RLS policy using get_my_org_id()
-- ✅ get_my_org_id() function exists
-- ✅ Manual cross-org query test returns 0 rows
