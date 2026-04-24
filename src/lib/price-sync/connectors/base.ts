// ── Base Supplier Connector ──────────────────────────────────────
// Abstract base class for all supplier connectors

import type {
  ISupplierConnector,
  ConnectorConfig,
  FetchOptions,
  FetchResult,
  ConnectionTestResult,
  SupplierProduct,
} from "../types";

export abstract class BaseSupplierConnector implements ISupplierConnector {
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  /**
   * Fetch products from supplier (must be implemented by subclass)
   */
  abstract fetchProducts(options: FetchOptions): Promise<FetchResult>;

  /**
   * Get connector configuration
   */
  getConfig(): ConnectorConfig {
    return { ...this.config };
  }

  /**
   * Validate connector configuration
   * Override in subclass for connector-specific validation
   */
  async validateConfig(): Promise<string[]> {
    const errors: string[] = [];

    if (!this.config.orgId) {
      errors.push("Organization ID is required");
    }

    if (!this.config.name || this.config.name.trim().length === 0) {
      errors.push("Connector name is required");
    }

    if (!this.config.slug || this.config.slug.trim().length === 0) {
      errors.push("Connector slug is required");
    }

    return errors;
  }

  /**
   * Test connection (for API connectors)
   * Default implementation for CSV connectors (always succeeds)
   */
  async testConnection(): Promise<ConnectionTestResult> {
    if (this.config.type === "csv") {
      return {
        success: true,
        message: "CSV connector does not require connection test",
      };
    }

    // API connectors should override this method
    return {
      success: false,
      message: "Connection test not implemented for this connector type",
    };
  }

  /**
   * Normalize product description for matching
   */
  protected normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Parse price string to number
   */
  protected parsePrice(priceStr: string | number): number {
    if (typeof priceStr === "number") return priceStr;
    const cleaned = priceStr.replace(/[$,]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Validate supplier product data
   */
  protected validateProduct(product: SupplierProduct): string[] {
    const errors: string[] = [];

    if (!product.description || product.description.trim().length === 0) {
      errors.push("Product description is required");
    }

    if (typeof product.unitCost !== "number" || product.unitCost < 0) {
      errors.push("Invalid unit cost");
    }

    if (product.unitCost === 0) {
      errors.push("Unit cost cannot be zero");
    }

    if (product.packSize && (product.packSize < 1 || !Number.isInteger(product.packSize))) {
      errors.push("Pack size must be a positive integer");
    }

    return errors;
  }
}
