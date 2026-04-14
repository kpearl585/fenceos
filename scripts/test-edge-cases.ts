/**
 * Edge Case Testing Script
 * Tests validation and edge cases without E2E overhead
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') })

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@fenceestimatepro.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2ETest123!SecurePassword'

interface TestCase {
  name: string
  payload: any
  expectedStatus: number
  expectedError?: string
}

const edgeCases: TestCase[] = [
  {
    name: 'Very short run (10ft)',
    payload: {
      total_linear_feet: 10,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 201
  },
  {
    name: 'Very long run (5000ft)',
    payload: {
      total_linear_feet: 5000,
      corner_count: 10,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 201
  },
  {
    name: 'Too long (exceeds 10000ft)',
    payload: {
      total_linear_feet: 10001,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'cannot exceed 10,000'
  },
  {
    name: 'Too many corners (101)',
    payload: {
      total_linear_feet: 1000,
      corner_count: 101,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'cannot exceed 100'
  },
  {
    name: 'Gate too wide (15ft)',
    payload: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [{ width_ft: 15 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'cannot exceed 12'
  },
  {
    name: 'Gate too narrow (2ft)',
    payload: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [{ width_ft: 2 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'at least 3 feet'
  },
  {
    name: 'Gate position beyond fence',
    payload: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [{ width_ft: 4, position_ft: 150 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'within the total linear feet'
  },
  {
    name: 'Total gate width exceeds fence',
    payload: {
      total_linear_feet: 50,
      corner_count: 0,
      gates: [
        { width_ft: 12 },
        { width_ft: 12 },
        { width_ft: 12 },
        { width_ft: 12 },
        { width_ft: 12 }
      ],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 400,
    expectedError: 'must be less than total linear feet'
  },
  {
    name: 'Multiple gates (5 gates)',
    payload: {
      total_linear_feet: 200,
      corner_count: 2,
      gates: [
        { width_ft: 4, position_ft: 40 },
        { width_ft: 4, position_ft: 80 },
        { width_ft: 4, position_ft: 120 },
        { width_ft: 4, position_ft: 160 },
        { width_ft: 6, position_ft: 190 }
      ],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedStatus: 201
  }
]

async function runTests() {
  console.log('🧪 Edge Case Testing\n')
  console.log('Starting dev server may be needed: npm run dev\n')

  let passed = 0
  let failed = 0

  for (const testCase of edgeCases) {
    process.stdout.write(`Testing: ${testCase.name}... `)

    try {
      // Create job first
      const jobRes = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Edge Case Test: ${testCase.name}`,
          notes: 'Automated edge case test'
        })
      })

      if (!jobRes.ok) {
        console.log(`❌ FAIL (job creation failed)`)
        failed++
        continue
      }

      const { job } = await jobRes.json()

      // Test design creation with edge case payload
      const designRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      })

      if (designRes.status !== testCase.expectedStatus) {
        console.log(`❌ FAIL (expected ${testCase.expectedStatus}, got ${designRes.status})`)
        failed++
        continue
      }

      if (testCase.expectedError) {
        const error = await designRes.json()
        if (!error.error || !error.error.toLowerCase().includes(testCase.expectedError.toLowerCase())) {
          console.log(`❌ FAIL (expected error "${testCase.expectedError}", got "${error.error}")`)
          failed++
          continue
        }
      }

      console.log('✅ PASS')
      passed++

    } catch (err: any) {
      console.log(`❌ FAIL (${err.message})`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed}/${edgeCases.length} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

console.log('⚠️  Make sure dev server is running: npm run dev')
console.log('Press Ctrl+C to cancel, or wait 3 seconds to start...\n')

setTimeout(() => runTests(), 3000)
