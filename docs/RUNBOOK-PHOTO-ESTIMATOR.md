# Runbook — Public AI Photo Estimator

When `/try-it` or the claim flow breaks, this is the playbook. Keep it skimmable. Update with every incident.

**Feature surface**
- Public endpoint: `POST /api/public/photo-estimate`
- Public page: `https://fenceestimatepro.com/try-it`
- Claim endpoint: `POST /api/public/photo-estimate/claim`
- Claim page: `/claim?token=<uuid>`
- Cron: `/api/cron/photo-estimate-cleanup` (daily 03:00 UTC)

**Upstreams**
- OpenAI GPT-4o Vision (hard dependency — if down, `/try-it` is down)
- Supabase Storage bucket `photo-estimate-uploads`
- Supabase tables `public_photo_estimates`, `photo_estimate_daily_cost`, `photo_estimator_events`, `fence_graphs`
- Resend (email delivery for claim links)
- Vercel serverless functions (Node.js runtime, 60s maxDuration)

---

## 1. OpenAI outage / quota / rate-limit

**Symptoms**
- Users see *"Our AI estimator is temporarily unavailable"* or similar 503.
- Vercel logs for `/api/public/photo-estimate` show `[photo-estimate] OpenAI error` JSON with `status` 401/403/429/500+.
- `photo_estimator_events` shows `photo_upload_submitted` rows but no matching `extraction_returned`.

**Diagnose**
```bash
# Pull the latest OpenAI error shape
vercel logs fenceestimatepro.com --since 15m | grep "photo-estimate"

# Verify the API key directly
curl -s https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"ok"}],"max_tokens":5}'
```

**Fix**
| Error | Action |
|-------|--------|
| `insufficient_quota` (429) | Top up at https://platform.openai.com/account/billing. Enable auto-recharge. |
| `invalid_api_key` (401) | Rotate in OpenAI dashboard → update `OPENAI_API_KEY` in Vercel env (all scopes) → redeploy. |
| `rate_limit_exceeded` (429) | Short-term traffic spike — either wait, or request a tier increase. |
| `500` / `503` from OpenAI | Monitor https://status.openai.com. If prolonged, toggle a maintenance banner on `/try-it`. |

---

## 2. Daily $ cap tripped

**Symptoms**
- Users see *"The free tier is at capacity for today"* (429).
- `photo_estimate_daily_cost.total_cost_cents >= 500` for today's date.

**Diagnose**
```sql
SELECT date, total_cost_cents, call_count
  FROM public.photo_estimate_daily_cost
  ORDER BY date DESC LIMIT 7;
```

**Fix options**
1. **Legitimate demand spike** — raise the cap: `ALTER FUNCTION public.increment_photo_estimate_cost` is the canonical location. Edit `v_cap`. Consider adding email-gating before the extraction step if spend is durable.
2. **Abuse** — check `public_photo_estimates.ip_address` for spikes from a single IP/range. Tighten per-IP limit in [src/lib/security/rate-limit.ts](src/lib/security/rate-limit.ts) or block the IP at the Vercel firewall.
3. **Reset for the day** (rare): `UPDATE public.photo_estimate_daily_cost SET total_cost_cents = 0, call_count = 0 WHERE date = CURRENT_DATE;`

---

## 3. Claim email never arrived

**Symptoms**
- User entered email on result card, got "Check your inbox" but nothing arrives.
- `photo_estimator_events` shows `email_captured` but user complains.

**Diagnose**
- Check Resend dashboard for bounce/defer/complaint.
- Verify `PHOTO_ESTIMATE_EMAIL_FROM` matches a verified sender. Fallback is `hello@fenceestimatepro.com` — that domain must be verified.
- Vercel logs: `grep "Claim email send failed" /<timerange>`.

**Fix**
- Resend sender not verified → verify in Resend dashboard OR set `PHOTO_ESTIMATE_EMAIL_FROM` in Vercel env vars to a verified one.
- Domain reputation issue → add SPF / DKIM records in the DNS provider.
- Bounce from bad email → no fix needed; user entered a typo.

---

## 4. Signup completes but estimate not in dashboard

**Symptoms**
- User signed up via `/claim` → `/signup` flow but can't see their photo estimate at `/dashboard/advanced-estimate/saved`.
- `photo_estimator_events` is missing the `signup_claimed` row.

**Diagnose**
```sql
-- Trace a specific claim_token through the funnel
SELECT event, created_at, properties
  FROM public.photo_estimator_events
  WHERE claim_token = '<uuid>'
  ORDER BY created_at;

-- Check if the estimate was written
SELECT id, name, claimed_at, claimed_by_user_id, claimed_fence_graph_id
  FROM public.public_photo_estimates
  WHERE claim_token = '<uuid>';
```

**Fix**
- If `public_photo_estimates.claimed_at` is set but no `fence_graphs` row exists for the user → manual transfer via admin SQL or rerun `consumeClaimToken()`.
- If `user.user_metadata.claim_token` is not set on the auth user → the signup action didn't pass it through. Check `src/app/login/actions.ts` signup handler.
- If onboarding was skipped (org already existed) → `consumeClaimToken` never ran. Add the call elsewhere (e.g., dashboard first-load) if this case becomes common.

---

## 5. Bot / scripted-abuse suspicion

**Symptoms**
- `photo_estimator_events.photo_upload_submitted` spike from a narrow IP range.
- Cost cap tripping without matching `email_captured` events.
- `email_rebind_rejected` events appearing at non-zero rate.

**Diagnose**
```sql
-- Top IPs by upload volume in the last hour
SELECT (properties->>'ip_address')::inet AS ip, COUNT(*) AS uploads
  FROM public.photo_estimator_events
  WHERE event = 'photo_upload_submitted'
    AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY ip
  ORDER BY uploads DESC
  LIMIT 10;
```

**Fix**
- Block IPs at Vercel firewall.
- Drop per-IP rate from 3/24h to 1/24h in [src/lib/security/rate-limit.ts](src/lib/security/rate-limit.ts).
- If sustained, integrate Vercel BotID on `/try-it` (install + env var setup — ~30 min).

---

## 6. Site-wide prod outage (Vercel or Supabase down)

**Symptoms**
- Every route returning 500 / 502 / timeout.
- `https://status.vercel.com` or `https://status.supabase.com` shows incident.

**Fix**
- Wait for upstream resolution.
- Communicate with users: tweet from the brand account (when it exists) or pin a maintenance banner on the homepage.
- Post-mortem: record in `docs/INCIDENTS/YYYY-MM-DD-<short-slug>.md` with timeline, impact, resolution, follow-ups.

---

## 7. "I'm seeing a generic 500"

**Symptoms**
- User error message: *"We couldn't process your photo right now. Please try again in a moment."*
- This is the fallback in the route handler when neither Zod, OpenAI, nor cost-cap branches caught the error.

**Diagnose**
- `vercel logs fenceestimatepro.com --since 5m | grep "POST /api/public/photo-estimate error"` — the full stack trace is in this console.error line.
- Sentry: filter `phase:sprint_2_photo_estimator step:photo_estimate`.

**Fix**
- Add a more specific catch to the route if the failure mode repeats.
- If it's a storage upload failure, check Supabase bucket permissions.

---

## Alerting (set these up, not yet configured)

- Sentry alert: `phase:sprint_2_photo_estimator` with >= 5 events in 10 min → Slack or email.
- Supabase alert: `total_cost_cents >= 400` (80% of cap) on `photo_estimate_daily_cost` for today → email.
- Resend webhook → internal endpoint that logs bounces to Sentry.

*Last updated: 2026-04-20*
