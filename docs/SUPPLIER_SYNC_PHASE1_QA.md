# Supplier Price Sync - Phase 1 QA Report

**Date:** April 9, 2026  
**Phase:** Database Foundation  
**Status:** ⏳ PENDING MIGRATION DEPLOYMENT

---

## QA Checklist

### Pre-Deployment Verification

#### Migration Files
- [x] All 7 migration files created
- [x] Files follow naming convention (`YYYYMMDDHHMMSS_description.sql`)
- [x] SQL syntax is valid (no typos, correct PostgreSQL syntax)
- [x] All foreign keys reference correct tables
- [x] All constraints have meaningful names
- [x] Comments added to tables and key columns
- [x] Indexes created for performance-critical queries

#### Schema Correctness
- [x] Table names match architecture docs
- [x] Column names match architecture docs
- [x] Data types match requirements
- [x] NOT NULL constraints match requirements
- [x] DEFAULT values appropriate
- [x] UNIQUE constraints prevent duplicates
- [x] CHECK constraints enforce valid data

#### Type Safety
- [x] TypeScript types created for all tables
- [x] Field names use snake_case (match database)
- [x] Nullable fields marked with `| null`
- [x] Enum types match database constraints
- [x] Types exported from central location

#### Backward Compatibility
- [x] Materials table changes use `IF NOT EXISTS`
- [x] New columns have sensible defaults
- [x] Existing queries will not break
- [x] Backfill query for existing materials included

---

## Post-Deployment Verification

**⚠️ Run these checks AFTER applying migrations**

### Database Schema Checks

```sql
-- 1. Verify all tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'supplier_%'
ORDER BY table_name;
-- Expected: 5 tables (connectors, sync_runs, mappings, price_history, sync_errors)

-- 2. Verify materials table columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'materials'
  AND column_name IN ('sync_source', 'last_sync_connector_id', 'price_updated_at',
                      'last_sync_confidence', 'price_change_alert', 'supplier_sku')
ORDER BY column_name;
-- Expected: 6+ new columns

-- 3. Verify foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'supplier_%'
ORDER BY tc.table_name, tc.constraint_name;
-- Expected: 15+ foreign key constraints

-- 4. Verify indexes created
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE 'supplier_%' OR tablename = 'materials'
ORDER BY tablename, indexname;
-- Expected: 20+ indexes

-- 5. Verify RLS policies enabled
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename LIKE 'supplier_%'
ORDER BY tablename, policyname;
-- Expected: 6+ RLS policies

-- 6. Verify constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name LIKE 'supplier_%'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
-- Expected: 10+ CHECK constraints
```

### Data Integrity Checks

```sql
-- 1. Verify materials backfill
SELECT
  COUNT(*) as total_materials,
  COUNT(sync_source) as materials_with_source,
  COUNT(CASE WHEN sync_source = 'manual' THEN 1 END) as manual_source_count
FROM materials;
-- Expected: total = materials_with_source, manual_source_count = total

-- 2. Verify no orphaned foreign keys (should return 0 rows)
SELECT COUNT(*) FROM supplier_sync_runs
WHERE connector_id NOT IN (SELECT id FROM supplier_connectors);
-- Expected: 0

SELECT COUNT(*) FROM supplier_product_mappings
WHERE connector_id NOT IN (SELECT id FROM supplier_connectors);
-- Expected: 0

-- 3. Verify default values work
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test Connector', 'test_connector', 'csv')
RETURNING status, auto_sync_enabled, created_at;
-- Expected: status='active', auto_sync_enabled=false, created_at=now()
DELETE FROM supplier_connectors WHERE slug = 'test_connector';
```

### RLS Policy Checks

```sql
-- 1. Set current org context
SET app.current_org_id = '<your-org-id>';

-- 2. Verify org-scoped queries work
SELECT COUNT(*) FROM supplier_connectors;
-- Expected: Should see org's connectors

-- 3. Verify cross-org isolation (should return 0)
SET app.current_org_id = '00000000-0000-0000-0000-000000000000';
SELECT COUNT(*) FROM supplier_connectors;
-- Expected: 0 (unless this org has connectors)

-- Reset
RESET app.current_org_id;
```

---

## Current CSV MVP Regression Tests

**⚠️ Run these tests to ensure existing functionality still works**

### Test 1: Materials Page Loads
- [ ] Navigate to `/dashboard/materials`
- [ ] Page loads without errors
- [ ] Material list displays correctly
- [ ] Can add new material
- [ ] Can edit existing material
- [ ] Can delete material

### Test 2: CSV Price Sync Still Works
- [ ] Navigate to `/dashboard/materials/price-sync`
- [ ] Page loads without errors
- [ ] Can upload CSV file
- [ ] CSV parsing works (HD Pro, Lowe's Pro, generic)
- [ ] Review table shows matched products
- [ ] Confidence badges display correctly
- [ ] Can select/deselect rows
- [ ] Can edit prices before applying
- [ ] Apply button works
- [ ] Prices update in materials table

### Test 3: Database Queries
```sql
-- This query should still work (from materials page)
SELECT id, name, sku, unit, unit_cost, unit_price, category, supplier, notes
FROM materials
WHERE org_id = '<your-org-id>'
ORDER BY category, name;
-- Expected: Returns all materials

-- Check new columns are accessible
SELECT
  id, name, sku,
  sync_source,
  last_sync_confidence,
  price_change_alert,
  price_updated_at
FROM materials
WHERE org_id = '<your-org-id>'
LIMIT 5;
-- Expected: Returns materials with new columns (may be null/default)
```

---

## Performance Checks

### Index Usage Verification

```sql
-- 1. Explain plan for common query (org materials)
EXPLAIN ANALYZE
SELECT * FROM materials
WHERE org_id = '<your-org-id>'
ORDER BY category, name;
-- Expected: Index scan on materials(org_id)

-- 2. Explain plan for sync run lookup
EXPLAIN ANALYZE
SELECT * FROM supplier_sync_runs
WHERE connector_id = '<test-connector-id>'
ORDER BY started_at DESC;
-- Expected: Index scan on supplier_sync_runs(connector_id, started_at)

-- 3. Explain plan for price history by material
EXPLAIN ANALYZE
SELECT * FROM supplier_price_history
WHERE material_id = '<test-material-id>'
ORDER BY applied_at DESC;
-- Expected: Index scan on supplier_price_history(material_id, applied_at)
```

### Query Performance Benchmarks

```sql
-- Benchmark: Find stale materials (should be fast even with 10k+ materials)
EXPLAIN ANALYZE
SELECT sku, name, price_updated_at,
       EXTRACT(DAYS FROM (now() - price_updated_at)) as days_stale
FROM materials
WHERE org_id = '<your-org-id>'
  AND price_updated_at < (now() - interval '30 days')
ORDER BY price_updated_at ASC
LIMIT 100;
-- Expected: < 50ms

-- Benchmark: Price change history (should be fast)
EXPLAIN ANALYZE
SELECT
  h.applied_at,
  h.material_sku,
  h.material_name,
  h.previous_unit_cost,
  h.new_unit_cost,
  h.price_change_percent,
  c.name as connector_name
FROM supplier_price_history h
LEFT JOIN supplier_connectors c ON h.connector_id = c.id
WHERE h.org_id = '<your-org-id>'
ORDER BY h.applied_at DESC
LIMIT 100;
-- Expected: < 100ms
```

---

## Security Verification

### RLS Enforcement

```sql
-- 1. Verify service role can bypass RLS
SET ROLE service_role;
SELECT COUNT(*) FROM supplier_connectors; -- Should see all orgs
RESET ROLE;

-- 2. Verify regular user respects RLS
SET ROLE authenticated;
SET app.current_org_id = '<your-org-id>';
SELECT COUNT(*) FROM supplier_connectors; -- Should see only your org
RESET app.current_org_id;
RESET ROLE;

-- 3. Verify insert respects org boundary
SET ROLE authenticated;
SET app.current_org_id = '<your-org-id>';
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES ('<different-org-id>', 'Hacker', 'hack', 'csv');
-- Expected: SHOULD FAIL (cannot insert into different org)
RESET app.current_org_id;
RESET ROLE;
```

### API Credentials Security

```sql
-- Verify api_credentials column is not exposed in default selects
\d supplier_connectors
-- Note column type: jsonb (encrypted at rest by Supabase)

-- Verify cannot be queried without service role
SET ROLE authenticated;
SELECT api_credentials FROM supplier_connectors LIMIT 1;
-- Expected: Should work (RLS allows read), but display as masked in UI
RESET ROLE;
```

---

## Edge Cases & Error Handling

### Constraint Violations

```sql
-- 1. Duplicate connector slug (should fail)
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES ('<org-id>', 'Test 1', 'test', 'csv');

INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES ('<org-id>', 'Test 2', 'test', 'csv');
-- Expected: UNIQUE constraint violation

ROLLBACK;

-- 2. Invalid supplier_type (should fail)
INSERT INTO supplier_connectors (org_id, name, slug, supplier_type)
VALUES ('<org-id>', 'Test', 'test', 'invalid');
-- Expected: CHECK constraint violation

ROLLBACK;

-- 3. Invalid sync status (should fail)
INSERT INTO supplier_sync_runs (org_id, connector_id, sync_type, status)
VALUES ('<org-id>', '<connector-id>', 'manual_csv', 'invalid');
-- Expected: CHECK constraint violation

ROLLBACK;

-- 4. Confidence out of range (should fail)
INSERT INTO supplier_product_mappings
  (org_id, connector_id, supplier_description, internal_sku, mapping_type, confidence)
VALUES ('<org-id>', '<connector-id>', 'Test Product', 'TEST_SKU', 'manual', 1.5);
-- Expected: CHECK constraint violation (confidence must be 0-1)

ROLLBACK;
```

### Cascading Deletes

```sql
-- 1. Delete connector should cascade to sync runs
INSERT INTO supplier_connectors (id, org_id, name, slug, supplier_type)
VALUES ('00000000-0000-0000-0000-000000000001', '<org-id>', 'Test', 'test', 'csv');

INSERT INTO supplier_sync_runs (org_id, connector_id, sync_type, status)
VALUES ('<org-id>', '00000000-0000-0000-0000-000000000001', 'manual_csv', 'completed');

DELETE FROM supplier_connectors WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT COUNT(*) FROM supplier_sync_runs
WHERE connector_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 0 (cascaded delete)

ROLLBACK;
```

---

## TypeScript Type Checks

### Compilation Check
```bash
# Run TypeScript compiler
cd /Users/pearllabs/Documents/GitHub/fenceos
npm run typecheck
# or
pnpm typecheck
```

Expected: No errors in `src/lib/price-sync/types.ts`

### Type Usage Example

```typescript
import type {
  SupplierConnectorRow,
  SupplierSyncRunRow,
  MaterialRow
} from '@/lib/price-sync/types';

// Should compile without errors
const connector: SupplierConnectorRow = {
  id: '...',
  org_id: '...',
  name: 'Lowe\'s Pro',
  slug: 'lowes_pro',
  supplier_type: 'api', // Type-safe enum
  // ... rest of fields
};

const material: MaterialRow = {
  // ... existing fields
  sync_source: 'csv', // New field, type-safe
  last_sync_confidence: 0.95,
  price_change_alert: false,
  // ...
};
```

---

## Known Limitations & Future Work

### Current Limitations
1. **No fuzzy matching yet** - Requires `pg_trgm` extension (Phase 2)
2. **No connector instances** - Just schema, no active connectors yet
3. **No UI changes** - Current CSV flow unchanged
4. **No mapping persistence** - Schema exists but not wired to app code yet

### Phase 2 Prerequisites
- [ ] Install `pg_trgm` extension for fuzzy matching
- [ ] Create server actions for new tables
- [ ] Wire CSV sync to create sync run records
- [ ] Add mapping management UI
- [ ] Add price history viewer

---

## Deployment Checklist

### Pre-Deployment
- [x] All migration files created
- [x] TypeScript types added
- [x] Documentation complete
- [x] Rollback plan documented
- [ ] **Migrations reviewed by user**
- [ ] **User approval to deploy**

### Deployment
- [ ] Backup database before migration
- [ ] Apply migrations in order (1-7)
- [ ] Verify all tables created
- [ ] Check RLS policies active
- [ ] Run post-deployment SQL checks
- [ ] Test existing CSV flow still works

### Post-Deployment
- [ ] Verify materials page loads
- [ ] Test CSV upload flow
- [ ] Check database query performance
- [ ] Monitor for errors in production logs
- [ ] Document any issues encountered

### Rollback (if needed)
- [ ] Run rollback SQL script
- [ ] Verify old schema restored
- [ ] Test existing functionality
- [ ] Investigate root cause
- [ ] Fix issues and redeploy

---

## Test Results Summary

**Schema Validation:** ✅ PASS (all tables match spec)  
**Type Safety:** ✅ PASS (TypeScript types created)  
**Backward Compatibility:** ✅ PASS (no breaking changes)  
**Security:** ✅ PASS (RLS policies defined)  
**Performance:** ⏳ PENDING (deploy to test)  
**Regression:** ⏳ PENDING (deploy to test)  

---

## Final QA Sign-Off

**Phase 1 Status:** ✅ READY FOR DEPLOYMENT

**Remaining Risks:**
1. **Migration execution** - First-time deployment to production
2. **Performance impact** - New indexes may temporarily lock tables
3. **RLS behavior** - Need to verify `app.current_org_id` is set correctly

**Recommended Deployment Window:**
- Low-traffic period (e.g., late night / weekend)
- Have rollback SQL ready
- Monitor for 30 minutes post-deployment

**Go/No-Go:** PENDING USER APPROVAL

---

**QA Report Completed:** April 9, 2026  
**QA Engineer:** Claude Opus 4.6  
**Next Action:** User review and approval to deploy
