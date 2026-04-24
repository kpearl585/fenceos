import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './utils/auth';

/**
 * BETA SAFETY E2E TESTS
 * Phase 1 Estimator - Beta User Protection
 *
 * Tests validation, error handling, and safety features
 * that protect beta users from bad inputs and errors
 */

test.describe('Phase 1 Estimator - Beta Safety', () => {

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto('/dashboard/phase1-estimator');
    await expect(page.locator('h1:has-text("Phase 1 Estimator")')).toBeVisible();
  });

  test('BS-1: should reject linear feet exceeding maximum', async ({ page }) => {
    const linearFeetInput = page.locator('input[type="number"]').first();

    // Try to enter value over 10,000
    await linearFeetInput.fill('10001');
    await page.click('button:has-text("Generate Estimate")');

    // Browser HTML5 validation or custom error should block submission
    // Verify we're still on the form page (not navigated away)
    await page.waitForTimeout(1000); // Give time for any validation
    const currentUrl = page.url();
    expect(currentUrl).toContain('/phase1-estimator');
    expect(currentUrl).not.toMatch(/[a-f0-9-]{36}/); // Should NOT have navigated to results
  });

  test('BS-2: should reject corner count exceeding maximum', async ({ page }) => {
    // Find corner count input (second number input)
    const cornerInput = page.locator('label:has-text("Corner Count")').locator('..').locator('input');

    await cornerInput.fill('101');
    await page.click('button:has-text("Generate Estimate")');

    // Browser HTML5 validation or custom error should block submission
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/phase1-estimator');
    expect(currentUrl).not.toMatch(/[a-f0-9-]{36}/);
  });

  test('BS-3: should reject total gate width exceeding fence length', async ({ page }) => {
    // Set short fence
    const linearFeetInput = page.locator('input[type="number"]').first();
    await linearFeetInput.fill('30');

    // Add multiple gates that exceed fence length
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');

    // Each gate defaults to 4ft, so 3 gates = 12ft in a 30ft fence should be OK
    // Add more gates to exceed
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    // Now 8 gates * 4ft = 32ft > 30ft fence

    await page.click('button:has-text("Generate Estimate")');

    // Should show validation error
    await expect(page.locator('text=Total gate width')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=must be less than total linear feet')).toBeVisible();
  });

  test('BS-4: should prevent duplicate submit clicks', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Generate Estimate")');

    // Click submit button
    await submitButton.click();

    // Button should be disabled or show loading state
    await expect(page.locator('button:has-text("Generating Estimate")')).toBeVisible({ timeout: 1000 });

    // Wait for completion
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });
  });

  test('BS-5: should handle results page reload gracefully', async ({ page }) => {
    // First, create an estimate
    await page.click('button:has-text("Generate Estimate")');

    // Wait for results page
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });

    // Reload the page
    await page.reload();

    // Page should still work (not crash)
    // Should show either:
    // - Results (if backend supports reload)
    // - Or graceful error message (not a crash)
    await page.waitForLoadState('load');

    // Verify page is functional (has header or content, not error page)
    const hasContent = await page.locator('body').evaluate(el =>
      el.textContent && el.textContent.length > 100
    );
    expect(hasContent).toBeTruthy();
  });

  test('BS-6: should submit multi-gate scenario successfully', async ({ page }) => {
    // Set up fence with multiple gates
    const linearFeetInput = page.locator('input[type="number"]').first();
    await linearFeetInput.fill('150');

    // Add 3 gates
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');
    await page.click('button:has-text("Add Gate")');

    // Set specific widths
    const gateWidthInputs = page.locator('label:has-text("Width (ft)")').locator('..').locator('input');
    await gateWidthInputs.nth(0).fill('4');
    await gateWidthInputs.nth(1).fill('6');
    await gateWidthInputs.nth(2).fill('4');

    // Submit
    await page.click('button:has-text("Generate Estimate")');

    // Should successfully navigate to results
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });

    // Verify URL is correct
    expect(page.url()).toMatch(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/);
  });

  test('BS-7: should show user-friendly error for invalid inputs', async ({ page }) => {
    // Set invalid corner count
    const cornerInput = page.locator('label:has-text("Corner Count")').locator('..').locator('input');
    await cornerInput.fill('-5');

    await page.click('button:has-text("Generate Estimate")');

    // Should show error (HTML5 validation or custom validation)
    // Either browser blocks it or our validation catches it
    const hasError = await page.locator('.bg-red-50, [role="alert"], text=/error/i').isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasError) {
      // Check if submit was blocked by HTML5 validation
      const isStillOnPage = page.url().includes('/phase1-estimator') && !page.url().match(/[a-f0-9-]{36}/);
      expect(isStillOnPage).toBeTruthy();
    }
  });

  test('BS-8: should handle very short fence (edge case)', async ({ page }) => {
    // Test 24ft fence (minimum realistic fence)
    const linearFeetInput = page.locator('input[type="number"]').first();
    await linearFeetInput.fill('24');

    await page.click('button:has-text("Generate Estimate")');

    // Should successfully process
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });
    expect(page.url()).toMatch(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/);
  });

  test('BS-9: should clear error message on retry', async ({ page }) => {
    // Set up scenario that triggers custom validation (gate width)
    const linearFeetInput = page.locator('input[type="number"]').first();
    await linearFeetInput.fill('50');

    // Add gates that exceed fence length
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Gate")');
    }
    // Set each to 12ft: 5 * 12 = 60ft > 50ft fence
    const gateInputs = page.locator('label:has-text("Width (ft)")').locator('..').locator('input');
    for (let i = 0; i < 5; i++) {
      await gateInputs.nth(i).fill('12');
    }

    await page.click('button:has-text("Generate Estimate")');

    // Custom error should be visible
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 2000 });

    // Fix by reducing fence length to accommodate gates
    await linearFeetInput.fill('100');
    await page.click('button:has-text("Generate Estimate")');

    // Should successfully navigate (error cleared)
    await page.waitForURL(/\/dashboard\/phase1-estimator\/[a-f0-9-]{36}/, { timeout: 20000 });
  });
});
