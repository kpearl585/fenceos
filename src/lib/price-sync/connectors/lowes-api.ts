// ── Lowe's API Connector ─────────────────────────────────────────
// API integration with Lowe's Pro for automated price sync
// NOTE: Requires Lowe's API credentials and endpoint details

import { BaseSupplierConnector } from "./base";
import type {
  FetchOptions,
  FetchResult,
  SupplierProduct,
  ConnectorConfig,
  ConnectionTestResult,
} from "../types";

interface LowesApiCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface LowesProduct {
  itemNumber: string;
  productName: string;
  description: string;
  unitPrice: number;
  uom: string; // Unit of measure
  packQuantity?: number;
  categoryId?: string;
  brand?: string;
  // Index signature for compatibility with Record<string, unknown>
  [key: string]: unknown;
}

export class LowesApiConnector extends BaseSupplierConnector {
  private credentials: LowesApiCredentials;

  constructor(config: ConnectorConfig) {
    super(config);

    if (!config.apiCredentials) {
      throw new Error("Lowe's API connector requires API credentials");
    }

    this.credentials = config.apiCredentials as LowesApiCredentials;
  }

  /**
   * Fetch products from Lowe's API
   */
  async fetchProducts(options: FetchOptions): Promise<FetchResult> {
    try {
      // Ensure we have a valid access token
      await this.ensureAuthenticated();

      // Build API request
      const url = this.buildApiUrl(options);
      const headers = this.buildHeaders();

      // Make API request
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Lowe's API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Lowe's API response to SupplierProduct[]
      const products = this.transformProducts(data);

      return {
        success: true,
        products,
        format: "lowes_pro",
        metadata: {
          totalCount: data.totalCount || products.length,
          page: options.offset ? Math.floor(options.offset / (options.limit || 100)) + 1 : 1,
          limit: options.limit || 100,
        },
      };
    } catch (error) {
      return {
        success: false,
        products: [],
        error: error instanceof Error ? error.message : "Failed to fetch from Lowe's API",
      };
    }
  }

  /**
   * Test connection to Lowe's API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const url = `${this.config.apiBaseUrl}/health`;
      const response = await fetch(url, {
        headers: this.buildHeaders(),
      });

      if (response.ok) {
        return {
          success: true,
          message: "Successfully connected to Lowe's API",
          details: {
            apiBaseUrl: this.config.apiBaseUrl,
          },
        };
      }

      return {
        success: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  /**
   * Validate Lowe's API configuration
   */
  async validateConfig(): Promise<string[]> {
    const errors = await super.validateConfig();

    if (this.config.type !== "api") {
      errors.push("Connector type must be 'api' for Lowe's API");
    }

    if (!this.config.apiBaseUrl) {
      errors.push("API base URL is required");
    }

    if (!this.credentials.apiKey && !this.credentials.accessToken) {
      errors.push("API key or access token is required");
    }

    if (this.config.apiAuthType === "oauth2") {
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        errors.push("OAuth2 requires client ID and client secret");
      }
    }

    return errors;
  }

  /**
   * Ensure we have a valid access token
   * Refreshes token if needed
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.config.apiAuthType === "oauth2") {
      // Check if access token is expired (simplified - real implementation would check expiry)
      if (!this.credentials.accessToken) {
        await this.refreshAccessToken();
      }
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokenUrl = `${this.config.apiBaseUrl}/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.credentials.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data = await response.json();
    this.credentials.accessToken = data.access_token;

    // TODO: Update credentials in database
  }

  /**
   * Build API URL with filters and pagination
   */
  private buildApiUrl(options: FetchOptions): string {
    const url = new URL(`${this.config.apiBaseUrl}/products`);

    // Add pagination
    if (options.limit) {
      url.searchParams.set("limit", options.limit.toString());
    }

    if (options.offset) {
      url.searchParams.set("offset", options.offset.toString());
    }

    // Add filters (if provided)
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.config.apiAuthType === "api_key" && this.credentials.apiKey) {
      headers["X-API-Key"] = this.credentials.apiKey;
    }

    if (this.config.apiAuthType === "oauth2" && this.credentials.accessToken) {
      headers["Authorization"] = `Bearer ${this.credentials.accessToken}`;
    }

    return headers;
  }

  /**
   * Transform Lowe's API products to SupplierProduct[]
   */
  private transformProducts(apiResponse: unknown): SupplierProduct[] {
    // TODO: Adjust this based on actual Lowe's API response format
    const data = apiResponse as { products?: LowesProduct[] };

    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }

    return data.products.map((product) => ({
      supplierSku: product.itemNumber,
      description: product.productName || product.description,
      unitCost: product.unitPrice,
      unit: product.uom,
      packSize: product.packQuantity || 1,
      rawData: product,
    }));
  }
}

// ── Lowe's API Connector Factory ─────────────────────────────────

/**
 * Create Lowe's API connector from config
 */
export function createLowesApiConnector(config: ConnectorConfig): LowesApiConnector {
  if (config.type !== "api") {
    throw new Error("Lowe's API connector requires type='api'");
  }

  if (!config.apiBaseUrl) {
    throw new Error("Lowe's API connector requires apiBaseUrl");
  }

  return new LowesApiConnector(config);
}

// ── Lowe's API Configuration Template ────────────────────────────

/**
 * Generate default Lowe's API configuration
 * Use this as a starting point for new Lowe's API connectors
 */
export function getLowesApiConfigTemplate(orgId: string): Partial<ConnectorConfig> {
  return {
    orgId,
    name: "Lowe's Pro API",
    slug: "lowes_pro_api",
    type: "api",
    status: "disabled", // Start disabled until credentials are added
    apiBaseUrl: "https://api.lowes.com/v1", // PLACEHOLDER - Replace with actual endpoint
    apiAuthType: "oauth2",
    apiRateLimitPerHour: 1000,
    autoSyncEnabled: false,
    autoSyncFrequencyHours: 24, // Daily sync
  };
}
