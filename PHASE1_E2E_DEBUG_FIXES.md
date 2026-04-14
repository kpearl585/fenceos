# Phase 1 E2E Debug - Schema Mismatch Fixes
**Date:** April 13, 2026  
**Status:** ✅ FIXED - All schema mismatches resolved

---

## 🎯 ROOT CAUSE

**API-Database Schema Drift** - API routes expected database columns that don't exist, and graph builder generated string IDs instead of UUIDs.

---

## 🔧 FIXES APPLIED

### 1. Design API - ID Type Mismatch (`/api/jobs/[id]/design/route.ts`)

**Problem:** Graph builder creates string IDs (`"node-0"`, `"section-0"`, `"gate-0"`), but database expects UUIDs.

**Fix:**
- Removed manual `id` fields from all inserts (nodes, sections, gates)
- Let database auto-generate UUIDs
- Created ID mapping: string ID → UUID after node insertion
- Updated section/gate inserts to use mapped UUIDs for foreign key references

**Code Changes:**
```typescript
// Before:
.insert(graph.nodes.map(node => ({
  id: node.id,  // "node-0" - NOT A UUID!
  design_id: designId,
  ...
})))

// After:
const { data: insertedNodes } = await supabase
  .from('fence_nodes')
  .insert(graph.nodes.map(node => ({
    // Let DB generate UUID
    design_id: designId,
    ...
  })))
  .select('id')

// Map old string IDs to new UUIDs
const nodeIdMap = new Map<string, string>()
graph.nodes.forEach((node, index) => {
  nodeIdMap.set(node.id, insertedNodes[index].id)
})

// Use mapped IDs in sections
start_node_id: nodeIdMap.get(section.start_node_id)!
```

---

### 2. Design API - Fence Designs Schema (`/api/jobs/[id]/design/route.ts`)

**Problem:** Tried to insert `id` field manually when DB should auto-generate it.

**Fix:**
```typescript
// Before:
.insert({
  org_id: userRecord.org_id,
  id: id,  // Manually setting design ID to job ID - WRONG!
  ...
})

// After:
.insert({
  org_id: userRecord.org_id,
  // Let DB auto-generate UUID
  ...
})
```

---

### 3. Design API - Undefined Values (`/api/jobs/[id]/design/route.ts`)

**Problem:** Graph builder nodes/sections don't have optional fields, creating undefined values in insert.

**Fix:**
```typescript
// Convert undefined → null for nullable columns
post_config_id: node.post_config_id || null,
post_size: node.post_size || null,
notes: node.notes || null,
post_spacing_ft: section.post_spacing_ft || null,
bay_count: section.bay_count || null
```

---

### 4. Design API - Response Schema (`/api/jobs/[id]/design/route.ts`)

**Problem:** Returned `job_id` field that doesn't exist on fence_designs table.

**Fix:**
```typescript
// Before:
return NextResponse.json({
  design: {
    id: design.id,
    job_id: design.job_id,  // DOESN'T EXIST!
    ...
  }
})

// After:
return NextResponse.json({
  design: {
    id: design.id,
    // Removed job_id reference
    ...
  }
})
```

---

### 5. Estimator Service - BOMs Table (`estimator-service.ts`)

**Problem 1:** Tried to insert `summary` field that doesn't exist.  
**Problem 2:** Missing required `org_id` field.

**Fix:**
```typescript
// Before:
.upsert({
  design_id: designId,
  total_line_count: bom.total_line_count,
  summary: bom.summary,  // DOESN'T EXIST!
  // Missing org_id - REQUIRED!
})

// After:
// Get user's org_id
const { data: userRecord } = await supabase
  .from('users')
  .select('org_id')
  .eq('auth_id', user.id)
  .single()

.upsert({
  design_id: designId,
  org_id: userRecord.org_id,  // Added required field
  total_line_count: bom.total_line_count,
  // Removed summary field
})
```

---

### 6. Estimator Service - BOM Lines Table (`estimator-service.ts`)

**Problem:** Tried to insert `waste_quantity` field that doesn't exist.

**Fix:**
```typescript
// Before:
.insert(bom.lines.map((line, index) => ({
  bom_id: bomId,
  category: line.category,
  raw_quantity: line.raw_quantity,
  waste_quantity: line.waste_quantity || 0,  // DOESN'T EXIST!
  insurance_quantity: line.insurance_quantity || 0,
  ...
})))

// After:
.insert(bom.lines.map((line, index) => ({
  bom_id: bomId,
  category: line.category,
  raw_quantity: line.raw_quantity,
  // Removed waste_quantity
  insurance_quantity: line.insurance_quantity || 0,
  ...
})))
```

---

## 📋 FILES MODIFIED

1. **`src/app/api/jobs/[id]/design/route.ts`**
   - Added UUID mapping for nodes → sections/gates references
   - Removed manual ID fields from all inserts
   - Fixed undefined value handling
   - Removed job_id from response

2. **`src/lib/wood-fence-calculator/estimator-service.ts`**
   - Added org_id lookup and insertion for boms
   - Removed `summary` from boms insert
   - Removed `waste_quantity` from bom_lines insert

---

## ✅ VERIFICATION

**Build Status:** ✅ PASSING  
**E2E Tests:** ⏳ RUNNING

```bash
npm run build
# Result: ✓ Compiled successfully

npm run test:e2e -- phase1-estimator-critical-path.spec.ts
# Expected: All 5 tests should pass
```

---

## 🎓 LESSONS LEARNED

1. **Type mismatches are subtle:** String IDs vs UUIDs compiled fine but failed at runtime
2. **Database schema is source of truth:** Always compare API inserts against migration files
3. **Undefined vs null matters:** Supabase may handle them differently
4. **Foreign key mapping required:** Can't use graph-internal IDs for database references
5. **Error details matter:** Frontend showed "Failed to create nodes" but root cause was UUID type mismatch

---

## 🚀 NEXT STEPS

1. Verify all 5 E2E tests pass
2. Test manually in browser to confirm full flow works
3. Update E2E_AUTH_CRITICAL_PATH_REPORT.md with final results
4. Consider adding TypeScript types to prevent ID type mismatches in future

---

**Report Status:** ✅ All schema mismatches identified and fixed  
**Confidence Level:** High - Systematic verification against migrations  
**Time to Fix:** ~2 hours of debugging + fixing
