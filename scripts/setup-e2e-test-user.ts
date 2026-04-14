/**
 * E2E Test User Setup Script
 *
 * Creates a test user in Supabase Auth for E2E testing.
 * Run once before running E2E tests.
 *
 * Usage:
 *   npx tsx scripts/setup-e2e-test-user.ts
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@fenceestimatepro.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2ETest123!SecurePassword'

async function setupTestUser() {
  console.log('🔧 E2E Test User Setup\n')

  // Validate environment
  if (!SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local')
    process.exit(1)
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
    console.error('   This is required to create auth users programmatically.')
    console.error('   Get it from: https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/settings/api')
    process.exit(1)
  }

  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log(`🔐 Test Password: ${TEST_PASSWORD.replace(/./g, '*')}\n`)

  // Create admin client
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔍 Checking if test user already exists...')

  // Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email === TEST_EMAIL)

  if (existingUser) {
    console.log(`✅ Test user already exists (ID: ${existingUser.id})`)
    console.log(`   Email confirmed: ${existingUser.email_confirmed_at ? '✅ Yes' : '❌ No'}`)

    // Confirm email if not confirmed
    if (!existingUser.email_confirmed_at) {
      console.log('\n📧 Confirming email...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      )
      if (updateError) {
        console.error('❌ Failed to confirm email:', updateError.message)
      } else {
        console.log('✅ Email confirmed successfully')
      }
    }

    console.log('\n✅ Test user is ready for E2E testing!')
    console.log('\nNext steps:')
    console.log('  1. Ensure .env.test has correct credentials')
    console.log('  2. Run: npm run test:e2e')
    return
  }

  console.log('📝 Creating new test user...\n')

  // Create test user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true, // Auto-confirm email for testing
    user_metadata: {
      created_for: 'e2e-testing',
      created_at: new Date().toISOString()
    }
  })

  if (createError) {
    console.error('❌ Failed to create test user:', createError.message)
    process.exit(1)
  }

  console.log('✅ Test user created successfully!')
  console.log(`   ID: ${newUser.user?.id}`)
  console.log(`   Email: ${newUser.user?.email}`)
  console.log(`   Email Confirmed: ✅ Yes\n`)

  console.log('📋 Next Steps:\n')
  console.log('1. ✅ Test user created in Supabase Auth')
  console.log('2. ✅ .env.test configured with credentials')
  console.log('3. ⏭️  Run tests: npm run test:e2e')
  console.log('\n💡 On first test run:')
  console.log('   - App will auto-create organization')
  console.log('   - App will auto-create user profile with role=owner')
  console.log('   - App will seed materials catalog if empty')
  console.log('\n🎉 E2E testing environment is ready!')
}

setupTestUser().catch(err => {
  console.error('\n❌ Setup failed:', err)
  process.exit(1)
})
