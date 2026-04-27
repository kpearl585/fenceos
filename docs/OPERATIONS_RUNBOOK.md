# Operations Runbook

## Core Scheduled Jobs

These routes are intended for cron/invocation with `CRON_SECRET`:
- [expire-estimates](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/cron/expire-estimates/route.ts:1)
- [trial-emails](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/cron/trial-emails/route.ts:1)
- [waitlist-sequence](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/cron/waitlist-sequence/route.ts:1)

Expected cadence:
- `expire-estimates`: daily
- `trial-emails`: daily
- `waitlist-sequence`: daily

## High-Risk Revenue Paths

Watch these first after every deploy:
- [Stripe webhook](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/stripe/webhook/route.ts:1)
- [Customer acceptance](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/accept/route.ts:1)
- [Invoice generation](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/lib/jobs/invoice.ts:1)
- [Deposit checkout creation](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/lib/stripe/createDepositCheckoutSession.ts:1)

## Incident Response

### Stripe deposits not moving estimates forward

Check:
- webhook delivery status in Stripe
- `stripe_webhook_events` rows for duplicate or failed events
- estimate row fields: `stripe_checkout_session_id`, `stripe_payment_status`, `deposit_paid`, `deposit_paid_at`

If the checkout succeeded in Stripe but the estimate did not update:
1. fix the webhook configuration
2. replay the Stripe event
3. confirm the estimate moved to `deposit_paid`

### Invoices not generating

Check:
- the job is in `active`
- the [invoice API route](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/api/jobs/[id]/invoice/route.ts:1) returns `200`
- the `contracts` bucket accepted the PDF upload
- the `invoices` table contains a row for the job
- the job row has `invoice_url`, `paid_at`, and `completed_at`

### Marketing emails should stop for a recipient

Check:
- the suppression row exists in `email_suppressions`
- the unsubscribe page at [unsubscribe](/Users/pearllabs/OpenClawWorkspace/FenceOS/src/app/unsubscribe/page.tsx:1) confirms success
- trial and waitlist cron runs are skipping suppressed addresses

## Backup / Recovery

Minimum operational posture:
- enable daily managed database backups in Supabase
- confirm storage retention/backups for `contracts` and `job-photos`
- keep a copy of every production migration applied
- before any risky migration, take a fresh backup or database snapshot

Recovery order after a bad deploy:
1. stop cron jobs if they are mutating bad state
2. roll back application deploy
3. inspect recent migrations and data writes
4. restore database/storage only if rollback is insufficient
5. rerun smoke tests before reopening traffic

## Post-Deploy Checks

Immediately after production deploy:
1. load `/login`
2. load `/unsubscribe`
3. run `npm run test:smoke`
4. run `npm run test:smoke:auth`
5. run `npm run test:smoke:owner-flow`
6. verify one webhook and one cron route manually if this was an infra change
