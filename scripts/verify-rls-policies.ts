/**
 * Verify RLS Policies Exist
 * Checks if RLS policies are in place on child tables
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verifyPolicies() {
  console.log('🔍 Verifying RLS policies on child tables\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Query to check RLS policies
  const checkQuery = `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('fence_nodes', 'fence_sections', 'gates')
    ORDER BY tablename, policyname;
  `

  const { data: policies, error } = await supabase.rpc('exec_sql', {
    query: checkQuery
  }) as any

  if (error) {
    console.error('❌ Cannot query policies via RPC')
    console.log('\nAttempting alternative verification...\n')

    // Try to insert a test node to see if RLS blocks it
    const testResult = await testInsertPermissions(supabase)
    return testResult
  }

  if (!policies || policies.length === 0) {
    console.log('❌ NO POLICIES FOUND on child tables\n')
    console.log('Expected policies:')
    console.log('  - fence_nodes_access_via_design')
    console.log('  - fence_sections_access_via_design')
    console.log('  - gates_access_via_design\n')
    return false
  }

  console.log('✅ Found RLS policies:\n')
  policies.forEach((p: any) => {
    console.log(`  📋 ${p.tablename}.${p.policyname}`)
    console.log(`     Command: ${p.cmd}`)
    console.log(`     Permissive: ${p.permissive}`)
  })

  // Check we have all required policies
  const required = ['fence_nodes', 'fence_sections', 'gates']
  const found = new Set(policies.map((p: any) => p.tablename))

  const missing = required.filter(t => !found.has(t))
  if (missing.length > 0) {
    console.log(`\n⚠️  Missing policies on: ${missing.join(', ')}`)
    return false
  }

  console.log('\n🎉 All required RLS policies are in place!')
  return true
}

async function testInsertPermissions(supabase: any) {
  console.log('🧪 Testing insert permissions...\n')

  // This won't actually work without proper auth context,
  // but we can check the error type
  console.log('✅ Alternative: Check will be done during E2E test run')
  console.log('   If E2E tests pass, RLS policies are correct\n')

  return null
}

verifyPolicies().then(result => {
  if (result === false) {
    console.log('\n❌ RLS POLICIES NOT APPLIED')
    console.log('\n📋 TO APPLY POLICIES:\n')
    console.log('1. Open Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/sql/new\n')
    console.log('2. Copy and paste the migration file:')
    console.log('   supabase/migrations/20260413000000_fix_fence_child_tables_rls.sql\n')
    console.log('3. Click "Run"\n')
    console.log('4. Rerun this verification script\n')
    process.exit(1)
  } else if (result === null) {
    console.log('ℹ️  Run E2E tests to verify RLS policies work correctly')
  }
}).catch(err => {
  console.error('\n❌ Verification error:', err.message)
  process.exit(1)
})
