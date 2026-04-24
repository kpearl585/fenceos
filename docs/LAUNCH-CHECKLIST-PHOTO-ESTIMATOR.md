# Launch Checklist — AI Photo Estimator

Tick through this sheet before posting a LinkedIn / outreach link to the world. Items are grouped by timing. You are Kelvin; I am the Orchestrator.

---

## T-24h (day before launch)

### Product verification
- [ ] End-to-end smoke test on `fenceestimatepro.com/try-it` with 3 real yard photos:
  - [ ] Clear daytime ground-level photo — confident result
  - [ ] Aerial / drone photo — rougher result, flags expected
  - [ ] Ambiguous / no-fence photo — should surface the "couldn't identify" 422 message
- [ ] Email capture → Resend email lands in inbox (not spam) within 2 minutes.
- [ ] Click the email claim link → `/claim` renders estimate summary.
- [ ] Sign up via the claim flow → `/onboarding` completes → photo estimate visible in `/dashboard/advanced-estimate/saved`.
- [ ] Mobile test on your phone: iPhone Safari and Android Chrome. Drop zone, upload, result card, email capture.

### Environment
- [ ] Verify Resend sender domain — either `fenceestimatepro.com` verified in Resend dashboard OR `PHOTO_ESTIMATE_EMAIL_FROM` set in Vercel production env to a verified sender.
- [ ] Confirm `OPENAI_API_KEY` in Vercel production — run: `vercel env ls production | grep OPENAI`. Billing healthy at https://platform.openai.com/account/billing.
- [ ] Confirm `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` all in production.
- [ ] Rotate the Resend key that was pasted in the Claude transcript earlier.

### Content + legal
- [ ] `/privacy` updated to cover AI photo processing (included in this PR).
- [ ] `/terms` updated with AI-estimate disclaimer (included in this PR).
- [ ] Skim both pages top-to-bottom; confirm they read in your voice.
- [ ] Support email `support@fenceestimatepro.com` inbox is monitored (redirect to your personal email if needed).

### Observability
- [ ] Open a Supabase SQL editor tab with this pinned query so you can eyeball the funnel:
```sql
SELECT event, COUNT(*) FROM public.photo_estimator_events
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY event;
```
- [ ] Open `photo_estimate_daily_cost` in a second tab to watch spend in real time.
- [ ] Confirm Sentry is receiving events — trigger a test error (intentional 500) and see it appear.

### Social / collateral
- [ ] Branded OG image for `/try-it` is rendering — confirm by pasting the URL in LinkedIn or https://www.opengraph.xyz.
- [ ] Dogfood AR video recorded on your own property (Sprint 1 ask — still open).
- [ ] LinkedIn post drafted (ask Claude for a first draft if needed).

---

## Launch morning

- [ ] Pull `fenceestimatepro.com/try-it` one more time, upload a photo, see result. 2 minutes.
- [ ] Post to LinkedIn / X. Send cold emails to the list.
- [ ] Pin the runbook open in a browser tab for the first few hours: [docs/RUNBOOK-PHOTO-ESTIMATOR.md](./RUNBOOK-PHOTO-ESTIMATOR.md).
- [ ] Tell Claude: "I posted, we're live" — so the next session's memory captures the launch event.

---

## First 24 hours (watch mode)

- [ ] Check `photo_estimator_events` every few hours. Expect: upload_submitted → extraction_returned → email_captured → signup_claimed, each step narrower than the last.
- [ ] Watch `photo_estimate_daily_cost`. If approaching $4, decide: raise the cap, gate behind email, or let it throttle and learn.
- [ ] Watch Sentry for any `email_rebind_rejected` events — an early leak signal.
- [ ] Reply to every support email inside 4 hours during launch day. Real users noticing you care is a retention multiplier.

---

## If something breaks

Open [docs/RUNBOOK-PHOTO-ESTIMATOR.md](./RUNBOOK-PHOTO-ESTIMATOR.md) and follow the matching section. Don't invent a fix — use the one in the runbook. If the runbook doesn't cover it, add a section after you resolve it.

---

## After launch

- [ ] Write a short retro: what worked, what surprised us, what to fix before scaling outreach.
- [ ] If any real user hit an edge case, add their photo (with permission) to `test-fixtures/photos/` and a matching test case to `test-fixtures/ai-extraction-test-dataset.json`.
- [ ] Review `photo_estimator_events` conversion rates. If `email_captured / extraction_returned < 0.1`, rework the result card CTA before spending more outreach effort.

*Last updated: 2026-04-20*
