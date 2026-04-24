// ── CSV Supplier Connector ───────────────────────────────────────
// Handles CSV uploads from any supplier (HD Pro, Lowe's Pro, generic)

import { BaseSupplierConnector } from "./base";
import type {
  FetchOptions,
  FetchResult,
  SupplierProduct,
  ConnectorConfig,
} from "../types";

interface CsvColumnMapping {
  descriptionCol: number;
  priceCol: number;
  skuCol?: number;
  unitCol?: number;
}

interface CsvFormat {
  format: "hd_pro" | "lowes_pro" | "generic";
  mapping: CsvColumnMapping;
}

export class CsvSupplierConnector extends BaseSupplierConnector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  /**
   * Fetch products from CSV text
   */
  async fetchProducts(options: FetchOptions): Promise<FetchResult> {
    if (!options.csvText) {
      return {
        success: false,
        products: [],
        error: "CSV text is required",
      };
    }

    try {
      // Parse CSV into rows
      const rows = this.parseCsv(options.csvText);

      if (rows.length < 2) {
        return {
          success: false,
          products: [],
          error: "CSV must have at least a header row and one data row",
        };
      }

      // Detect format and column mapping
      const csvFormat = this.detectFormat(rows[0], options.fileName);

      // Extract products from data rows
      const products: SupplierProduct[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        try {
          const product = this.extractProduct(row, csvFormat.mapping, i);

          // Validate product
          const validationErrors = this.validateProduct(product);
          if (validationErrors.length > 0) {
            errors.push(`Row ${i + 1}: ${validationErrors.join(", ")}`);
            continue;
          }

          products.push(product);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Parse error"}`);
        }
      }

      return {
        success: true,
        products,
        format: csvFormat.format,
        metadata: {
          totalRows: rows.length - 1,
          parsedRows: products.length,
          errorRows: errors.length,
          errors: errors.slice(0, 10), // Return first 10 errors only
        },
      };
    } catch (error) {
      return {
        success: false,
        products: [],
        error: error instanceof Error ? error.message : "Failed to parse CSV",
      };
    }
  }

  /**
   * Validate CSV connector configuration
   */
  async validateConfig(): Promise<string[]> {
    const errors = await super.validateConfig();

    if (this.config.type !== "csv") {
      errors.push("Connector type must be 'csv'");
    }

    // CSV connectors don't need API credentials
    if (this.config.apiBaseUrl || this.config.apiCredentials) {
      errors.push("CSV connectors should not have API configuration");
    }

    return errors;
  }

  /**
   * Parse CSV text into rows
   * Handles quoted fields and escaped quotes
   */
  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    for (const line of lines) {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const nextCh = line[i + 1];

        if (ch === '"' && !inQuote) {
          inQuote = true;
          continue;
        }

        if (ch === '"' && inQuote) {
          if (nextCh === '"') {
            // Escaped quote
            cur += '"';
            i++; // Skip next quote
            continue;
          }
          // End quote
          inQuote = false;
          continue;
        }

        if (ch === "," && !inQuote) {
          cols.push(cur.trim());
          cur = "";
          continue;
        }

        cur += ch;
      }
      cols.push(cur.trim());
      rows.push(cols);
    }

    return rows;
  }

  /**
   * Detect CSV format and column mapping from headers
   */
  private detectFormat(headers: string[], fileName?: string): CsvFormat {
    const h = headers.map((c) => c.toLowerCase().trim());

    // Try custom column mapping from config first
    if (this.config.csvColumnMapping) {
      return {
        format: "generic",
        mapping: this.config.csvColumnMapping,
      };
    }

    // Detect column indices
    const descIdx = h.findIndex((c) =>
      c.includes("description") ||
      c.includes("product name") ||
      c.includes("product") ||
      c.includes("item name")
    );

    const priceIdx = h.findIndex((c) =>
      c.includes("net price") ||
      c.includes("unit price") ||
      c.includes("price") ||
      c.includes("cost")
    );

    const skuIdx = h.findIndex((c) =>
      c.includes("item number") ||
      c.includes("sku") ||
      c.includes("model") ||
      c.includes("item #")
    );

    const unitIdx = h.findIndex((c) =>
      c.includes("unit") ||
      c.includes("uom") ||
      c.includes("unit of measure")
    );

    // Detect format based on headers or filename
    const isHD =
      h.some((c) => c.includes("net price") || c.includes("pro xtra")) ||
      fileName?.toLowerCase().includes("homedepot") ||
      fileName?.toLowerCase().includes("hd_pro");

    const isLowes =
      h.some((c) => c.includes("lowes") || c.includes("lowe's")) ||
      fileName?.toLowerCase().includes("lowes");

    // Fallback to first two columns if detection fails
    const mapping: CsvColumnMapping = {
      descriptionCol: descIdx >= 0 ? descIdx : 0,
      priceCol: priceIdx >= 0 ? priceIdx : 1,
      skuCol: skuIdx >= 0 ? skuIdx : undefined,
      unitCol: unitIdx >= 0 ? unitIdx : undefined,
    };

    return {
      format: isHD ? "hd_pro" : isLowes ? "lowes_pro" : "generic",
      mapping,
    };
  }

  /**
   * Extract supplier product from CSV row
   */
  private extractProduct(
    row: string[],
    mapping: CsvColumnMapping,
    rowNumber: number
  ): SupplierProduct {
    const description = row[mapping.descriptionCol] ?? "";
    const priceStr = row[mapping.priceCol] ?? "0";
    const sku = mapping.skuCol !== undefined ? row[mapping.skuCol] : undefined;
    const unit = mapping.unitCol !== undefined ? row[mapping.unitCol] : undefined;

    if (!description || description.trim().length === 0) {
      throw new Error("Missing product description");
    }

    const unitCost = this.parsePrice(priceStr);

    if (unitCost <= 0) {
      throw new Error(`Invalid price: ${priceStr}`);
    }

    return {
      supplierSku: sku && sku.trim().length > 0 ? sku.trim() : undefined,
      description: description.trim(),
      unitCost,
      unit: unit && unit.trim().length > 0 ? unit.trim() : undefined,
      packSize: 1, // Default to 1 unless detected otherwise
      rawData: {
        rowNumber,
        rawRow: row,
      },
    };
  }
}
