# Supplier Connector Architecture

**Date:** April 9, 2026  
**Sprint:** Supplier Price Sync Architecture  
**Phase:** 3 - Connector Abstraction

---

## Overview

The Supplier Connector Architecture provides a **flexible, extensible system** for integrating price data from multiple suppliers. It supports:

✅ CSV uploads (HD Pro, Lowe's Pro, generic formats)  
✅ API integrations (Lowe's API ready, HD Pro planned)  
✅ Manual entry (direct input)  
✅ Future connectors (pluggable architecture)

---

## Architecture

### Core Components

1. **`ISupplierConnector`** — Interface all connectors must implement
2. **`BaseSupplierConnector`** — Abstract base class with common functionality
3. **Connector Implementations** — CSV, Lowe's API, etc.
4. **`ConnectorRegistry`** — Factory for creating connectors

---

## Class Hierarchy

```
ISupplierConnector (interface)
       ↑
       │ implements
       │
BaseSupplierConnector (abstract class)
       ↑
       │ extends
       │
       ├── CsvSupplierConnector
       ├── LowesApiConnector
       ├── HomeDepotApiConnector (future)
       └── ... (custom connectors)
```

---

## ISupplierConnector Interface

```typescript
interface ISupplierConnector {
  /**
   * Fetch products from supplier
   */
  fetchProducts(options: FetchOptions): Promise<FetchResult>;

  /**
   * Get connector metadata
   */
  getConfig(): ConnectorConfig;

  /**
   * Validate connector configuration
   */
  validateConfig(): Promise<string[]>;

  /**
   * Test connector connectivity (optional, for API connectors)
   */
  testConnection?(): Promise<ConnectionTestResult>;
}
```

---

## Connector Implementations

### 1. CSV Connector (`CsvSupplierConnector`)

**Purpose:** Handle CSV uploads from any supplier

**Features:**
- ✅ Auto-detect CSV format (HD Pro, Lowe's Pro, generic)
- ✅ Flexible column mapping (configurable or auto-detected)
- ✅ Handles quoted fields and escaped quotes
- ✅ Validates each row before returning
- ✅ Returns detailed error information

**Usage:**
```typescript
import { createCsvConnector } from "@/lib/price-sync/connectors";

const connector = createCsvConnector({
  orgId: "...",
  name: "CSV Import",
  slug: "csv_generic",
  type: "csv",
  status: "active",
  autoSyncEnabled: false,
});

const result = await connector.fetchProducts({
  csvText: "Product,Price\nVinyl Post 5x5,15.99\n...",
  fileName: "lowes_export.csv",
  orgId: "...",
});

// result = {
//   success: true,
//   products: [
//     { description: "Vinyl Post 5x5", unitCost: 15.99, ... },
//     ...
//   ],
//   format: "lowes_pro",
//   metadata: { totalRows: 10, parsedRows: 9, errorRows: 1 }
// }
```

**Format Detection:**
- **HD Pro:** Detects "Net Price" column or "Pro Xtra" in headers
- **Lowe's Pro:** Detects "Lowes" or "Lowe's" in headers
- **Generic:** Falls back to first two columns (description, price)

**Column Mapping:**
```typescript
{
  descriptionCol: 0,  // Product description column index
  priceCol: 1,        // Unit price column index
  skuCol: 2,          // (Optional) SKU column index
  unitCol: 3,         // (Optional) Unit of measure column
}
```

**Custom Mapping:**
```typescript
const connector = createCsvConnector({
  orgId: "...",
  name: "Custom CSV",
  slug: "custom_csv",
  type: "csv",
  status: "active",
  csvColumnMapping: {
    descriptionCol: 2,  // Description is 3rd column
    priceCol: 4,        // Price is 5th column
    skuCol: 0,          // SKU is 1st column
  },
});
```

---

### 2. Lowe's API Connector (`LowesApiConnector`)

**Purpose:** Automated price sync via Lowe's Pro API

**Features:**
- ✅ OAuth2 authentication
- ✅ API key authentication (fallback)
- ✅ Automatic token refresh
- ✅ Rate limiting support
- ✅ Pagination support
- ✅ Connection testing
- ⚠️ **Requires Lowe's API credentials** (not publicly available)

**Usage:**
```typescript
import { createLowesConnector } from "@/lib/price-sync/connectors";

const connector = createLowesConnector({
  orgId: "...",
  name: "Lowe's Pro API",
  slug: "lowes_pro_api",
  type: "api",
  status: "active",
  apiBaseUrl: "https://api.lowes.com/v1",
  apiAuthType: "oauth2",
  apiCredentials: {
    clientId: "...",
    clientSecret: "...",
    accessToken: "...",
    refreshToken: "...",
  },
  apiRateLimitPerHour: 1000,
  autoSyncEnabled: true,
  autoSyncFrequencyHours: 24,
});

// Test connection
const testResult = await connector.testConnection();
// { success: true, message: "Successfully connected to Lowe's API" }

// Fetch products
const result = await connector.fetchProducts({
  orgId: "...",
  limit: 100,
  offset: 0,
  filters: { category: "fencing" },
});

// result = {
//   success: true,
//   products: [...],
//   format: "lowes_pro",
//   metadata: { totalCount: 500, page: 1, limit: 100 }
// }
```

**Authentication Flow:**
1. Check if access token exists
2. If not, use refresh token to get new access token
3. If refresh fails, requires user to re-authenticate
4. Attach access token to all API requests

**Rate Limiting:**
- Configured via `apiRateLimitPerHour`
- Connector tracks requests per hour
- Delays requests if limit is approaching

---

### 3. Connector Registry

**Purpose:** Factory for creating connectors from configuration

**Usage:**
```typescript
import { ConnectorRegistry } from "@/lib/price-sync/connectors";

// Create connector from config
const connector = ConnectorRegistry.createConnector(config);

// Get supported types
const types = ConnectorRegistry.getSupportedTypes();
// ["csv", "api", "manual"]

// Get available API connectors
const apiConnectors = ConnectorRegistry.getAvailableApiConnectors();
// [
//   { slug: "lowes_pro_api", name: "Lowe's Pro API", status: "available" },
//   { slug: "hd_pro_api", name: "Home Depot Pro API", status: "planned" }
// ]

// Validate config
const errors = await ConnectorRegistry.validateConnectorConfig(config);
// []

// Get config template
const template = ConnectorRegistry.getConfigTemplate("api", orgId);
// { orgId, name: "API Connector", type: "api", ... }
```

**Creating from Database:**
```typescript
import { createConnectorFromDb } from "@/lib/price-sync/connectors";

const { data } = await supabase
  .from("supplier_connectors")
  .select("*")
  .eq("id", connectorId)
  .single();

const connector = createConnectorFromDb(data);
await connector.fetchProducts({ orgId, csvText: "..." });
```

---

## Data Flow

### CSV Upload Flow

```
1. User uploads CSV file
        ↓
2. createCsvConnector(config)
        ↓
3. connector.fetchProducts({ csvText, fileName })
        ↓
4. parseCsv(text) → string[][]
        ↓
5. detectFormat(headers) → CsvFormat
        ↓
6. For each row: extractProduct(row, mapping)
        ↓
7. validateProduct(product)
        ↓
8. Return FetchResult { products, format, metadata }
```

### API Sync Flow

```
1. Auto-sync job or manual trigger
        ↓
2. createLowesConnector(config)
        ↓
3. connector.testConnection() (optional)
        ↓
4. connector.fetchProducts({ filters, limit, offset })
        ↓
5. ensureAuthenticated() → refresh token if needed
        ↓
6. buildApiUrl(options) + buildHeaders()
        ↓
7. fetch(url, { headers })
        ↓
8. transformProducts(apiResponse) → SupplierProduct[]
        ↓
9. Return FetchResult { products, format, metadata }
```

---

## Adding New Connectors

### Step 1: Extend BaseSupplierConnector

```typescript
import { BaseSupplierConnector } from "@/lib/price-sync/connectors/base";

export class MyCustomConnector extends BaseSupplierConnector {
  async fetchProducts(options: FetchOptions): Promise<FetchResult> {
    // Implement fetching logic
    const products = await this.fetchFromCustomSource(options);
    return { success: true, products };
  }

  async validateConfig(): Promise<string[]> {
    const errors = await super.validateConfig();
    // Add custom validation
    if (!this.config.apiBaseUrl) {
      errors.push("Custom connector requires API URL");
    }
    return errors;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // Test connection to custom API
    try {
      await fetch(this.config.apiBaseUrl + "/health");
      return { success: true, message: "Connected" };
    } catch (error) {
      return { success: false, message: "Connection failed" };
    }
  }
}
```

### Step 2: Register in ConnectorRegistry

```typescript
// In registry.ts, add to createApiConnector()
private static createApiConnector(config: ConnectorConfig): ISupplierConnector {
  const slug = config.slug.toLowerCase();

  if (slug.includes("lowes")) {
    return new LowesApiConnector(config);
  }

  if (slug.includes("mycustom")) {
    return new MyCustomConnector(config);  // NEW
  }

  throw new Error(`Unknown API connector: ${config.slug}`);
}
```

### Step 3: Add to getAvailableApiConnectors()

```typescript
static getAvailableApiConnectors() {
  return [
    { slug: "lowes_pro_api", name: "Lowe's Pro API", status: "available" },
    { slug: "mycustom_api", name: "My Custom API", status: "available" },  // NEW
  ];
}
```

---

## Configuration Storage

Connectors are stored in the `supplier_connectors` table:

```sql
CREATE TABLE supplier_connectors (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  supplier_type text NOT NULL,  -- "api" | "csv" | "manual"
  api_base_url text,
  api_auth_type text,
  api_credentials jsonb,
  api_rate_limit_per_hour int,
  csv_column_mapping jsonb,
  auto_sync_enabled boolean DEFAULT false,
  auto_sync_frequency_hours int,
  status text DEFAULT 'active',
  ...
);
```

---

## Security Considerations

### API Credentials Storage
- **Encrypted at rest:** `api_credentials` column uses encrypted JSONB
- **Service role only:** Only service role can read/write credentials
- **Never exposed to client:** API keys never sent to browser
- **Masked in UI:** Display as "●●●●●●" in settings

### Rate Limiting
- **Per-connector limits:** Each connector tracks its own rate limit
- **Backoff strategy:** Exponential backoff on API errors
- **429 handling:** Respect Retry-After headers

### Row Level Security
```sql
ALTER TABLE supplier_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_connectors_org_policy
  ON supplier_connectors
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

---

## Testing

### Unit Tests

```typescript
import { CsvSupplierConnector } from "@/lib/price-sync/connectors";

describe("CsvSupplierConnector", () => {
  it("should parse simple CSV", async () => {
    const connector = new CsvSupplierConnector(mockConfig);
    const result = await connector.fetchProducts({
      csvText: "Product,Price\nVinyl Post,15.99",
      orgId: "test-org",
    });

    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].description).toBe("Vinyl Post");
    expect(result.products[0].unitCost).toBe(15.99);
  });

  it("should detect HD Pro format", async () => {
    const connector = new CsvSupplierConnector(mockConfig);
    const result = await connector.fetchProducts({
      csvText: "Product Description,Net Price\n...",
      orgId: "test-org",
    });

    expect(result.format).toBe("hd_pro");
  });
});
```

---

## Future Enhancements

### Planned Connectors
1. **Home Depot Pro API** — Similar to Lowe's
2. **Menards Pro API** — Midwest supplier
3. **ABC Supply API** — Roofing/siding materials
4. **Generic REST API** — Configurable endpoint connector

### Planned Features
1. **Batch Import** — Import from multiple suppliers simultaneously
2. **Incremental Sync** — Only fetch products that changed since last sync
3. **Webhook Support** — Receive push notifications of price changes
4. **Connector Marketplace** — Community-contributed connectors

---

## Conclusion

The Supplier Connector Architecture provides:

✅ **Pluggable design** — Easy to add new suppliers  
✅ **Type-safe** — Full TypeScript interfaces  
✅ **CSV-first** — Always supports CSV fallback  
✅ **API-ready** — Lowe's connector structure complete  
✅ **Testable** — Clear interfaces for mocking  
✅ **Secure** — Credentials encrypted, RLS enforced  

**Status:** ✅ Phase 3 Complete — Ready for Phase 4 (SKU Mapping Layer)

---

**Connector Architecture Completed:** April 9, 2026  
**Architect:** Supplier Price Sync Architecture Agent
