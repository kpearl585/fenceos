/**
 * Rate Limiting for FenceEstimatePro
 *
 * Prevents abuse of expensive operations (AI calls, PDF generation, etc.)
 * Uses in-memory store for simplicity. For production at scale, consider Redis.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Unique identifier (user ID, org ID, IP, etc.) */
  key: string;
  /** Maximum requests allowed in window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  error?: string;
}

/**
 * Check if a request is within rate limits
 *
 * @example
 * const result = checkRateLimit({
 *   key: `ai-extract:${orgId}`,
 *   limit: 20,
 *   windowMs: 60 * 60 * 1000, // 1 hour
 * });
 *
 * if (!result.success) {
 *   return { error: result.error };
 * }
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(config.key);

  // No record or window expired - start fresh
  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(config.key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Within window - check limit
  if (record.count >= config.limit) {
    const resetInMinutes = Math.ceil((record.resetAt - now) / 60000);
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: record.resetAt,
      error: `Rate limit exceeded. Try again in ${resetInMinutes} minute${resetInMinutes > 1 ? 's' : ''}.`,
    };
  }

  // Increment count
  record.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Predefined rate limiters for common operations
 */
export const RateLimiters = {
  /** AI extraction: 20 requests per hour per org */
  aiExtraction: (orgId: string) =>
    checkRateLimit({
      key: `ai-extract:${orgId}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    }),

  /** PDF generation: 50 per hour per org */
  pdfGeneration: (orgId: string) =>
    checkRateLimit({
      key: `pdf-gen:${orgId}`,
      limit: 50,
      windowMs: 60 * 60 * 1000,
    }),

  /** Excel export: 50 per hour per org */
  excelExport: (orgId: string) =>
    checkRateLimit({
      key: `excel-export:${orgId}`,
      limit: 50,
      windowMs: 60 * 60 * 1000,
    }),

  /** Estimate creation: 100 per hour per org */
  estimateCreation: (orgId: string) =>
    checkRateLimit({
      key: `estimate-create:${orgId}`,
      limit: 100,
      windowMs: 60 * 60 * 1000,
    }),

  /** Closeout submissions: 20 per hour per org */
  closeoutSubmission: (orgId: string) =>
    checkRateLimit({
      key: `closeout:${orgId}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    }),

  /** Login attempts: 5 per 15 minutes per IP */
  loginAttempts: (ip: string) =>
    checkRateLimit({
      key: `login:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    }),
};
