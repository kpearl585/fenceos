// ── Supplier Price Sync Types ────────────────────────────────────
// Type definitions for supplier connector architecture

// ── Connector Interface ──────────────────────────────────────────

export type ConnectorType = "api" | "csv" | "manual";
export type ConnectorStatus = "active" | "disabled" | "error";

export interface ConnectorConfig {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  type: ConnectorType;
  status: ConnectorStatus;

  // API configuration
  apiBaseUrl?: string;
  apiAuthType?: "oauth2" | "api_key" | "basic";
  apiCredentials?: Record<string, unknown>;
  apiRateLimitPerHour?: number;

  // CSV configuration
  csvColumnMapping?: {
    descriptionCol: number;
    priceCol: number;
    skuCol?: number;
  };

  // Auto-sync settings
  autoSyncEnabled: boolean;
  autoSyncFrequencyHours?: number;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

// ── Product Data Types ───────────────────────────────────────────

export interface SupplierProduct {
  supplierSku?: string;           // Supplier's product ID
  description: string;             // Product name/description
  unitCost: number;                // Price per unit
  unit?: string;                   // Unit of measure (ea, box, lf)
  packSize?: number;               // Items per pack (default: 1)
  rawData?: Record<string, unknown>; // Original row data for debugging
}

export interface ProductMapping {
  id?: string;
  supplierProduct: SupplierProduct;
  internalSku: string | null;      // Matched internal SKU (null if no match)
  internalName?: string;           // Material name from DB
  currentUnitCost?: number;        // Current price in DB
  confidence: number;              // Match confidence (0-1)
  matchReason: string;             // Explanation of match
  mappingType: "exact_sku" | "exact_name" | "fuzzy" | "keyword" | "manual" | "none";
  verified?: boolean;              // User confirmed this mapping
}

// ── Sync Operation Types ─────────────────────────────────────────

export interface SyncRunMetadata {
  id?: string;
  connectorId: string;
  syncType: "manual_csv" | "auto_api" | "manual_api";
  sourceFileName?: string;
  sourceRowCount: number;
  initiatedBy?: string;
}

export interface SyncResult {
  success: boolean;
  runId?: string;
  mappings: ProductMapping[];
  summary: {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  errors: SyncError[];
}

export interface SyncError {
  rowNumber?: number;
  supplierSku?: string;
  description?: string;
  errorType: "no_match" | "parse_error" | "validation_error" | "db_error" | "duplicate" | "invalid_price";
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
}

export interface PriceUpdate {
  internalSku: string;
  newUnitCost: number;
  supplierSku?: string;
  supplierName?: string;
  mappingId?: string;
  confidence: number;
}

export interface ApplyResult {
  success: boolean;
  appliedCount: number;
  syncRunId?: string;
  errors: string[];
  priceChanges: PriceChange[];
}

export interface PriceChange {
  materialId: string;
  sku: string;
  name: string;
  previousCost: number | null;
  newCost: number;
  changeAmount: number;
  changePercent: number | null;
}

// ── Connector Interface ──────────────────────────────────────────

/**
 * Abstract interface for all supplier connectors
 * Implementations: CsvConnector, LowesApiConnector, etc.
 */
export interface ISupplierConnector {
  /**
   * Fetch products from supplier
   * @param options - Connector-specific options (e.g., CSV text, API filters)
   * @returns List of supplier products
   */
  fetchProducts(options: FetchOptions): Promise<FetchResult>;

  /**
   * Get connector metadata
   */
  getConfig(): ConnectorConfig;

  /**
   * Validate connector configuration
   * @returns Validation errors (empty if valid)
   */
  validateConfig(): Promise<string[]>;

  /**
   * Test connector connectivity (for API connectors)
   * @returns Connection test result
   */
  testConnection?(): Promise<ConnectionTestResult>;
}

export interface FetchOptions {
  // CSV connector options
  csvText?: string;
  fileName?: string;

  // API connector options
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;

  // Common options
  orgId: string;
}

export interface FetchResult {
  success: boolean;
  products: SupplierProduct[];
  format?: string; // "hd_pro" | "lowes_pro" | "generic"
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ── Matching Types ───────────────────────────────────────────────

export interface MatchingStrategy {
  /**
   * Match a supplier product to internal SKU
   */
  match(product: SupplierProduct, orgId: string): Promise<ProductMapping>;

  /**
   * Batch match multiple products
   */
  matchBatch(products: SupplierProduct[], orgId: string): Promise<ProductMapping[]>;
}

export interface MatchRule {
  id?: string;
  keywords: string[];
  targetSku: string;
  targetName: string;
  minKeywordHits?: number;
  priority?: number;
}

// ── Database Row Types ───────────────────────────────────────────
// These types match the database schema exactly

export interface SupplierConnectorRow {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  supplier_type: "api" | "csv" | "manual";
  api_base_url: string | null;
  api_auth_type: "oauth2" | "api_key" | "basic" | null;
  api_credentials: Record<string, unknown> | null;
  api_rate_limit_per_hour: number | null;
  csv_column_mapping: Record<string, unknown> | null;
  csv_format_hints: Record<string, unknown> | null;
  auto_sync_enabled: boolean;
  auto_sync_frequency_hours: number | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  status: "active" | "disabled" | "error";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SupplierSyncRunRow {
  id: string;
  org_id: string;
  connector_id: string;
  sync_type: "manual_csv" | "auto_api" | "manual_api";
  status: "pending" | "processing" | "completed" | "failed" | "partial";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  source_file_name: string | null;
  source_row_count: number | null;
  matched_count: number;
  unmatched_count: number;
  applied_count: number;
  error_count: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  initiated_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
}

export interface SupplierProductMappingRow {
  id: string;
  org_id: string;
  connector_id: string;
  supplier_sku: string | null;
  supplier_description: string;
  supplier_unit: string | null;
  supplier_pack_size: number;
  internal_sku: string;
  mapping_type: "exact_match" | "fuzzy_match" | "manual" | "keyword";
  confidence: number;
  match_reason: string | null;
  unit_conversion_factor: number;
  status: "active" | "inactive" | "pending_review";
  verified: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_used_at: string | null;
  use_count: number;
}

export interface SupplierPriceHistoryRow {
  id: string;
  org_id: string;
  material_id: string;
  material_sku: string;
  material_name: string;
  previous_unit_cost: number | null;
  new_unit_cost: number;
  price_change_amount: number | null;
  price_change_percent: number | null;
  sync_run_id: string | null;
  connector_id: string | null;
  supplier_name: string | null;
  supplier_sku: string | null;
  mapping_id: string | null;
  match_confidence: number | null;
  applied_by: string | null;
  applied_at: string;
  rolled_back: boolean;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
  rollback_reason: string | null;
}

export interface SupplierSyncErrorRow {
  id: string;
  org_id: string;
  sync_run_id: string;
  row_number: number | null;
  supplier_sku: string | null;
  supplier_description: string | null;
  supplier_unit_cost: number | null;
  error_type: "no_match" | "parse_error" | "validation_error" | "db_error" | "duplicate" | "invalid_price";
  error_message: string;
  error_details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

// Material table with new sync metadata fields
export interface MaterialRow {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  category: string | null;
  supplier: string | null;
  supplier_sku: string | null;
  notes: string | null;
  sync_source: "api" | "csv" | "manual" | null;
  last_sync_connector_id: string | null;
  last_sync_run_id: string | null;
  last_sync_confidence: number | null;
  last_sync_mapping_id: string | null;
  price_sync_count: number;
  price_change_alert: boolean;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Re-export for backwards compatibility ───────────────────────

export type { ConnectorConfig as SupplierConnectorConfig };
export type { SupplierProduct as SupplierRow }; // Old name
export type { ProductMapping as MatchResult }; // Old name
