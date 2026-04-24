# Launch Readiness

This repo now contains the minimum code, migration, and smoke-test pieces needed to take FenceOS through a controlled public launch. Use this as the release checklist.

## 1. Environment

Set the values in [.env.example](/Users/pearllabs/OpenClawWorkspace/FenceOS/.env.example:1) for the target environment.

Required before deploy:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `CRON_SECRET`

Required if you use these features:
- `OPENAI_API_KEY` for advanced estimate AI helpers
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` for address autocomplete
- `WAITLIST_NOTIFY_EMAIL` for waitlist signup notifications
- `SUPPORT_EMAIL` for operator-facing contact defaults

## 2. Database

Apply all outstanding migrations before launch. The most important recent ones are:
- [20260424000000_fix_actor_identity_model.sql](/Users/pearllabs/OpenClawWorkspace/FenceOS/supabase/migrations/20260424000000_fix_actor_identity_model.sql:1)
- [20260424001000_add_stripe_webhook_events.sql](/Users/pearllabs/OpenClawWorkspace/FenceOS/supabase/migrations/20260424001000_add_stripe_webhook_events.sql:1)
- [20260424002000_reconcile_launch_readiness_schema.sql](/Users/pearllabs/OpenClawWorkspace/FenceOS/supabase/migrations/20260424002000_reconcile_launch_readiness_schema.sql:1)

The last migration is important for fresh environments because it reconciles repo schema with the shipped code for:
- invoices
- job invoice fields
- material verification status
- waitlist/trial email tracking columns
- email suppressions
- `job_checklists.is_required`

## 3. Release Gates

Run these before every production release:

```bash
npm run lint
npm run build
SMOKE_BASE_URL=https://your-preview-or-prod-host npm run test:smoke
SMOKE_BASE_URL=https://your-preview-or-prod-host \
SMOKE_SESSION_COOKIE='sb-...=...' \
npm run test:smoke:auth
SMOKE_BASE_URL=https://your-preview-or-prod-host \
SMOKE_SESSION_COOKIE='sb-...=...' \
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='...' \
npm run test:smoke:owner-flow
```

The owner-flow smoke now verifies:
- estimate draft creation
- quote send
- public customer acceptance
- deposit gate visibility
- estimate to job conversion
- job start
- invoice generation
- job completion state

## 4. External Systems

Before launch day, verify:
- Stripe webhook endpoint is live and signed with the correct `STRIPE_WEBHOOK_SECRET`
- Resend domain/from-address is verified
- Supabase storage buckets `contracts` and `job-photos` exist with the expected policies
- Cron callers send `CRON_SECRET`

## 5. Manual Checks

Do one live manual pass in a staging environment for:
- customer signs estimate from a real emailed link
- deposit checkout succeeds in Stripe
- webhook flips estimate to `deposit_paid`
- invoice email arrives with a working signed PDF link
- unsubscribe page suppresses future waitlist/trial emails

## 6. Rollout Order

Recommended order:
1. Apply migrations.
2. Deploy preview build.
3. Run all smoke commands.
4. Verify Stripe webhook and cron secrets.
5. Promote to production.
6. Run smoke suite again against production.
