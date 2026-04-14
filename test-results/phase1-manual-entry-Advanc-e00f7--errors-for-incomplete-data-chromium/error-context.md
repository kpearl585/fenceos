# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase1-manual-entry.spec.ts >> Advanced Estimate - Manual Entry Flow >> should show validation errors for incomplete data
- Location: e2e/phase1-manual-entry.spec.ts:133:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Generate Estimate")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - generic [ref=e8]: FenceEstimatePro
      - generic [ref=e9]:
        - paragraph [ref=e10]: Organization
        - paragraph [ref=e11]: e2e-test's Org
      - navigation [ref=e12]:
        - link "Overview" [ref=e13] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e14]
          - text: Overview
        - link "Customers" [ref=e17] [cursor=pointer]:
          - /url: /dashboard/customers
          - img [ref=e18]
          - text: Customers
        - link "Estimates" [ref=e23] [cursor=pointer]:
          - /url: /dashboard/estimates
          - img [ref=e24]
          - text: Estimates
        - link "Adv. Estimate" [ref=e26] [cursor=pointer]:
          - /url: /dashboard/advanced-estimate
          - img [ref=e27]
          - text: Adv. Estimate
        - link "Phase 1" [ref=e30] [cursor=pointer]:
          - /url: /dashboard/phase1-estimator
          - img [ref=e31]
          - text: Phase 1
        - link "Jobs" [ref=e33] [cursor=pointer]:
          - /url: /dashboard/jobs
          - img [ref=e34]
          - text: Jobs
        - link "Leads" [ref=e37] [cursor=pointer]:
          - /url: /dashboard/leads
          - img [ref=e38]
          - text: Leads
        - link "Materials" [ref=e41] [cursor=pointer]:
          - /url: /dashboard/materials
          - img [ref=e42]
          - text: Materials
        - link "P&L" [ref=e45] [cursor=pointer]:
          - /url: /dashboard/owner
          - img [ref=e46]
          - text: P&L
        - link "Settings" [ref=e47] [cursor=pointer]:
          - /url: /dashboard/settings
          - img [ref=e48]
          - text: Settings
      - paragraph [ref=e52]: FenceEstimatePro v1.0
    - banner [ref=e53]:
      - generic [ref=e54]:
        - link "New Estimate" [ref=e55] [cursor=pointer]:
          - /url: /dashboard/estimates/new
          - img [ref=e56]
          - text: New Estimate
        - generic [ref=e58]:
          - generic [ref=e59]: E
          - generic [ref=e60]:
            - paragraph [ref=e61]: e2e-test
            - text: Owner
        - button "Sign out" [ref=e63] [cursor=pointer]
    - generic [ref=e65]:
      - generic [ref=e66]: 14 days left in your free trial
      - link "Upgrade Now" [ref=e67] [cursor=pointer]:
        - /url: /dashboard/upgrade
    - main [ref=e68]:
      - main [ref=e70]:
        - generic [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]: Beta
              - heading "Advanced Fence Estimator" [level=1] [ref=e75]
            - paragraph [ref=e76]: Run-based estimation engine. Add each fence segment individually for professional-grade accuracy with full material traceability.
            - link "View Saved Estimates →" [ref=e78] [cursor=pointer]:
              - /url: /dashboard/advanced-estimate/saved
            - generic [ref=e79]:
              - generic [ref=e80]: No material prices found.
              - generic [ref=e81]:
                - text: Quantities will be accurate but dollar amounts will show $0. Set unit costs in
                - link "Materials" [ref=e82] [cursor=pointer]:
                  - /url: /dashboard/materials
                - text: to enable cost and bid pricing.
          - generic [ref=e83]:
            - generic [ref=e84]:
              - generic [ref=e85]:
                - button "Manual Input" [ref=e86] [cursor=pointer]
                - button "AI Input" [ref=e87] [cursor=pointer]:
                  - img [ref=e88]
                  - text: AI Input
              - generic [ref=e90]:
                - heading "Project Setup" [level=2] [ref=e91]
                - generic [ref=e92]:
                  - generic [ref=e93]:
                    - generic [ref=e94]: Project Name
                    - textbox "e.g. Smith Residence — Backyard Privacy" [ref=e95]: New Estimate
                  - generic [ref=e96]:
                    - generic [ref=e97]: Fence Type
                    - generic [ref=e98]:
                      - button "Vinyl" [ref=e99] [cursor=pointer]
                      - button "Wood" [ref=e100] [cursor=pointer]
                      - button "Chain Link" [ref=e101] [cursor=pointer]
                      - button "Aluminum / Ornamental" [ref=e102] [cursor=pointer]
                  - generic [ref=e103]:
                    - generic [ref=e104]: Product / Height
                    - combobox [ref=e105]:
                      - option "Vinyl Privacy 6ft" [selected]
                      - option "Vinyl Privacy 8ft"
                      - option "Vinyl Picket 4ft"
                      - option "Vinyl Picket 6ft"
                  - generic [ref=e106]:
                    - generic [ref=e107]: Soil Type
                    - combobox [ref=e108]:
                      - option "Standard / Mixed"
                      - option "Clay (firm)"
                      - option "Rocky / Caliche"
                      - option "Sandy Loam (FL inland)" [selected]
                      - option "Sandy (FL coastal)"
                      - option "Wet / High Water Table"
                  - generic [ref=e109]:
                    - generic [ref=e110]: Labor Rate ($/hr)
                    - spinbutton [ref=e111]: "65"
                  - generic [ref=e112]:
                    - generic [ref=e113]: Waste Factor (%)
                    - spinbutton [ref=e114]: "5"
                  - generic [ref=e115]:
                    - generic [ref=e116]: Markup Over Cost (%)
                    - spinbutton [ref=e117]: "35"
                - generic [ref=e118]:
                  - button [ref=e119] [cursor=pointer]
                  - generic [ref=e121]: Wind Mode / Hurricane Zone
              - generic [ref=e122]:
                - generic [ref=e123]:
                  - generic [ref=e124]:
                    - heading "Fence Runs" [level=2] [ref=e125]
                    - paragraph [ref=e126]: Add each straight segment between structural breaks (corners, gates, ends)
                  - generic [ref=e127]:
                    - paragraph [ref=e128]: Total
                    - paragraph [ref=e129]: 0 LF
                - generic [ref=e131]:
                  - generic [ref=e132]:
                    - generic [ref=e133]: Run 1
                    - button "Remove" [ref=e134] [cursor=pointer]
                  - generic [ref=e135]:
                    - generic [ref=e136]:
                      - generic [ref=e137]: Linear Feet
                      - spinbutton [ref=e138]
                    - generic [ref=e139]:
                      - generic [ref=e140]: Start
                      - combobox [ref=e141]:
                        - option "End" [selected]
                        - option "Corner"
                        - option "Gate"
                    - generic [ref=e142]:
                      - generic [ref=e143]: End
                      - combobox [ref=e144]:
                        - option "End" [selected]
                        - option "Corner"
                        - option "Gate"
                    - generic [ref=e145]:
                      - generic [ref=e146]: Slope (deg)
                      - spinbutton [ref=e147]
                  - button "+ Add gate after this run" [ref=e148] [cursor=pointer]
                - button "+ Add Run" [ref=e149] [cursor=pointer]
              - generic [ref=e150]:
                - heading "Customer Info" [level=2] [ref=e151]
                - paragraph [ref=e152]: Optional — populates the customer proposal PDF
                - generic [ref=e153]:
                  - generic [ref=e154]:
                    - generic [ref=e155]: Customer Name
                    - textbox "Jane Smith" [ref=e156]
                  - generic [ref=e157]:
                    - generic [ref=e158]: Street Address
                    - textbox "123 Main St" [ref=e159]
                  - generic [ref=e160]:
                    - generic [ref=e161]: City, State, Zip
                    - textbox "Orlando, FL 32801" [ref=e162]
                  - generic [ref=e163]:
                    - generic [ref=e164]: Phone
                    - textbox "(555) 000-0000" [ref=e165]
            - paragraph [ref=e168]: Add at least one run with a length to generate an estimate.
    - button "Help" [ref=e169] [cursor=pointer]: "?"
    - generic [ref=e170]:
      - generic [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]: Help Center
          - generic [ref=e174]: FenceEstimatePro
        - button "x" [ref=e175] [cursor=pointer]
      - generic [ref=e176]:
        - generic [ref=e177]: Quick Actions
        - generic [ref=e178]:
          - link "New Estimate" [ref=e179] [cursor=pointer]:
            - /url: /dashboard/estimates/new
          - link "Add Customer" [ref=e180] [cursor=pointer]:
            - /url: /dashboard/customers/new
          - link "View Jobs" [ref=e181] [cursor=pointer]:
            - /url: /dashboard/jobs
          - link "Upgrade Plan" [ref=e182] [cursor=pointer]:
            - /url: /dashboard/upgrade
      - generic [ref=e183]:
        - generic [ref=e184]:
          - generic [ref=e185]: Getting Started
          - button "How do I create my first estimate? ▼" [ref=e187] [cursor=pointer]:
            - generic [ref=e188]: How do I create my first estimate?
            - generic [ref=e189]: ▼
          - button "How do I add a customer? ▼" [ref=e191] [cursor=pointer]:
            - generic [ref=e192]: How do I add a customer?
            - generic [ref=e193]: ▼
          - button "How do I invite a team member? ▼" [ref=e195] [cursor=pointer]:
            - generic [ref=e196]: How do I invite a team member?
            - generic [ref=e197]: ▼
        - generic [ref=e198]:
          - generic [ref=e199]: Estimates
          - button "How do I send an estimate to a customer? ▼" [ref=e201] [cursor=pointer]:
            - generic [ref=e202]: How do I send an estimate to a customer?
            - generic [ref=e203]: ▼
          - button "What happens when a customer accepts? ▼" [ref=e205] [cursor=pointer]:
            - generic [ref=e206]: What happens when a customer accepts?
            - generic [ref=e207]: ▼
          - button "Can I edit an estimate after sending? ▼" [ref=e209] [cursor=pointer]:
            - generic [ref=e210]: Can I edit an estimate after sending?
            - generic [ref=e211]: ▼
        - generic [ref=e212]:
          - generic [ref=e213]: Jobs
          - button "How does the job board work? ▼" [ref=e215] [cursor=pointer]:
            - generic [ref=e216]: How does the job board work?
            - generic [ref=e217]: ▼
          - button "How do I assign a foreman? ▼" [ref=e219] [cursor=pointer]:
            - generic [ref=e220]: How do I assign a foreman?
            - generic [ref=e221]: ▼
          - button "How do I handle change orders? ▼" [ref=e223] [cursor=pointer]:
            - generic [ref=e224]: How do I handle change orders?
            - generic [ref=e225]: ▼
        - generic [ref=e226]:
          - generic [ref=e227]: Billing & Account
          - button "How do I upgrade my plan? ▼" [ref=e229] [cursor=pointer]:
            - generic [ref=e230]: How do I upgrade my plan?
            - generic [ref=e231]: ▼
          - button "How do I cancel my subscription? ▼" [ref=e233] [cursor=pointer]:
            - generic [ref=e234]: How do I cancel my subscription?
            - generic [ref=e235]: ▼
          - button "I have a question not answered here. ▼" [ref=e237] [cursor=pointer]:
            - generic [ref=e238]: I have a question not answered here.
            - generic [ref=e239]: ▼
        - generic [ref=e240]:
          - generic [ref=e241]: Still need help?
          - generic [ref=e242]: We typically respond within 1 business day.
          - link "support@fenceestimatepro.com →" [ref=e243] [cursor=pointer]:
            - /url: mailto:support@fenceestimatepro.com
  - button "Open Next.js Dev Tools" [ref=e249] [cursor=pointer]:
    - img [ref=e250]
  - alert [ref=e253]
```

# Test source

```ts
  35  |   test('should load advanced estimate page without errors', async ({ page }) => {
  36  |     // Verify page loaded
  37  |     await expect(page.locator('h1:has-text("Advanced Fence Estimator")')).toBeVisible();
  38  | 
  39  |     // Check for console errors
  40  |     const errors = consoleMonitor.getErrors();
  41  |     expect(errors, `Found console errors: ${JSON.stringify(errors)}`).toHaveLength(0);
  42  | 
  43  |     // Check for network errors
  44  |     const networkErrors = consoleMonitor.getNetworkErrors();
  45  |     expect(networkErrors, `Found network errors: ${JSON.stringify(networkErrors)}`).toHaveLength(0);
  46  |   });
  47  | 
  48  |   test('should complete manual entry flow and generate estimate', async ({ page }) => {
  49  |     // Step 1: Fill customer information
  50  |     await test.step('Fill customer information', async () => {
  51  |       await page.fill('input[name="customerName"]', testCustomer.name);
  52  |       await page.fill('input[name="customerEmail"]', testCustomer.email);
  53  |       await page.fill('input[name="customerPhone"]', testCustomer.phone);
  54  |       await page.fill('input[name="customerAddress"]', testCustomer.address);
  55  |     });
  56  | 
  57  |     // Step 2: Configure fence type and material
  58  |     await test.step('Configure fence parameters', async () => {
  59  |       // These selectors will need to match actual UI implementation
  60  |       await page.selectOption('select[name="fenceType"]', simpleFenceConfig.fenceType);
  61  |       await page.selectOption('select[name="material"]', simpleFenceConfig.material);
  62  |       await page.selectOption('select[name="style"]', simpleFenceConfig.style);
  63  |       await page.fill('input[name="height"]', simpleFenceConfig.height.toString());
  64  |       await page.fill('input[name="postSpacing"]', simpleFenceConfig.postSpacing.toString());
  65  |       await page.selectOption('select[name="soilType"]', simpleFenceConfig.soilType);
  66  |     });
  67  | 
  68  |     // Step 3: Add a run
  69  |     await test.step('Add fence run', async () => {
  70  |       await page.click('button:has-text("Add Run")');
  71  |       await page.fill('input[name="runLength"]', singleRun.length.toString());
  72  |       await page.selectOption('select[name="runSlope"]', singleRun.slope);
  73  |       await page.selectOption('select[name="runTerrain"]', singleRun.terrain);
  74  |     });
  75  | 
  76  |     // Step 4: Add a gate
  77  |     await test.step('Add gate', async () => {
  78  |       await page.click('button:has-text("Add Gate")');
  79  |       await page.selectOption('select[name="gateType"]', singleGate.type);
  80  |       await page.fill('input[name="gateWidth"]', singleGate.width.toString());
  81  |     });
  82  | 
  83  |     // Step 5: Generate estimate
  84  |     await test.step('Generate estimate', async () => {
  85  |       consoleMonitor.clear(); // Clear any warnings from form interactions
  86  | 
  87  |       await page.click('button:has-text("Generate Estimate")');
  88  | 
  89  |       // Wait for estimate to be generated
  90  |       await page.waitForSelector('[data-testid="estimate-results"]', { timeout: 15000 });
  91  |     });
  92  | 
  93  |     // Step 6: Verify BOM rendered
  94  |     await test.step('Verify BOM displayed', async () => {
  95  |       const bomTable = page.locator('[data-testid="bom-table"]');
  96  |       await expect(bomTable).toBeVisible();
  97  | 
  98  |       // Verify key materials appear in BOM
  99  |       await expect(page.locator('text="Posts"')).toBeVisible();
  100 |       await expect(page.locator('text="Rails"')).toBeVisible();
  101 |       await expect(page.locator('text="Pickets"')).toBeVisible();
  102 |     });
  103 | 
  104 |     // Step 7: Verify pricing displays
  105 |     await test.step('Verify pricing displayed', async () => {
  106 |       await expect(page.locator('[data-testid="material-total"]')).toBeVisible();
  107 |       await expect(page.locator('[data-testid="labor-total"]')).toBeVisible();
  108 |       await expect(page.locator('[data-testid="total-quote"]')).toBeVisible();
  109 |     });
  110 | 
  111 |     // Step 8: Verify audit trail visible
  112 |     await test.step('Verify audit trail', async () => {
  113 |       const auditSection = page.locator('[data-testid="audit-trail"]');
  114 |       await expect(auditSection).toBeVisible();
  115 |     });
  116 | 
  117 |     // Step 9: Check for runtime errors
  118 |     await test.step('Verify no errors during generation', async () => {
  119 |       const errors = consoleMonitor.getErrors();
  120 |       expect(errors, `Found console errors during estimate generation: ${JSON.stringify(errors)}`).toHaveLength(0);
  121 | 
  122 |       const networkErrors = consoleMonitor.getNetworkErrors();
  123 |       const criticalNetworkErrors = networkErrors.filter(e => e.status >= 500);
  124 |       expect(criticalNetworkErrors, `Found critical network errors: ${JSON.stringify(criticalNetworkErrors)}`).toHaveLength(0);
  125 |     });
  126 | 
  127 |     // Step 10: Take screenshot for manual review
  128 |     await test.step('Capture final state', async () => {
  129 |       await page.screenshot({ path: 'test-results/manual-entry-complete.png', fullPage: true });
  130 |     });
  131 |   });
  132 | 
  133 |   test('should show validation errors for incomplete data', async ({ page }) => {
  134 |     // Try to generate without filling required fields
> 135 |     await page.click('button:has-text("Generate Estimate")');
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  136 | 
  137 |     // Should show validation errors
  138 |     await expect(page.locator('text=/required/i')).toBeVisible({ timeout: 3000 });
  139 | 
  140 |     // Should not generate estimate
  141 |     await expect(page.locator('[data-testid="estimate-results"]')).not.toBeVisible();
  142 |   });
  143 | });
  144 | 
```