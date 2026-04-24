-- Add estimates.last_sent_at + last_sent_to.
--
-- Same root cause as 20260417120000_add_org_settings_target_margin_and_labor_rate.sql
-- and 20260417150000_add_org_branding_contact_columns.sql: the original
-- file supabase/migrations/20260303000000_fix_change_orders_schema.sql
-- defined four schema changes but was never applied to prod. The
-- change_orders portion was back-filled via phase6b; org_settings,
-- org_branding, and estimates portions went unfilled. This closes the
-- last of those gaps.
--
-- What these columns support:
--   - WRITE: src/app/dashboard/estimates/shareActions.ts — after the
--     "share quote" email sends successfully, stamp the estimate with
--     when it went out and who it went to.
--   - READ (4 call sites, all silently broken until now):
--       src/app/dashboard/estimates/page.tsx — "📨 Apr 12" pill on the
--         estimates list, showing recency of the last send
--       src/app/dashboard/estimates/[id]/page.tsx — "Last sent to: X on
--         Apr 12" line on the estimate detail page
--       src/app/dashboard/metrics/page.tsx — week-over-week "quotes sent"
--         KPI on the Business-tier advanced reporting dashboard
--       (the share action itself reads nothing — pure writer)
--
-- Impact until now: the share email feature has been sending quotes for
-- the entire life of the product, but the app acted as if no quote had
-- ever been sent — pills never appeared, "Last sent to" was always "—",
-- and the metrics dashboard showed zero sent-this-week regardless of
-- actual volume. Contractors following up manually would re-email the
-- same customers because the UI gave them no signal that a send already
-- happened.

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_to text;

COMMENT ON COLUMN public.estimates.last_sent_at IS
  'Timestamp of the most recent time this estimate was emailed to the customer via the share action. NULL = never sent from within the product.';

COMMENT ON COLUMN public.estimates.last_sent_to IS
  'Email address of the last recipient when this estimate was shared. NULL = never sent. Used by the estimate detail page and by contractors following up ("who did I send this to?").';
