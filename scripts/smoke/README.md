Smoke test scaffold for public launch checks.

Usage:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run test:smoke
```

Authenticated scaffold:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 \
SMOKE_SESSION_COOKIE='sb-...=...' \
npm run test:smoke:auth
```

`SMOKE_SESSION_COOKIE` should be the full cookie header value from an authenticated owner session in a seeded environment.

Seeded owner money-path flow:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 \
SMOKE_SESSION_COOKIE='sb-...=...' \
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='...' \
npm run test:smoke:owner-flow
```

`test:smoke:owner-flow` uses the authenticated owner session to drive the real rendered forms for:
- draft estimate creation
- quote send
- customer acceptance via the public `/api/accept` route
- deposit gate visibility
- estimate-to-job conversion

It uses the Supabase service role only for setup/inspection/cleanup and to simulate the Stripe webhook-applied `deposit_paid` state so the flow can continue without an external checkout completion.
It also drives the real `Start Job` action and hits the authenticated invoice endpoint to verify `active -> invoice sent -> complete`.

Set `SMOKE_KEEP_DATA=1` if you want the seeded estimate/customer/job left in place for debugging after the run.

Current coverage:
- public login page renders
- unauthenticated dashboard access redirects to login
- public waitlist count endpoint responds
- lead capture rejects invalid payloads
- owner API requires authentication
- authenticated dashboard load using a captured session cookie
- authenticated referral API access
- authenticated settings access check
- seeded owner lifecycle: create estimate, quote, public accept, deposit gate, convert to job, start job, send invoice

Next expansion targets:
- authenticated owner login
- live Stripe checkout-session creation for deposits
- real browser-driven modal coverage for the Mark Paid confirmation UI
