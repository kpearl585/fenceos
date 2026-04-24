/**
 * Test Design API - Debug Script
 * Tests the design creation flow to identify the actual error
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') })

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@fenceestimatepro.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2ETest123!SecurePassword'

async function testDesignAPI() {
  console.log('🧪 Testing Design API\n')

  // 1. Login to get session cookie
  console.log('1. Logging in...')
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  })

  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.status)
    process.exit(1)
  }

  const cookies = loginRes.headers.get('set-cookie')
  console.log('✅ Login successful\n')

  // 2. Create a test job
  console.log('2. Creating test job...')
  const jobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      title: 'Test Design API Job',
      notes: 'Created by debug script'
    })
  })

  if (!jobRes.ok) {
    const error = await jobRes.json()
    console.error('❌ Job creation failed:', error)
    process.exit(1)
  }

  const { job } = await jobRes.json()
  console.log(`✅ Job created: ${job.id}\n`)

  // 3. Create design for job
  console.log('3. Creating design...')
  const designRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/design`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      total_linear_feet: 100,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    })
  })

  if (!designRes.ok) {
    const error = await designRes.json()
    console.error('❌ Design creation failed:', designRes.status)
    console.error('Error:', error.error)
    console.error('Details:', JSON.stringify(error.details, null, 2))
    process.exit(1)
  }

  const { design } = await designRes.json()
  console.log(`✅ Design created: ${design.id}\n`)

  console.log('🎉 All API calls successful!')
}

testDesignAPI().catch(err => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
