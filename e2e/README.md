Playwright end-to-end flows for FenceOS.

Owner money-path suite:

```bash
TEST_USER_EMAIL='owner@example.com' \
TEST_USER_PASSWORD='...' \
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='...' \
pnpm exec playwright test e2e/owner-money-path.spec.ts
```

What it covers:
- create estimate from the advanced estimator UI
- send quote from the estimate detail page
- accept the quote through the public customer acceptance page
- verify deposit gating
- simulate paid deposit for the Stripe-dependent transition
- convert estimate to job
- start job
- send final invoice and verify job completion

Negative-path suites:

```bash
TEST_USER_EMAIL='owner@example.com' \
TEST_USER_PASSWORD='...' \
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='...' \
pnpm exec playwright test e2e/public-acceptance-negative.spec.ts e2e/authorization-boundaries.spec.ts
```

What they cover:
- invalid or replayed public acceptance attempts are rejected
- unauthenticated invoice API requests are rejected
- foremen cannot send invoices through the API
- foreman job UI does not expose the owner-only `Mark as Paid` action

Notes:
- the suite uses the browser for the real UI flow and the Supabase service role only for setup/assertion/cleanup and for the Stripe-only `deposit_paid` transition
- the test user should be an owner in an org with seeded materials and jobs access
- if you do not already have that user, create it with [setup-e2e-test-user.ts](/Users/pearllabs/OpenClawWorkspace/FenceOS/scripts/setup-e2e-test-user.ts:1)
- if those env vars are missing, the spec is skipped instead of failing
