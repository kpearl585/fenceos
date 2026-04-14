/**
 * Verify E2E Test User Database State
 *
 * Checks if test user has proper org, profile, and can create jobs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@fenceestimatepro.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2ETest123!SecurePassword'

async function verifyDatabaseState() {
  console.log('🔍 Verifying E2E Test User Database State\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Login
  const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (loginError || !authData.user) {
    console.error('❌ Login failed:', loginError?.message)
    process.exit(1)
  }

  console.log('✅ Login successful')
  console.log(`   User ID: ${authData.user.id}\n`)

  // Check for profile in public.users
  console.log('📋 Checking public.users profile...')
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single()

  if (profileError || !userProfile) {
    console.error('❌ No profile found in public.users')
    console.error('   Error:', profileError?.message)
    console.log('\n💡 This is expected on first login')
    console.log('   Solution: Log in via browser once to trigger ensureProfile()')
    console.log('   URL: http://localhost:3000/login')
    process.exit(1)
  }

  console.log('✅ Profile found')
  console.log(`   Org ID: ${userProfile.org_id}`)
  console.log(`   Role: ${userProfile.role}`)
  console.log(`   Email: ${userProfile.email}\n`)

  // Check for organization
  console.log('🏢 Checking organization...')
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userProfile.org_id)
    .single()

  if (orgError || !org) {
    console.error('❌ Organization not found')
    console.error('   Error:', orgError?.message)
    process.exit(1)
  }

  console.log('✅ Organization found')
  console.log(`   Name: ${org.name}\n`)

  // Try to create a test job
  console.log('🧪 Testing job creation...')
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      org_id: userProfile.org_id,
      title: 'E2E Test Job',
      notes: 'Test job from verification script',
      status: 'scheduled'
    })
    .select()
    .single()

  if (jobError) {
    console.error('❌ Job creation FAILED')
    console.error('   Error:', jobError.message)
    console.error('   Code:', jobError.code)
    console.error('   Details:', jobError.details)
    console.log('\n📋 Possible causes:')
    console.log('   1. RLS policy blocking insert')
    console.log('   2. Missing columns in jobs table')
    console.log('   3. User role not authorized')
    process.exit(1)
  }

  console.log('✅ Job creation SUCCESSFUL')
  console.log(`   Job ID: ${job.id}`)
  console.log(`   Title: ${job.title}\n`)

  // Clean up test job
  await supabase.from('jobs').delete().eq('id', job.id)
  console.log('✅ Test job cleaned up\n')

  console.log('🎉 All checks passed!')
  console.log('   E2E tests should work now.')

  await supabase.auth.signOut()
}

verifyDatabaseState().catch(err => {
  console.error('\n❌ Verification failed:', err)
  process.exit(1)
})
