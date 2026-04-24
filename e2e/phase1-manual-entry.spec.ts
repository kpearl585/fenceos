import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './utils/auth';
import { ConsoleMonitor } from './utils/console-monitor';
import { testCustomer, simpleFenceConfig, singleRun, singleGate } from './fixtures/test-data';

/**
 * PHASE 1 — REAL UI FLOW VERIFICATION
 * Path A: Manual Entry → Generate Estimate
 *
 * Tests the complete flow of creating an estimate from scratch:
 * 1. Navigate to advanced estimate page
 * 2. Fill customer information
 * 3. Configure fence parameters
 * 4. Add runs and gates
 * 5. Generate estimate
 * 6. Verify outputs and UI state
 */

test.describe('Advanced Estimate - Manual Entry Flow', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    // Set up console monitoring
    consoleMonitor = new ConsoleMonitor(page);
    consoleMonitor.startMonitoring();

    // Authenticate
    await loginWithTestUser(page);

    // Navigate to advanced estimate page
    await page.goto('/dashboard/advanced-estimate');
    await page.waitForLoadState('networkidle');
  });

  test('should load advanced estimate page without errors', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('h1:has-text("Advanced Fence Estimator")')).toBeVisible();

    // Check for console errors
    const errors = consoleMonitor.getErrors();
    expect(errors, `Found console errors: ${JSON.stringify(errors)}`).toHaveLength(0);

    // Check for network errors
    const networkErrors = consoleMonitor.getNetworkErrors();
    expect(networkErrors, `Found network errors: ${JSON.stringify(networkErrors)}`).toHaveLength(0);
  });

  test('should complete manual entry flow and generate estimate', async ({ page }) => {
    // Step 1: Fill customer information
    await test.step('Fill customer information', async () => {
      await page.fill('input[name="customerName"]', testCustomer.name);
      await page.fill('input[name="customerEmail"]', testCustomer.email);
      await page.fill('input[name="customerPhone"]', testCustomer.phone);
      await page.fill('input[name="customerAddress"]', testCustomer.address);
    });

    // Step 2: Configure fence type and material
    await test.step('Configure fence parameters', async () => {
      // These selectors will need to match actual UI implementation
      await page.selectOption('select[name="fenceType"]', simpleFenceConfig.fenceType);
      await page.selectOption('select[name="material"]', simpleFenceConfig.material);
      await page.selectOption('select[name="style"]', simpleFenceConfig.style);
      await page.fill('input[name="height"]', simpleFenceConfig.height.toString());
      await page.fill('input[name="postSpacing"]', simpleFenceConfig.postSpacing.toString());
      await page.selectOption('select[name="soilType"]', simpleFenceConfig.soilType);
    });

    // Step 3: Add a run
    await test.step('Add fence run', async () => {
      await page.click('button:has-text("Add Run")');
      await page.fill('input[name="runLength"]', singleRun.length.toString());
      await page.selectOption('select[name="runSlope"]', singleRun.slope);
      await page.selectOption('select[name="runTerrain"]', singleRun.terrain);
    });

    // Step 4: Add a gate
    await test.step('Add gate', async () => {
      await page.click('button:has-text("Add Gate")');
      await page.selectOption('select[name="gateType"]', singleGate.type);
      await page.fill('input[name="gateWidth"]', singleGate.width.toString());
    });

    // Step 5: Generate estimate
    await test.step('Generate estimate', async () => {
      consoleMonitor.clear(); // Clear any warnings from form interactions

      await page.click('button:has-text("Generate Estimate")');

      // Wait for estimate to be generated
      await page.waitForSelector('[data-testid="estimate-results"]', { timeout: 15000 });
    });

    // Step 6: Verify BOM rendered
    await test.step('Verify BOM displayed', async () => {
      const bomTable = page.locator('[data-testid="bom-table"]');
      await expect(bomTable).toBeVisible();

      // Verify key materials appear in BOM
      await expect(page.locator('text="Posts"')).toBeVisible();
      await expect(page.locator('text="Rails"')).toBeVisible();
      await expect(page.locator('text="Pickets"')).toBeVisible();
    });

    // Step 7: Verify pricing displays
    await test.step('Verify pricing displayed', async () => {
      await expect(page.locator('[data-testid="material-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="labor-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-quote"]')).toBeVisible();
    });

    // Step 8: Verify audit trail visible
    await test.step('Verify audit trail', async () => {
      const auditSection = page.locator('[data-testid="audit-trail"]');
      await expect(auditSection).toBeVisible();
    });

    // Step 9: Check for runtime errors
    await test.step('Verify no errors during generation', async () => {
      const errors = consoleMonitor.getErrors();
      expect(errors, `Found console errors during estimate generation: ${JSON.stringify(errors)}`).toHaveLength(0);

      const networkErrors = consoleMonitor.getNetworkErrors();
      const criticalNetworkErrors = networkErrors.filter(e => e.status >= 500);
      expect(criticalNetworkErrors, `Found critical network errors: ${JSON.stringify(criticalNetworkErrors)}`).toHaveLength(0);
    });

    // Step 10: Take screenshot for manual review
    await test.step('Capture final state', async () => {
      await page.screenshot({ path: 'test-results/manual-entry-complete.png', fullPage: true });
    });
  });

  test('should show validation errors for incomplete data', async ({ page }) => {
    // Try to generate without filling required fields
    await page.click('button:has-text("Generate Estimate")');

    // Should show validation errors
    await expect(page.locator('text=/required/i')).toBeVisible({ timeout: 3000 });

    // Should not generate estimate
    await expect(page.locator('[data-testid="estimate-results"]')).not.toBeVisible();
  });
});
