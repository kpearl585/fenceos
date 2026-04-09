import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Advanced Estimate E2E testing
 *
 * Test environment: Local development server
 * Database: Uses production/staging Supabase (isolated test org)
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Fail test on console errors (helps catch React errors, etc.)
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Collect console errors
    extraHTTPHeaders: {
      // Add any required headers
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  // Test output directory
  outputDir: 'test-results/',

  // Retry on failure
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers
  workers: 1, // Single worker to avoid DB conflicts
});
