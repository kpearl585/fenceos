import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './utils/auth';

/**
 * CRITICAL PATH E2E TEST
 * Phase 1 Estimator - Real User Flow
 *
 * Tests the complete flow that a contractor would use:
 * 1. Log in
 * 2. Navigate to Phase 1 Estimator
 * 3. Enter fence parameters (100ft straight fence)
 * 4. Generate estimate
 * 5. Verify results page loads
 */

test.describe('Phase 1 Estimator - Critical Path', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as test user
    await loginWithTestUser(page);
  });

  test('CP-1: should load Phase 1 estimator page', async ({ page }) => {
    // Navigate to estimator
    await page.goto('/dashboard/phase1-estimator');

    // Verify page loaded
    await expect(page.locator('h1:has-text("Phase 1 Estimator")')).toBeVisible();
    await expect(page.locator('text=Wood Privacy Fence')).toBeVisible();

    // Verify form elements present
    await expect(page.locator('text=Total Linear Feet')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Estimate")')).toBeVisible();
  });

  test('CP-2: should submit 100ft straight fence and get results', async ({ page }) => {
    await page.goto('/dashboard/phase1-estimator');

    // Wait for form to be ready
    await expect(page.locator('h1:has-text("Phase 1 Estimator")')).toBeVisible();

    // Fill in minimum required fields (defaults are already set)
    // Total Linear Feet: 100 (default)
    // Height: 6ft (default)
    // Frost Zone: 2 (default)
    // Soil Type: normal (default)

    // Click generate estimate
    await page.click('button:has-text("Generate Estimate")');

    // Wait for navigation to results
    // Results page should load within reasonable time
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });

    // Verify results page loaded (URL pattern: /dashboard/phase1-estimator/[design_id])
    const url = page.url();
    expect(url).toMatch(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/);
  });

  test('CP-3: should submit 100ft with 1 walk gate', async ({ page }) => {
    await page.goto('/dashboard/phase1-estimator');
    await expect(page.locator('h1')).toContainText('Phase 1 Estimator');

    // Add a gate
    await page.click('button:has-text("Add Gate")');

    // Gate width should be 4ft by default - no need to change

    // Submit
    await page.click('button:has-text("Generate Estimate")');

    // Wait for results
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });

    // Verify navigated to results (URL pattern: /dashboard/phase1-estimator/[design_id])
    expect(page.url()).toMatch(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/);
  });

  test('CP-4: should submit 24ft edge case (short run)', async ({ page }) => {
    await page.goto('/dashboard/phase1-estimator');

    // Find the linear feet input by its label
    const linearFeetLabel = page.locator('label:has-text("Total Linear Feet")');
    const linearFeetInput = page.locator('input[type="number"]').first();

    // Clear and set to 24ft
    await linearFeetInput.click();
    await linearFeetInput.fill('24');

    // Submit
    await page.click('button:has-text("Generate Estimate")');

    // Should still generate successfully
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });
  });

  test('CP-5: should show loading state during generation', async ({ page }) => {
    await page.goto('/dashboard/phase1-estimator');

    // Click generate
    await page.click('button:has-text("Generate Estimate")');

    // Should show loading text
    await expect(page.locator('button:has-text("Generating Estimate")')).toBeVisible({ timeout: 2000 });

    // Eventually should navigate
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });
  });
});
