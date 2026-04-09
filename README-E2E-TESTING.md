# Advanced Estimate E2E Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Set Up Test User

Create a test user in Supabase and add credentials to `.env.local`:

```bash
TEST_USER_EMAIL=e2e-test@example.com
TEST_USER_PASSWORD=SecureTestPassword123
```

### 3. Configure Materials

Log in as the test user and configure materials in `/dashboard/materials` so pricing calculations work.

### 4. Run Tests

```bash
# Start development server (in separate terminal)
npm run dev

# Run all E2E tests
npm run test:e2e

# Run tests in interactive UI mode
npm run test:e2e:ui

# View test results
npm run test:e2e:report
```

## What's Tested

### Automated (Playwright)

- ✅ Page load without errors
- ✅ Console error detection
- ✅ Network error monitoring
- ✅ Manual entry form flow
- ✅ Estimate generation
- ✅ BOM display
- ✅ Pricing display

### Manual QA Required

See `docs/advanced-estimate-browser-e2e-audit.md` for comprehensive manual testing checklist covering:

- PDF/Excel exports
- AI extraction accuracy
- Edge cases
- Visual/UX quality
- Performance feel
- Cross-browser compatibility

## Test Structure

```
e2e/
├── fixtures/
│   └── test-data.ts          # Test customer/fence data
├── utils/
│   ├── auth.ts               # Login/logout helpers
│   └── console-monitor.ts    # Error detection
└── phase1-manual-entry.spec.ts  # Smoke tests
```

## Adding New Tests

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './utils/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto('/my-feature');
  });

  test('should do something', async ({ page }) => {
    // Your test
  });
});
```

## Debugging

**Run in UI Mode:**
```bash
npm run test:e2e:ui
```

**Run with Debug:**
```bash
npx playwright test --debug
```

**View Trace:**
```bash
npx playwright show-trace test-results/trace.zip
```

## Documentation

- **Audit Report:** `docs/advanced-estimate-browser-e2e-audit.md`
- **Setup Report:** `docs/advanced-estimate-browser-e2e-fix-report.md`
- **Manual QA Checklist:** See audit report

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

**Tests fail with "User not found":**
- Verify TEST_USER_EMAIL exists in Supabase
- Check credentials in .env.local

**Tests timeout:**
- Ensure dev server is running (`npm run dev`)
- Check if port 3000 is available
- Increase timeout in playwright.config.ts

**Console errors detected:**
- Review test output for error details
- Check browser DevTools for more context
- Fix source code issues

**Network errors:**
- Verify API endpoints are working
- Check Supabase connection
- Review network tab in DevTools

## Support

For issues or questions:
1. Check audit report for known limitations
2. Review test output and screenshots
3. Run in UI mode for interactive debugging
4. Review Playwright documentation: https://playwright.dev
