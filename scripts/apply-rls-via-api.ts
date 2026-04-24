/**
 * Apply RLS via Supabase REST API
 * Last resort attempt to apply migration programmatically
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyViaAPI() {
  console.log('🔧 Attempting to apply RLS via REST API\n')

  const sql = readFileSync(resolve(process.cwd(), 'RLS_FIX_APPLY_NOW.sql'), 'utf-8')

  // Try Supabase SQL endpoint (may not exist)
  const sqlEndpoint = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`

  try {
    const response = await fetch(sqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        query: sql
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ API request failed:', response.status)
      console.error('Error:', error)

      if (error.includes('exec_sql') || error.includes('not found')) {
        console.log('\n⚠️  exec_sql function not available\n')
        printManualInstructions()
        return false
      }

      return false
    }

    const result = await response.json()
    console.log('✅ SQL executed successfully!')
    console.log('Result:', result)
    return true

  } catch (error: any) {
    console.error('❌ Failed to execute SQL:', error.message)
    printManualInstructions()
    return false
  }
}

function printManualInstructions() {
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│  MANUAL APPLICATION REQUIRED                                 │')
  console.log('└─────────────────────────────────────────────────────────────┘\n')
  console.log('📋 STEPS:\n')
  console.log('1. Open this URL in your browser:')
  console.log('   https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/sql/new\n')
  console.log('2. Open this file:')
  console.log('   RLS_FIX_APPLY_NOW.sql\n')
  console.log('3. Copy ALL the SQL from the file\n')
  console.log('4. Paste into the Supabase SQL Editor\n')
  console.log('5. Click the "Run" button\n')
  console.log('6. You should see "Success. No rows returned"\n')
  console.log('7. Run the verification query at the bottom to confirm\n')
  console.log('8. Then rerun E2E tests:\n')
  console.log('   npm run test:e2e -- phase1-estimator-critical-path.spec.ts\n')
}

applyViaAPI().then(success => {
  if (!success) {
    process.exit(1)
  }
  console.log('\n🎉 RLS policies should now be in place!')
  console.log('Run E2E tests to verify:\n')
  console.log('  npm run test:e2e -- phase1-estimator-critical-path.spec.ts\n')
})
