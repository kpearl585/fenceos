// ── Supplier Connector Registry ──────────────────────────────────
// Factory for creating supplier connectors based on configuration

import type { ISupplierConnector, ConnectorConfig, ConnectorType } from "../types";
import { CsvSupplierConnector } from "./csv";
import { LowesApiConnector } from "./lowes-api";

/**
 * Connector factory - creates the appropriate connector instance
 */
export class ConnectorRegistry {
  /**
   * Create connector from configuration
   */
  static createConnector(config: ConnectorConfig): ISupplierConnector {
    // Validate basic config
    if (!config.orgId) {
      throw new Error("Connector config must include orgId");
    }

    if (!config.type) {
      throw new Error("Connector config must include type");
    }

    // Route to appropriate connector implementation
    switch (config.type) {
      case "csv":
        return new CsvSupplierConnector(config);

      case "api":
        return this.createApiConnector(config);

      case "manual":
        throw new Error("Manual connectors do not require connector instances");

      default:
        throw new Error(`Unknown connector type: ${config.type}`);
    }
  }

  /**
   * Create API connector based on slug/name
   */
  private static createApiConnector(config: ConnectorConfig): ISupplierConnector {
    const slug = config.slug.toLowerCase();

    if (slug.includes("lowes")) {
      return new LowesApiConnector(config);
    }

    if (slug.includes("homedepot") || slug.includes("hd")) {
      throw new Error("Home Depot API connector not implemented yet");
    }

    throw new Error(`Unknown API connector: ${config.slug}`);
  }

  /**
   * Get list of supported connector types
   */
  static getSupportedTypes(): ConnectorType[] {
    return ["csv", "api", "manual"];
  }

  /**
   * Get list of available API connectors
   */
  static getAvailableApiConnectors(): { slug: string; name: string; status: string }[] {
    return [
      { slug: "lowes_pro_api", name: "Lowe's Pro API", status: "available" },
      { slug: "hd_pro_api", name: "Home Depot Pro API", status: "planned" },
    ];
  }

  /**
   * Get default config template for a connector type
   */
  static getConfigTemplate(type: ConnectorType, orgId: string): Partial<ConnectorConfig> {
    switch (type) {
      case "csv":
        return {
          orgId,
          name: "CSV Import",
          slug: "csv_generic",
          type: "csv",
          status: "active",
          autoSyncEnabled: false,
        };

      case "api":
        return {
          orgId,
          name: "API Connector",
          slug: "api_generic",
          type: "api",
          status: "disabled",
          autoSyncEnabled: false,
          apiRateLimitPerHour: 1000,
        };

      case "manual":
        return {
          orgId,
          name: "Manual Entry",
          slug: "manual",
          type: "manual",
          status: "active",
          autoSyncEnabled: false,
        };
    }
  }

  /**
   * Validate connector configuration
   */
  static async validateConnectorConfig(config: ConnectorConfig): Promise<string[]> {
    try {
      const connector = this.createConnector(config);
      return await connector.validateConfig();
    } catch (error) {
      return [error instanceof Error ? error.message : "Validation failed"];
    }
  }
}

// ── Export convenience functions ──────────────────────────────────

/**
 * Create CSV connector
 */
export function createCsvConnector(config: ConnectorConfig): CsvSupplierConnector {
  if (config.type !== "csv") {
    throw new Error("createCsvConnector requires type='csv'");
  }
  return new CsvSupplierConnector(config);
}

/**
 * Create Lowe's API connector
 */
export function createLowesConnector(config: ConnectorConfig): LowesApiConnector {
  if (config.type !== "api") {
    throw new Error("createLowesConnector requires type='api'");
  }
  return new LowesApiConnector(config);
}

/**
 * Create connector from database row
 */
export function createConnectorFromDb(row: {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  supplier_type: string;
  api_base_url?: string;
  api_auth_type?: string;
  api_credentials?: Record<string, unknown>;
  api_rate_limit_per_hour?: number;
  csv_column_mapping?: Record<string, unknown>;
  auto_sync_enabled: boolean;
  auto_sync_frequency_hours?: number;
  last_sync_at?: string;
  next_sync_at?: string;
  status: string;
}): ISupplierConnector {
  const config: ConnectorConfig = {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    type: row.supplier_type as ConnectorType,
    status: row.status as "active" | "disabled" | "error",
    apiBaseUrl: row.api_base_url,
    apiAuthType: row.api_auth_type as "oauth2" | "api_key" | "basic" | undefined,
    apiCredentials: row.api_credentials,
    apiRateLimitPerHour: row.api_rate_limit_per_hour,
    csvColumnMapping: row.csv_column_mapping as
      | { descriptionCol: number; priceCol: number; skuCol?: number }
      | undefined,
    autoSyncEnabled: row.auto_sync_enabled,
    autoSyncFrequencyHours: row.auto_sync_frequency_hours,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
    nextSyncAt: row.next_sync_at ? new Date(row.next_sync_at) : undefined,
  };

  return ConnectorRegistry.createConnector(config);
}
