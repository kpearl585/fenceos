-- Supplier Price Sync Phase 1: Enable Row Level Security policies
-- Ensure all new tables respect organization boundaries

-- supplier_connectors: Org-scoped, all operations
ALTER TABLE supplier_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_connectors_org_policy ON supplier_connectors
  FOR ALL
  USING (org_id = get_my_org_id());

-- supplier_sync_runs: Org-scoped, all operations
ALTER TABLE supplier_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_sync_runs_org_policy ON supplier_sync_runs
  FOR ALL
  USING (org_id = get_my_org_id());

-- supplier_product_mappings: Org-scoped, all operations
ALTER TABLE supplier_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_product_mappings_org_policy ON supplier_product_mappings
  FOR ALL
  USING (org_id = get_my_org_id());

-- supplier_price_history: Read-only for all org members
-- (Only service/admin can insert via application code)
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_price_history_org_read ON supplier_price_history
  FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY supplier_price_history_org_insert ON supplier_price_history
  FOR INSERT
  WITH CHECK (org_id = get_my_org_id());

-- supplier_sync_errors: Org-scoped, all operations
ALTER TABLE supplier_sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_sync_errors_org_policy ON supplier_sync_errors
  FOR ALL
  USING (org_id = get_my_org_id());

-- Comments
COMMENT ON POLICY supplier_connectors_org_policy ON supplier_connectors IS 'Org-scoped access to supplier connectors';
COMMENT ON POLICY supplier_sync_runs_org_policy ON supplier_sync_runs IS 'Org-scoped access to sync run history';
COMMENT ON POLICY supplier_product_mappings_org_policy ON supplier_product_mappings IS 'Org-scoped access to product mappings';
COMMENT ON POLICY supplier_price_history_org_read ON supplier_price_history IS 'Org members can read price history';
COMMENT ON POLICY supplier_price_history_org_insert ON supplier_price_history IS 'Org members can insert price history records';
COMMENT ON POLICY supplier_sync_errors_org_policy ON supplier_sync_errors IS 'Org-scoped access to sync errors';
