-- Add followup_nudge_sent_at column to estimates.
--
-- Used by /api/cron/stale-estimate-nudges to send a one-time follow-up
-- reminder to the contractor when a quote has sat in "quoted" status for
-- N days with no customer response. Column is the idempotency guard —
-- the cron only emails when `followup_nudge_sent_at IS NULL`.

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS followup_nudge_sent_at timestamptz;

COMMENT ON COLUMN estimates.followup_nudge_sent_at IS
  'When the stale-estimate follow-up nudge was sent to the contractor. NULL = not sent.';
