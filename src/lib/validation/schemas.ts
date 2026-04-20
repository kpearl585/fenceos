/**
 * Security validation schemas for FenceEstimatePro
 *
 * All user inputs from forms and API calls must be validated
 * server-side to prevent injection attacks and data corruption.
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// ADVANCED ESTIMATE VALIDATION
// ═══════════════════════════════════════════════════════════════

// SaveEstimateSchema is defined further down, after FenceProjectInputSchema
// (declaration order matters because `input` references it).

// ═══════════════════════════════════════════════════════════════
// FENCE PROJECT INPUT (Advanced Estimator engine shape)
// Matches src/lib/fence-graph/engine.ts FenceProjectInput at runtime.
// Uses .passthrough() so future engine fields don't break validation.
// ═══════════════════════════════════════════════════════════════

export const RunInputSchema = z.object({
  id: z.string().min(1).max(100),
  linearFeet: z.number().min(0).max(100000).finite(),
  startType: z.enum(["end", "corner", "gate"]),
  endType: z.enum(["end", "corner", "gate"]),
  slopeDeg: z.number().min(-45).max(45).finite(),
}).passthrough();

export const GateInputSchema = z.object({
  id: z.string().min(1).max(100),
  afterRunId: z.string().min(1).max(100),
  gateType: z.enum(["single", "double"]),
  widthFt: z.number().min(1).max(30).finite(),
  isPoolGate: z.boolean().optional(),
  hinges: z.enum(["standard", "self_closing"]).optional(),
  latch: z.enum(["standard", "lokk_latch", "magnetic", "slide_bolt"]).optional(),
  hardwareColor: z.enum(["black", "bronze", "white"]).optional(),
  postInsert: z.enum(["none", "aluminum", "steel"]).optional(),
}).passthrough();

export const FenceProjectInputSchema = z.object({
  projectName: z.string().max(200).optional(),
  productLineId: z.string().min(1).max(100),
  fenceHeight: z.number().int().min(3).max(12).finite(),
  postSize: z.string().max(20),
  soilType: z.enum(["standard", "clay", "rocky", "sandy_loam", "sandy", "wet"]),
  windMode: z.boolean(),
  runs: z.array(RunInputSchema).min(1, "At least one run required").max(100, "Too many runs"),
  gates: z.array(GateInputSchema).max(50, "Too many gates"),
  existingFenceRemoval: z.boolean().optional(),
  permitCost: z.number().min(0).max(100000).finite().optional(),
  inspectionCost: z.number().min(0).max(100000).finite().optional(),
  engineeringCost: z.number().min(0).max(100000).finite().optional(),
  surveyCost: z.number().min(0).max(100000).finite().optional(),
}).passthrough();

export const GenerateAdvancedPdfSchema = z.object({
  input: FenceProjectInputSchema,
  laborRate: z.number().min(0).max(500).finite(),
  wastePct: z.number().min(0).max(100).finite(),
  projectName: z.string().min(1).max(200).trim(),
});

// ═══════════════════════════════════════════════════════════════
// SAVE ESTIMATE — matches runtime FenceProjectInput shape
// ═══════════════════════════════════════════════════════════════
export const SaveEstimateSchema = z.object({
  name: z.string()
    .min(1, "Estimate name required")
    .max(200, "Estimate name too long")
    .trim(),

  laborRate: z.number()
    .min(0, "Labor rate cannot be negative")
    .max(500, "Labor rate unreasonably high")
    .finite(),

  wastePct: z.number()
    .min(0, "Waste % cannot be negative")
    .max(100, "Waste % cannot exceed 100%")
    .finite(),

  markupPct: z.number()
    .min(0,   "Markup % cannot be negative")
    .max(500, "Markup % unreasonably high")
    .finite()
    .optional(),

  input: FenceProjectInputSchema,

  // Result is engine output; cap outermost numeric fields and let the
  // nested BOM / labor / audit arrays pass through since they're not
  // user-provided.
  result: z.object({
    bom: z.array(z.unknown()),
    totalCost: z.number().min(0).max(10000000).finite(),
    totalMaterialCost: z.number().min(0).max(10000000).finite().optional(),
    totalLaborCost: z.number().min(0).max(10000000).finite().optional(),
    totalLaborHrs: z.number().min(0).max(100000).finite().optional(),
  }).passthrough(),
});

// ═══════════════════════════════════════════════════════════════
// HOA PACKET GENERATION
// Customer details are prompted at packet time because fence_graphs
// has no customer_id link. Neighbor details are optional — they go on
// the adjoining-fence consent page in future PRs; v1 only uses them
// if provided to avoid a mostly-blank form.
// ═══════════════════════════════════════════════════════════════
export const GenerateHoaPacketSchema = z.object({
  estimateId: z.string().uuid("Invalid estimate ID"),
  customerName: z.string().min(1, "Customer name required").max(200).trim(),
  customerAddress: z.string().min(1, "Customer address required").max(500).trim(),
  customerCity: z.string().max(100).trim().optional().or(z.literal("")),
  customerState: z.string().max(50).trim().optional().or(z.literal("")),
  customerZip: z.string().max(20).trim().optional().or(z.literal("")),
  hoaName: z.string().max(200).trim().optional().or(z.literal("")),
});

export const UploadContractorDocSchema = z.object({
  docType: z.enum(["insurance_cert", "w9", "license"]),
  storagePath: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().min(1).max(15 * 1024 * 1024),  // 15MB hard cap
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").optional().or(z.literal("")),
});

export const GenerateCustomerProposalPdfSchema = GenerateAdvancedPdfSchema.extend({
  markupPct: z.number().min(0).max(500).finite(),
  fenceType: z.enum(["vinyl", "wood", "chain_link", "aluminum"]),
  customer: z.object({
    name: z.string().max(200).trim().optional().or(z.literal("")),
    address: z.string().max(500).trim().optional().or(z.literal("")),
    city: z.string().max(100).trim().optional().or(z.literal("")),
    phone: z.string().max(20).trim().optional().or(z.literal("")),
    email: z.string().email("Invalid email").max(255).trim().optional().or(z.literal("")),
  }),
  woodStyle: z.enum(["dog_ear_privacy", "flat_top_privacy", "picket", "board_on_board"]).optional(),
});

// ═══════════════════════════════════════════════════════════════
// CUSTOMER VALIDATION
// ═══════════════════════════════════════════════════════════════

export const CustomerSchema = z.object({
  name: z.string()
    .min(1, "Customer name required")
    .max(200, "Customer name too long")
    .trim(),

  email: z.string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .trim()
    .optional()
    .or(z.literal("")),

  phone: z.string()
    .max(20, "Phone number too long")
    .trim()
    .optional()
    .or(z.literal("")),

  address: z.string()
    .max(500, "Address too long")
    .trim()
    .optional()
    .or(z.literal("")),

  notes: z.string()
    .max(5000, "Notes too long")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ═══════════════════════════════════════════════════════════════
// MATERIAL VALIDATION
// ═══════════════════════════════════════════════════════════════

export const MaterialSchema = z.object({
  sku: z.string()
    .min(1, "SKU required")
    .max(100, "SKU too long")
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/, "SKU must be alphanumeric"),

  name: z.string()
    .min(1, "Material name required")
    .max(200, "Material name too long")
    .trim(),

  category: z.string()
    .min(1, "Category required")
    .max(100, "Category too long")
    .trim(),

  unit: z.string()
    .max(20, "Unit too long")
    .trim(),

  unit_cost: z.number()
    .min(0, "Cost cannot be negative")
    .max(100000, "Cost unreasonably high")
    .finite()
    .nullable(),

  supplier_name: z.string()
    .max(200, "Supplier name too long")
    .trim()
    .optional()
    .or(z.literal("")),

  supplier_sku: z.string()
    .max(100, "Supplier SKU too long")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ═══════════════════════════════════════════════════════════════
// AI EXTRACTION VALIDATION
// ═══════════════════════════════════════════════════════════════

export const AIExtractionSchema = z.object({
  text: z.string()
    .min(10, "Input too short for AI extraction")
    .max(50000, "Input too long (50KB max)")
    .trim(),
});

// ═══════════════════════════════════════════════════════════════
// SEARCH/FILTER VALIDATION
// ═══════════════════════════════════════════════════════════════

export const SearchSchema = z.object({
  query: z.string()
    .max(200, "Search query too long")
    .trim(),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(50),

  offset: z.number()
    .int()
    .min(0)
    .max(10000)
    .default(0),
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize string input to prevent XSS
 * React escapes by default, but use for raw HTML or dangerous contexts
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate and sanitize file upload
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File too large (10MB max)" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }

  return { valid: true };
}
