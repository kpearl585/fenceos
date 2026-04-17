# Sentry Query Cookbook

Ready-to-paste queries for Sentry Discover. Pair these with the tag taxonomy
we instrument throughout the app so one query can answer specific product
questions without opening the DB.

**Project:** `fenceos` in `pearl-labs-llc-u5.sentry.io`
**Region URL:** `https://us.sentry.io`

---

## Tag Taxonomy (what's instrumented)

Every Sentry event has structured tags. Filter on these in Discover:

### Paywall funnel (trigger attribution)

| Tag | Emitted by | Values |
|---|---|---|
| `surface` | `UpgradeClient` (upgrade page visit), `/api/stripe/webhook` (paid conversion) | `upgrade-page`, `paid-conversion` |
| `trigger` | both of the above | any `PaywallTrigger` value, or `organic` for no-trigger paid conversions |
| `plan` | `paid-conversion` events only | `starter`, `pro`, `business` |
| `billing_period` | `paid-conversion` events only | `monthly`, `annual` |

### Cron health

| Tag | Emitted by | Values |
|---|---|---|
| `cron` | every cron route | `trial-emails`, `stale-estimate-nudges`, `stripe-reconcile`, `ai-cost-rollup`, `expire-estimates`, `waitlist-sequence` |
| `step` | within crons, per sub-task | `fetch`, `send`, `drift`, `summary`, `active-trial`, `winback`, `retrieve`, `rate-limit-check` |
| `orgId` | per-org cron events | UUID |
| `alert` | `ai-cost-rollup` only | `true` when org crossed $5/day, `false` otherwise |

### AI extraction

| Tag | Emitted by | Values |
|---|---|---|
| `feature` | `aiActions.ts` | `ai-extraction` |
| `step` | `aiActions.ts` | `extract-text`, `extract-image`, `rate-limit-check` |
| `estimator` | `advanced-estimate/actions.ts` | `advanced` |

---

## The Funnel Queries

### 1. Upgrade-page visits by trigger (last 7 days)

```
surface:upgrade-page
```

Group by `trigger` tag. Shows which paywall moments drive the most upgrade-page traffic.

### 2. Paid conversions by trigger (last 30 days)

```
surface:paid-conversion
```

Group by `trigger` tag. Compare to #1 to compute conversion rate per trigger.

### 3. Full funnel for a specific trigger

Two queries side by side (Discover lets you pin both):

```
surface:upgrade-page trigger:feature_jobs
```
```
surface:paid-conversion trigger:feature_jobs
```

Replace `feature_jobs` with any `PaywallTrigger`:
`estimate_cap_hit`, `estimate_cap_warning`, `seat_cap`,
`feature_alternative_bids`, `feature_qb_sync`, `feature_pricing_rules`,
`feature_pipeline`, `feature_branded_pdf`, `feature_jobs`,
`feature_advanced_reporting`, `subscription_expired`, `subscription_lapsed`.

### 4. Organic conversions (users who hit /dashboard/upgrade with no trigger)

```
surface:paid-conversion trigger:organic
```

Helps size how much revenue comes from direct upgrade-page traffic vs paywall-driven.

### 5. Conversions by plan

```
surface:paid-conversion
```

Group by `plan`. Tells you product-mix of sales (Starter vs Pro vs Business).

---

## AI Cost Observability

### 6. Daily AI cost totals

```
cron:ai-cost-rollup step:summary
```

Shows the rolled-up "$X across N orgs" message per day. Good Y-axis for a
dashboard time-series chart.

### 7. Orgs that crossed the $5/day alert

```
cron:ai-cost-rollup alert:true
```

Each event has `extra.usd` and `tags.orgId`. Filter-and-sort to find repeat offenders.

### 8. A specific org's AI history

```
cron:ai-cost-rollup orgId:<UUID>
```

Pull the per-day rollup for one org. Useful for support conversations.

### 9. AI extraction errors

```
feature:ai-extraction level:[error]
```

Separates genuine GPT-4o failures (rate limits, bad JSON, timeouts) from
rollup cron errors.

---

## Cron Health

### 10. All cron errors, last 24h

```
cron:* level:[error]
```

(Or omit the filter and group by `cron` tag to see error volume per job.)

### 11. Stripe drift events

```
cron:stripe-reconcile step:drift
```

How often our webhook handler fails to capture a Stripe state change.
A steady stream > 0 means webhook endpoint is unreliable — investigate.

### 12. Trial-emails send failures

```
cron:trial-emails level:[error]
```

Broken out further by `step:active-trial` vs `step:winback`.

### 13. Stale-estimate nudge failures

```
cron:stale-estimate-nudges level:[error]
```

---

## Dashboard Layout (suggested)

Create a single Sentry dashboard with 6 widgets:

1. **Upgrade funnel (time-series, 7d)** — stacked bar by `trigger`, filtered to `surface:upgrade-page`
2. **Paid conversions (table, 30d)** — `surface:paid-conversion`, columns: `trigger`, `plan`, `billing_period`, count, summed to show mix
3. **AI daily cost (big-number + sparkline, 14d)** — `cron:ai-cost-rollup step:summary`, extract `extra.totalUsd` into the metric
4. **AI threshold alerts (list, 7d)** — `cron:ai-cost-rollup alert:true`, ordered by newest
5. **Cron error rate (time-series, 7d)** — `cron:* level:[error]`, stacked by `cron` tag
6. **Stripe drift (time-series, 30d)** — `cron:stripe-reconcile step:drift` — should trend toward zero

---

## How to build one: step-by-step

1. Sentry → Explore → Discover → "New Query"
2. Dataset: **Errors + Messages** (not Transactions)
3. Visualize: `count()` for most; `avg(extra.usd)` or similar for AI cost
4. Query: paste one of the strings above
5. Y-axis group: the tag you care about (e.g., `trigger`)
6. Save query → add to dashboard

For numerical extras (`extra.totalUsd`, `extra.usd`), switch the Visualize
type from `count()` to the corresponding `avg()`/`sum()`/`max()` as needed.

---

## Verifying the taxonomy end-to-end

Smoke test after a deploy that touches any of these paths:

```bash
# Visit the upgrade page with a trigger — should see a surface:upgrade-page event
open "https://fenceestimatepro.com/dashboard/upgrade?from=feature_jobs"

# Trigger a test AI extraction (requires auth) — should emit events under feature:ai-extraction
```

Then within ~60s, query Discover with `surface:upgrade-page trigger:feature_jobs`
and confirm the event landed.

---

## Notes on data retention

- Sentry Team plan keeps events for 30 days
- For long-term funnel analysis, export weekly via Sentry's API to a warehouse
- The AI cost rollup's `extra.totalUsd` is the best proxy for monthly OpenAI
  spend — reconcile monthly against your OpenAI invoice
