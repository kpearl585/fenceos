/**
 * Apply RLS Fix Migration
 * Adds RLS policies to fence_nodes, fence_sections, and gates tables
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyMigration() {
  console.log('🔧 Applying RLS fix migration\n')

  // Create admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Read migration file
  const migrationSQL = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260413000000_fix_fence_child_tables_rls.sql'),
    'utf-8'
  )

  console.log('📋 Migration SQL:')
  console.log(migrationSQL)
  console.log('\n🚀 Executing migration...\n')

  // Execute migration (need to run each statement separately)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue

    console.log(`Executing: ${statement.substring(0, 80)}...`)

    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

    if (error) {
      // Try direct query if rpc fails
      const { error: queryError } = await supabase.from('_').select('*').limit(0) as any

      if (error.message.includes('does not exist')) {
        console.log('⚠️  exec_sql function not available, migration needs to be run manually')
        console.log('\n📋 To apply manually:')
        console.log('1. Go to Supabase Dashboard → SQL Editor')
        console.log(`2. Paste the migration from: supabase/migrations/20260413000000_fix_fence_child_tables_rls.sql`)
        console.log('3. Click "Run"')
        process.exit(1)
      }

      console.error(`❌ Error:`, error.message)
      process.exit(1)
    }

    console.log('  ✅ Success')
  }

  console.log('\n🎉 Migration applied successfully!')
  console.log('\nYou can now run E2E tests:')
  console.log('  npm run test:e2e -- phase1-estimator-critical-path.spec.ts')
}

applyMigration().catch(err => {
  console.error('\n❌ Migration failed:', err.message)
  console.log('\n📋 To apply manually:')
  console.log('1. Go to Supabase Dashboard → SQL Editor')
  console.log('2. Go to https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/sql/new')
  console.log('3. Paste the contents of: supabase/migrations/20260413000000_fix_fence_child_tables_rls.sql')
  console.log('4. Click "Run"')
  process.exit(1)
})
