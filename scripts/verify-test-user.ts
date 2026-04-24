/**
 * Verify E2E Test User
 *
 * Tests if the test user credentials work for login
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

async function verifyTestUser() {
  console.log('🔍 Verifying E2E Test User\n')
  console.log(`📧 Email: ${TEST_EMAIL}`)
  console.log(`🔐 Password: ${TEST_PASSWORD.substring(0, 4)}***\n`)

  // Create client (same as app uses)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log('🔐 Attempting login...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (error) {
    console.error('\n❌ Login FAILED:', error.message)
    console.error('\nPossible causes:')
    console.error('1. Password mismatch')
    console.error('2. Email not confirmed')
    console.error('3. User does not exist')
    console.error('4. .env.test credentials incorrect')
    process.exit(1)
  }

  console.log('✅ Login SUCCESSFUL!')
  console.log(`   User ID: ${data.user?.id}`)
  console.log(`   Email: ${data.user?.email}`)
  console.log(`   Email Confirmed: ${data.user?.email_confirmed_at ? '✅ Yes' : '❌ No'}`)
  console.log('\n✅ Test user credentials are valid!')
  console.log('   E2E tests should work now.')

  // Sign out
  await supabase.auth.signOut()
}

verifyTestUser().catch(err => {
  console.error('\n❌ Verification failed:', err)
  process.exit(1)
})
