# Sprint 2 Orchestration — AI Photo Estimator (Public Free Tier)

**Sprint goal:** Anyone at `fenceestimatepro.com/try-it` uploads a photo of a yard and gets a structured fence estimate in under 30 seconds. Email capture on the result screen feeds the signup funnel.

**Duration estimate:** 3-5 days of build (battle plan originally scoped 2 weeks; audit reduced scope by ~80% — extraction pipeline already exists).

**Branch:** `claude/sprint-2-photo-estimator`
**Worktree:** `/Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/sprint-2-photo-estimator`

---

## Decisions locked (Kelvin 2026-04-19)

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| AI provider | **Reuse OpenAI GPT-4o** (existing stack) | 80% of pipeline already built; switch to Claude later if needed |
| Access model | **Truly public, email on result** | Maximize funnel top; capture on value moment |
| Daily cost ceiling | **$5/day (~300 estimates)** for first 30 days, then reassess | Abuse protection with runway headroom |
| Rate limit infra | **In-memory per-IP + Postgres daily $ counter** | Redis deferred until abuse materializes |

---

## What's already built (reused — do NOT rewrite)

These exist in production and Sprint 2 wraps/reuses them:

| Asset | Location | What it provides |
|-------|----------|------------------|
| System prompt with image support | [src/lib/fence-graph/ai-extract/prompt.ts](src/lib/fence-graph/ai-extract/prompt.ts) | `USER_PROMPT_IMAGE(base64, mimeType, additionalText?)` at line 180 already accepts photos. Rule #9 already handles aerial/satellite views. |
| Zod + OpenAI JSON Schema | [src/lib/fence-graph/ai-extract/schema.ts](src/lib/fence-graph/ai-extract/schema.ts) | `ExtractionSchema`, `validateExtraction()`, `EXTRACTION_JSON_SCHEMA` for `response_format` |
| BOM engine | [src/lib/fence-graph/engine.ts](src/lib/fence-graph/engine.ts) | `estimateFence(input, options) → FenceEstimateResult` |
| Test harness | [scripts/test-ai-extraction.ts](scripts/test-ai-extraction.ts) | 12 text scenarios; extend with 3-5 image scenarios |
| Rate limiter | [src/lib/security/rate-limit.ts](src/lib/security/rate-limit.ts) | In-memory `Map`; supports both org-keyed and IP-keyed limits |
| OpenAI client | `openai` v6.25.0 in package.json | Already installed |
| Image utils | `sharp` v0.34.5 in package.json | Server-side downsize before API call |
| Email sending | `resend` v6.9.3 in package.json | For welcome/claim emails |

---

## What's new (build this sprint)

### Data layer (one migration)
1. Table `public_photo_estimates` — anonymous estimates with `claim_token UUID` + `ip_address`, `user_agent`, `image_storage_path`, `extraction_json`, `estimate_json`, `created_at`, `claimed_at`, `claimed_by_user_id`, `email_captured_at`, `email`.
2. Table `photo_estimate_daily_cost` — single-row-per-day counter: `date DATE PK`, `total_cost_cents INT`, `call_count INT`, `last_updated_at TIMESTAMPTZ`. Atomic upsert on each Vision call.
3. Storage bucket `photo-estimate-uploads` — private, 7-day TTL (cron purge).
4. RPC `increment_photo_estimate_cost(cents INT)` — atomic update with `FOR UPDATE` lock; returns new total; refuses if over daily cap.

### API layer
1. `POST /api/public/photo-estimate` — multipart form data, returns `{ claim_token, extraction, estimate, displayMarkdown }`.
2. `POST /api/public/photo-estimate/claim` — `{ claim_token, email, password? }` → creates user/org if new, transfers estimate to `fence_graphs`.

### Server helpers
1. `src/lib/ai-extract/publicExtractFromImage.ts` — wraps existing prompt + schema for public/anonymous flow (no auth, no org context).
2. `src/lib/security/rate-limit.ts` — add `photoEstimatePublic: (ip: string)` limiter (3 calls / 24h / IP).
3. `src/lib/validation/photo-estimate-schemas.ts` — request/response Zod schemas.

### UI
1. `src/app/try-it/page.tsx` — public landing page.
2. `src/app/try-it/PhotoUploadForm.tsx` — upload + preview + submit.
3. `src/app/try-it/ResultCard.tsx` — estimate display + email capture.
4. Homepage CTA update (existing landing page) — "Try our AI Photo Estimator" hero button.

---

## Architecture

```
[Homepage hero]
   ↓
[/try-it landing page]
   ↓ user selects photo, optional text hint
[Client: validate size (≤8MB) and MIME (image/jpeg|png|webp)]
   ↓ multipart form POST
[POST /api/public/photo-estimate]
   │
   ├─ per-IP rate limit (3 / 24h / IP) — reject if throttled
   ├─ daily $ cost cap (Postgres atomic check) — reject if over $5/day
   ├─ upload original to `photo-estimate-uploads` bucket (path: YYYY-MM-DD/uuid.jpg)
   ├─ sharp: resize to max 1024px longest side, JPEG quality 85
   ├─ base64-encode downsized image
   ├─ call OpenAI GPT-4o with USER_PROMPT_IMAGE + response_format: json_schema
   ├─ validateExtraction(raw) → blockers / warnings / data
   ├─ if blocked: return 422 { error, blockers, flags }
   ├─ estimateFence(data, { laborRatePerHr: 75, wastePct: 0.10, priceMap: {} })
   ├─ increment_photo_estimate_cost(cents from token usage) — atomic
   ├─ insert public_photo_estimates row with claim_token
   └─ return { claim_token, extraction, estimate, displayMarkdown }
   ↓
[ResultCard renders]
   - Total linear feet
   - Recommended fence type + productLineId
   - Gate count and types
   - Rough price range (result.totalCost × [0.85, 1.15])
   - Confidence score + flags
   - [Email capture form: "Save your estimate and get the full proposal"]
   - [Signup CTA: "Start free trial"]
   ↓ user enters email
[POST /api/public/photo-estimate/claim]
   └─ creates user/org via Supabase Auth (magic link signup OR password)
   └─ transfers public_photo_estimates row → fence_graphs row
   └─ sends welcome email via Resend with dashboard link
   ↓
[Dashboard — user now has their first estimate saved]
```

---

## Codebase gotchas this sprint must respect

From Sprint 1 audit + fresh reads:

| Fact | Implication |
|------|-------------|
| Next.js 16 route params are `Promise<...>` — use `{ params }: { params: Promise<{ x: string }> }` with `await params` | All new API routes follow this pattern |
| Next 16 middleware is now `proxy.ts` (not `middleware.ts`) and runs at runtime, not edge-only | Public route needs env vars in `preview` scope too, not just production |
| Rate limiter is in-memory `Map` — does NOT sync across Vercel Fluid Compute instances | Per-IP limit is best-effort; daily $ cap in Postgres is the real protection |
| Zod uses `err.issues`, not `err.errors` | Copy the pattern from `src/app/dashboard/advanced-estimate/actions.ts:195` |
| Supabase clients: `createClient()` (RLS) vs `createAdminClient()` (service role) | Public endpoints use `createAdminClient()` after validating the request |
| Error handling convention: sanitize DB errors, never leak to client | `return { error: "An error occurred. Please try again." }` pattern |
| Sentry tags pattern: `tags: { phase: 'sprint_2_photo_estimator', step: '...' }` | Use consistent tags for post-deploy monitoring |
| Design system: fence-palette (`bg-fence-950`, `bg-fence-600`, white cards) — NOT the `#080808` dark theme | Match the quote portal style from [src/components/ShareQuoteButton.tsx](src/components/ShareQuoteButton.tsx) |
| Pre-commit hook runs `npm run build` | Every commit must compile |
| Existing AI extraction is NOT public-facing — `saveAdvancedEstimate()` requires auth | Sprint 2 wraps a new public helper that reuses prompt + schema but bypasses billing gate |

---

## Wave plan

Because the extraction pipeline is reused, Wave 1 is smaller than Sprint 1's was. Work in the existing worktree: `.claude/worktrees/sprint-2-photo-estimator`.

```
WAVE 1 (3 parallel — ~90 min)
├── Session A: Database migration (tables + bucket + RPC)
├── Session B: Public API route + rate limit + cost cap + pipeline helper
└── Session C: Public UI (page, form, result card — no email capture yet)

WAVE 2 (2 parallel — ~60 min, after Wave 1 merges)
├── Session D: Email capture + claim API + welcome email (Resend)
└── Session E: Homepage hero CTA integration

WAVE 3 (me — ~60 min)
├── Extend test harness with 3 image scenarios
├── Local smoke test with 5 sample yard photos (Kelvin provides)
├── Vercel preview deploy + verify env vars
└── Production deploy + monitor Sentry/cost counter for 24h

WAVE 4 (Kelvin, in parallel, throughout sprint)
├── Take 5-10 reference yard photos for testing (clear, aerial, messy, sketch)
├── Dogfood Sprint 1 AR on your property, record 90-sec walkthrough
└── Draft LinkedIn launch post ("Tried my own fence-estimate AI") — I can write draft
```

---

## Session A — Database migration

**File allowlist:**
- `supabase/migrations/20260420010000_photo_estimator_foundation.sql` (create)

**Contents:**

1. Table `public_photo_estimates`:
   - `id UUID PK DEFAULT gen_random_uuid()`
   - `claim_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid()`
   - `ip_address INET`
   - `user_agent TEXT`
   - `image_storage_path TEXT NOT NULL`
   - `extraction_json JSONB NOT NULL` (full `ExtractionSchema` output)
   - `estimate_json JSONB NOT NULL` (full `FenceEstimateResult`)
   - `email TEXT`
   - `email_captured_at TIMESTAMPTZ`
   - `claimed_at TIMESTAMPTZ`
   - `claimed_by_user_id UUID REFERENCES auth.users(id)`
   - `claimed_fence_graph_id UUID REFERENCES fence_graphs(id)` ON DELETE SET NULL
   - `openai_cost_cents INTEGER` (record actual cost per call for reporting)
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Indexes: `(claim_token)`, `(ip_address, created_at DESC)`, `(email)` WHERE `email IS NOT NULL`
   - RLS: enabled
   - Policy: authenticated users can SELECT their own (`claimed_by_user_id = auth.uid()`)
   - Policy: service_role bypasses (anonymous flow uses `createAdminClient()`)

2. Table `photo_estimate_daily_cost`:
   - `date DATE PRIMARY KEY`
   - `total_cost_cents INTEGER NOT NULL DEFAULT 0`
   - `call_count INTEGER NOT NULL DEFAULT 0`
   - `last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - RLS: enabled, no policies (service_role only)

3. Function `public.increment_photo_estimate_cost(p_cents INTEGER) RETURNS JSONB`:
   - `SECURITY DEFINER`, `SET search_path = public, pg_catalog`
   - Use `ON CONFLICT (date) DO UPDATE` upsert with atomic increment
   - Cap check: if `new total_cost_cents > 500` (i.e., $5.00), raise `exception 'DAILY_COST_CAP_EXCEEDED'`
   - Return `{ total_cost_cents, call_count, remaining_cents }`

4. Storage bucket `photo-estimate-uploads`:
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES
     ('photo-estimate-uploads', 'photo-estimate-uploads', false)
   ON CONFLICT (id) DO NOTHING;
   ```
   - Storage RLS: no public policies (service_role only writes; reads via signed URLs from server).

5. Cleanup cron (document only, set up in Wave 3):
   - Daily job: delete `public_photo_estimates` older than 30 days that are `claimed_at IS NULL`.
   - Daily job: delete storage objects in `photo-estimate-uploads` older than 7 days.

**Run through Supabase MCP `apply_migration`, not `execute_sql`.**

**Commit message:** `feat(photo-estimator): database foundation for public AI Photo Estimator`

---

## Session B — Server-side pipeline

**File allowlist:**
- `src/app/api/public/photo-estimate/route.ts` (create)
- `src/lib/ai-extract/publicExtractFromImage.ts` (create)
- `src/lib/security/rate-limit.ts` (ADD one new limiter; preserve all existing)
- `src/lib/validation/photo-estimate-schemas.ts` (create)

**API spec for `POST /api/public/photo-estimate`:**

Request: `multipart/form-data` with:
- `image` (File, required, MIME `image/jpeg`, `image/png`, `image/webp`, max 8MB)
- `additionalContext` (string, optional, max 500 chars — contractor notes alongside photo)
- `locationHint` (string, optional, max 100 chars — "Tampa, FL" for soil defaulting)

Response (200):
```ts
{
  claim_token: string;        // UUID
  extraction: {               // full ExtractionSchema output
    runs: Run[];
    confidence: number;
    flags: string[];
    rawSummary: string;
  };
  estimate: {
    totalLinearFeet: number;
    totalCost: number;
    priceRangeLow: number;    // 0.85 × totalCost
    priceRangeHigh: number;   // 1.15 × totalCost
    bomSummary: string;       // human-readable 1-2 sentence summary
    fenceTypeLabel: string;   // "Wood Privacy, 6ft"
    gateCount: number;
  };
  displayMarkdown: string;    // pre-rendered estimate for display
}
```

Response (422 — extraction blocked): `{ error: string, blockers: string[], flags: string[] }`
Response (429 — rate limit or cost cap): `{ error: string, resetAt?: string }`
Response (400 — validation): `{ error: string }`
Response (500): `{ error: "An error occurred. Please try again." }`

**Flow:**
1. Parse multipart with `await request.formData()`.
2. Validate with `PhotoEstimateRequestSchema` (new Zod in `photo-estimate-schemas.ts`).
3. Extract IP: `request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'`.
4. Per-IP rate limit: `RateLimiters.photoEstimatePublic(ip)` — 3 / 24h. On fail, return 429.
5. Upload original to bucket: path `${YYYY-MM-DD}/${uuid}.${ext}` via `createAdminClient().storage.from('photo-estimate-uploads').upload()`.
6. Sharp pipeline: download buffer → resize max 1024px longest side → JPEG quality 85 → buffer → base64.
7. Call OpenAI:
   ```ts
   const client = new OpenAI();
   const completion = await client.chat.completions.create({
     model: 'gpt-4o',
     response_format: { type: 'json_schema', json_schema: { name: 'fence_extraction', strict: true, schema: EXTRACTION_JSON_SCHEMA } },
     messages: [
       { role: 'system', content: SYSTEM_PROMPT },
       { role: 'user', content: USER_PROMPT_IMAGE(base64, 'image/jpeg', additionalContext) },
     ],
     max_tokens: 2000,
   });
   ```
8. Calculate cost: `inputTokens * 0.0025/1000 + outputTokens * 0.01/1000 + imagePriceCents`. (GPT-4o Vision with `detail: high` ~= $0.01 per image.) Round up to integer cents.
9. Atomic cost check: `await admin.rpc('increment_photo_estimate_cost', { p_cents: totalCostCents })`. If the RPC raises `DAILY_COST_CAP_EXCEEDED`, return 429 with `"Free tier limit reached for today. Please try again tomorrow or create an account."`.
10. `const parsed = JSON.parse(completion.choices[0].message.content!)`; `const validated = validateExtraction(parsed)`. If `validated.blocked`, return 422 with blockers.
11. `const result = estimateFence(validated.data, { laborRatePerHr: 75, wastePct: 0.10, priceMap: {} })`. No org price map on public flow — use engine defaults.
12. Build `displayMarkdown` (one pass of string templating from the extraction + result).
13. Insert into `public_photo_estimates` via `createAdminClient()`: `{ ip_address, user_agent, image_storage_path, extraction_json, estimate_json, openai_cost_cents }`.
14. Return the response shape.

**Rate limiter addition:**
```ts
// In src/lib/security/rate-limit.ts — preserve all existing
photoEstimatePublic: (ip: string) =>
  checkRateLimit({
    key: `photo-estimate-public:${ip}`,
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  }),
```

**Security:**
- All errors caught, sanitized, logged to Sentry with `tags: { phase: 'sprint_2_photo_estimator', step: '<step>' }`.
- No OpenAI error or Supabase error leaks to client.
- Log `ip_address` and `user_agent` to the DB for forensic review if abuse detected.
- `createAdminClient()` only — no user auth.

**Commit message:** `feat(photo-estimator): public API route + OpenAI Vision pipeline`

---

## Session C — Public UI (initial, no email capture)

**File allowlist:**
- `src/app/try-it/page.tsx` (create)
- `src/app/try-it/PhotoUploadForm.tsx` (create)
- `src/app/try-it/ResultCard.tsx` (create)

**Page design (match fence-palette):**

- Hero: `bg-fence-950` background, white headline "See a fence estimate from a photo" + subhead "Upload any yard photo. Our AI identifies the fence run and gives you a rough estimate in seconds."
- Upload zone: `bg-white rounded-xl` card, drag-and-drop + file picker.
- Preview state: show uploaded image thumbnail, filename, size, button to re-select.
- Submit: `bg-fence-600 hover:bg-fence-700` primary button, "Estimate my fence" with loading spinner.
- Result state: hide form, render `<ResultCard />`.
- Error state: `bg-red-50 border border-red-200` with user-friendly message.

**Upload form validation (client-side):**
- MIME: `image/jpeg`, `image/png`, `image/webp`.
- Max size: 8MB.
- Show friendly errors if violated.

**ResultCard layout:**
```
[Big headline]
"Here's your fence estimate"

[Confidence badge]
"High confidence" / "Rough estimate — please verify measurements"

[Stats row — 3 cards]
Linear feet: 150 ft
Fence type: Wood Privacy, 6ft
Gates: 2

[Price range — big]
$4,500 – $6,100

[BOM summary — 1-2 sentences]
"One run of wood privacy fence, approximately 150 linear feet with two
4-foot walk gates. Standard soil, flat grade."

[Flags — if any, amber callout]
⚠ Height defaulted to 6ft (not specified in photo)

[CTA stack]
[Primary] "Save this estimate + get detailed proposal" → scrolls to email capture (built in Wave 2)
[Secondary] "Try another photo" → resets form
```

**Accessibility:**
- `<input type="file">` has `aria-label` + visible label.
- Upload zone has keyboard focus ring + `role="button"` on the drag area.
- Loading state has `role="status" aria-live="polite"`.
- Errors have `role="alert"`.

**SEO meta (in page.tsx):**
- Title: "AI Fence Estimator — Upload a Photo, Get a Quote | FenceEstimatePro"
- Description: "Free tool: upload any yard photo, our AI identifies the fence and estimates linear feet, gates, and a rough price range."
- OG image: a screenshot of the tool itself.

**Commit message:** `feat(photo-estimator): public /try-it page with upload + result display`

---

## Session D — Email capture + claim flow

**File allowlist:**
- `src/app/try-it/ResultCard.tsx` (EXTEND — add email capture form at bottom)
- `src/app/api/public/photo-estimate/claim/route.ts` (create)
- `src/lib/ai-extract/claimPhotoEstimate.ts` (create — server action helper)
- `src/lib/validation/photo-estimate-schemas.ts` (ADD claim schema)

**Email capture UX on ResultCard:**
- After results render, show below the price range:
  ```
  [Card: bg-fence-50 border border-fence-200]
  Save this estimate and get a full contractor-ready proposal.

  [email input] [Save estimate button]
  
  We'll email you a link to claim this estimate. No spam, no credit card.
  ```
- On submit: `POST /api/public/photo-estimate/claim` with `{ claim_token, email }`.
- On success: swap card to "Check your email — we sent a link to finish setup."
- On error (email already exists without account): "This email is already registered. Sign in to claim."

**`POST /api/public/photo-estimate/claim` flow:**
1. Zod validate: `{ claim_token: uuid, email: string.email() }`.
2. Look up `public_photo_estimates` by `claim_token` via admin client. If not found or already claimed, return 404/409.
3. Update the row: `email = ?`, `email_captured_at = NOW()`. (Just capturing intent; actual account creation is deferred to when they click the magic link in email.)
4. Send email via Resend:
   - From: `estimates@fenceestimatepro.com` (or existing sender — confirm in `src/lib/email/` patterns).
   - Subject: "Your fence estimate is ready — claim it in one click"
   - HTML: branded card with estimate summary + magic-link button to `/claim?token={claim_token}&email={email}`.
5. Return `{ success: true, message: "Check your inbox" }`.

**`/claim` page (simple — may be in same session or Session E):**
- Reads `token` + `email` from query.
- Calls `POST /api/public/photo-estimate/claim/finalize` with token + email + a chosen password (or magic link → existing Supabase Auth flow).
- On success: signs user in + transfers `public_photo_estimates` → `fence_graphs` (insert into `fence_graphs` with the user's new `org_id` + copy the `extraction_json` into `input_json` + the `estimate_json` into `result_json` + mark `claimed_at = NOW()` and `claimed_by_user_id` on the original row).
- Redirects to `/dashboard/advanced-estimate/saved/{new_fence_graph_id}`.

**Resend integration — check existing patterns:**
- Search the codebase for existing Resend usage: `grep -l "resend" src/` — reuse sender config + email template components if they exist.
- If no pattern: create `src/lib/email/send-claim-email.ts` with a minimal typed helper.

**Commit message:** `feat(photo-estimator): email capture + claim flow with Resend welcome`

---

## Session E — Homepage integration

**File allowlist:**
- Homepage hero file (confirm location — likely `src/app/page.tsx` or `src/app/(marketing)/page.tsx`).
- Possibly an existing hero component.

**Work:**
1. Locate the current landing page hero.
2. Add a prominent CTA: `Try our AI Fence Estimator — free, no signup` with an icon and arrow, linking to `/try-it`.
3. Preserve existing hero content; add the CTA as a secondary button or badge under the primary.
4. Update meta tags at the root layout if needed for OG sharing.

**Do not:** redesign the hero. Just add the CTA link.

**Commit message:** `feat(photo-estimator): homepage CTA linking to AI Photo Estimator`

---

## Wave 3 — Testing & Deploy (me)

### Test harness extension

1. Add 3-5 image test cases to `test-fixtures/ai-extraction-test-dataset.json`:
   - `clear-yard-photo` — obvious wood fence, clear measurements visible.
   - `aerial-view` — satellite-style with driveway/features for scale.
   - `sketch-plan` — hand-drawn plan with dimensions.
   - `ambiguous-photo` — no fence visible, should flag low confidence.
   - `partial-fence` — existing fence in photo, contractor wants replacement estimate.
2. Extend `scripts/test-ai-extraction.ts` to support image-input test cases (the dataset format may need a `photoPath` field alongside `input`).
3. Kelvin provides actual photos; commit them under `test-fixtures/photos/`.
4. Run `npm run test:ai-extraction` and record baseline accuracy.

### Deploy path

1. Push to `claude/sprint-2-photo-estimator` branch.
2. Vercel auto-deploys preview → verify env vars are in `preview` scope (OPENAI_API_KEY, SUPABASE keys, RESEND_API_KEY).
3. Smoke test on preview URL with 3-5 real yard photos.
4. If stable, open PR to `main`, merge, promote to production.
5. Monitor Sentry for the first 24 hours — filter `tags.phase = sprint_2_photo_estimator`.
6. Monitor `photo_estimate_daily_cost` table daily — alert if approaching cap.

### Rollback plan

If costs spike or abuse is detected:
- Immediate: pull `/try-it` page (rename route or add maintenance banner).
- Short term: tighten per-IP limit from 3/24h to 1/24h.
- Longer: add Upstash Redis, require email before upload, require CAPTCHA.

---

## Wave 4 — Director tasks (Kelvin, throughout sprint)

### Before Session B starts
- Take 5-10 reference yard photos:
  - Clear, daylight yard photo showing where a fence would go
  - Aerial/drone style if possible
  - Hand-drawn sketch with dimensions
  - Photo with existing fence (replacement estimate)
  - Ambiguous photo (test the "low confidence" path)
- Put them under a shared folder or iMessage to yourself — I'll move to test-fixtures when ready.

### While I'm building
- Dogfood Sprint 1 AR on your property, record 90-sec video.
- Tell me when you have a wood_privacy_6ft quote created — I'll flip `ar_enabled=true`.

### Before Wave 3 deploy
- Confirm `OPENAI_API_KEY` is set in Vercel `preview` and `production` scopes.
- Confirm `RESEND_API_KEY` is set in both scopes.
- Approve the daily $5 cap (or adjust).

---

## Success criteria

**Must ship:**
- [ ] Public `/try-it` page loads without auth.
- [ ] Upload → result flow works end-to-end with test photos.
- [ ] Daily cost cap enforced atomically (verified by intentionally exceeding limit).
- [ ] Per-IP rate limit visible in the response (429 after 3 calls in 24h from same IP).
- [ ] Email capture stores the email + sends a Resend welcome.
- [ ] Claim flow creates a user + transfers estimate to `fence_graphs`.
- [ ] 3+ image test cases added to the harness, all passing.
- [ ] Homepage hero has a clear CTA to `/try-it`.
- [ ] Production deploy green for 24h with no Sentry spikes.

**Nice-to-have (defer if tight on time):**
- Social sharing buttons on the result card ("Share my fence estimate").
- Confidence-score visualization (colored ring).
- Save the uploaded photo URL with the fence_graph so it appears in the dashboard.
- PostHog funnel events (`photo_upload_started`, `photo_upload_submitted`, `estimate_returned`, `email_captured`, `account_claimed`).

---

## Kill criteria

From the battle plan:
> If accuracy < 70% on test set by end of Sprint 2, pivot approach.

Translation: if fewer than 7 of 10 image test cases return usable estimates (not blocked, reasonable linear-feet in range), we retreat to a text-first flow with "add a photo" as optional context.

---

## Troubleshooting playbook

**OpenAI Vision returns `additionalProperties` error:**
The `EXTRACTION_JSON_SCHEMA` has `additionalProperties: false` on every nested object. If the model returns a field not in the schema, strict mode fails. Verify the model is `gpt-4o` (not an older snapshot).

**Public endpoint returns 401:**
You're using `createClient()` instead of `createAdminClient()`. Public endpoint has no cookies/session.

**Daily cost cap never trips:**
Verify `increment_photo_estimate_cost` RPC uses `SECURITY DEFINER` and the `FOR UPDATE` lock. If you see duplicate-key errors, the `ON CONFLICT` clause is missing.

**Resend email doesn't arrive:**
Check `RESEND_API_KEY` is set and the sender domain is verified in Resend dashboard. Spam folders too.

**Homepage CTA hidden on mobile:**
Check the existing hero's responsive grid — the CTA wrapper may need `flex-col sm:flex-row`.

---

*This doc is Sprint 2's source of truth. Update in place as we learn.*
