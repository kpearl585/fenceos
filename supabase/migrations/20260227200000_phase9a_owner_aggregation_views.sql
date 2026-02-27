-- Phase 9A: Owner Margin Aggregation Views
-- These views power the Owner Margin Dashboard.
-- They are read-only aggregations; RLS on base tables still applies.

-- ============================================================
-- View 1: owner_margin_summary_view
-- Aggregated financial summary per org_id
-- ============================================================
CREATE OR REPLACE VIEW owner_margin_summary_view AS
WITH estimate_stats AS (
  SELECT
    org_id,
    COALESCE(SUM(CASE WHEN status = 'quoted' THEN total ELSE 0 END), 0) AS total_quoted_revenue,
    COALESCE(SUM(CASE WHEN status IN ('accepted', 'deposit_paid') THEN total ELSE 0 END), 0) AS total_accepted_revenue,
    COALESCE(SUM(gross_profit), 0) AS total_estimated_gross_profit
  FROM estimates
  WHERE status NOT IN ('draft', 'rejected', 'expired')
  GROUP BY org_id
),
job_stats AS (
  SELECT
    j.org_id,
    COALESCE(SUM(CASE WHEN j.status = 'active' THEN j.total_price ELSE 0 END), 0) AS total_active_job_revenue,
    COALESCE(SUM(CASE WHEN j.status = 'complete' THEN j.total_price ELSE 0 END), 0) AS total_completed_revenue,
    COALESCE(SUM(j.gross_profit), 0) AS total_actual_gross_profit,
    COALESCE(AVG(CASE WHEN j.status IN ('active', 'complete') THEN j.gross_margin_pct END), 0) AS avg_margin_pct,
    COUNT(*) FILTER (
      WHERE j.gross_margin_pct < COALESCE(e.target_margin_pct, 0.35)
        AND j.status IN ('active', 'complete')
    ) AS jobs_below_target_margin_count
  FROM jobs j
  LEFT JOIN estimates e ON e.id = j.estimate_id
  WHERE j.status IN ('scheduled', 'active', 'complete')
  GROUP BY j.org_id
),
co_stats AS (
  SELECT
    co.org_id,
    COALESCE(SUM(co.amount), 0) AS margin_delta_from_change_orders
  FROM change_orders co
  WHERE co.status = 'approved'
  GROUP BY co.org_id
)
SELECT
  COALESCE(es.org_id, js.org_id, cs.org_id) AS org_id,
  COALESCE(es.total_quoted_revenue, 0) AS total_quoted_revenue,
  COALESCE(es.total_accepted_revenue, 0) AS total_accepted_revenue,
  COALESCE(js.total_active_job_revenue, 0) AS total_active_job_revenue,
  COALESCE(js.total_completed_revenue, 0) AS total_completed_revenue,
  COALESCE(es.total_estimated_gross_profit, 0) AS total_estimated_gross_profit,
  COALESCE(js.total_actual_gross_profit, 0) AS total_actual_gross_profit,
  COALESCE(js.avg_margin_pct, 0) AS avg_margin_pct,
  COALESCE(js.jobs_below_target_margin_count, 0) AS jobs_below_target_margin_count,
  COALESCE(cs.margin_delta_from_change_orders, 0) AS margin_delta_from_change_orders
FROM estimate_stats es
FULL OUTER JOIN job_stats js ON es.org_id = js.org_id
FULL OUTER JOIN co_stats cs ON COALESCE(es.org_id, js.org_id) = cs.org_id;

-- ============================================================
-- View 2: owner_jobs_risk_view
-- Per-job risk assessment for converted/active/complete jobs
-- ============================================================
CREATE OR REPLACE VIEW owner_jobs_risk_view AS
SELECT
  j.id AS job_id,
  j.org_id,
  j.title AS job_title,
  c.name AS customer_name,
  j.status,
  COALESCE(j.total_price, 0) AS total_price,
  COALESCE(j.total_cost, 0) AS total_cost,
  COALESCE(j.gross_profit, 0) AS gross_profit,
  COALESCE(j.gross_margin_pct, 0) AS gross_margin_pct,
  COALESCE(e.gross_margin_pct, 0) AS original_estimated_margin_pct,
  COALESCE(e.target_margin_pct, 0.35) AS target_margin_pct,
  COALESCE(co_agg.change_order_delta, 0) AS margin_delta_from_change_orders,
  CASE
    WHEN COALESCE(j.total_price, 0) = 0 THEN 0
    ELSE COALESCE(e.gross_margin_pct, 0) - COALESCE(j.gross_margin_pct, 0)
  END AS margin_erosion_pct,
  COALESCE(j.gross_margin_pct, 0) < COALESCE(e.target_margin_pct, 0.35) AS is_below_target
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN estimates e ON e.id = j.estimate_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(co.amount), 0) AS change_order_delta
  FROM change_orders co
  WHERE co.job_id = j.id AND co.status = 'approved'
) co_agg ON true
WHERE j.status IN ('scheduled', 'active', 'complete');
