-- Add trial_winback_sent column to organizations.
--
-- The /api/cron/trial-emails route has always referenced this column in the
-- win-back branch (SELECT filter + UPDATE on send), but the column was never
-- added. Result: every daily cron run silently errored on that query and the
-- win-back loop was a no-op. Two real trial orgs that would have received a
-- win-back email have already aged past the 30-day window with no contact.
--
-- Nullable timestamptz — NULL means "win-back not yet sent". Idempotency
-- guard in the route is `.is("trial_winback_sent", null)`.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_winback_sent timestamptz;

COMMENT ON COLUMN organizations.trial_winback_sent IS
  'Timestamp when the trial win-back email was sent (7+ days post-expiry). NULL = not sent.';
