// ── Photo Estimator — request/response validation ────────────────
// Zod schemas for the public /api/public/photo-estimate endpoints.
// Image validation (MIME + size) happens imperatively in the route
// handler because Zod doesn't model File well in server runtimes.

import { z } from "zod";

/** Form-field text inputs alongside the image upload. */
export const PhotoEstimateRequestSchema = z.object({
  additionalContext: z
    .string()
    .max(500, "Additional context is too long (max 500 characters).")
    .optional(),
  locationHint: z
    .string()
    .max(100, "Location hint is too long (max 100 characters).")
    .optional(),
});

/** Claim an anonymous estimate by email. Signup + estimate transfer happens
 *  on the confirmation step after the user clicks the email link. */
export const PhotoEstimateClaimSchema = z.object({
  claim_token: z.string().uuid("Invalid claim token."),
  email: z.string().email("Please enter a valid email address.").toLowerCase(),
});

export type PhotoEstimateRequest = z.infer<typeof PhotoEstimateRequestSchema>;
export type PhotoEstimateClaim   = z.infer<typeof PhotoEstimateClaimSchema>;

// Image constraints used by the route handler. Exported for reuse by the
// client-side form so both sides reject the same files.
export const PHOTO_ESTIMATE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const PHOTO_ESTIMATE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoEstimateMime = (typeof PHOTO_ESTIMATE_ALLOWED_MIMES)[number];

export function isAllowedPhotoMime(mime: string): mime is PhotoEstimateMime {
  return (PHOTO_ESTIMATE_ALLOWED_MIMES as readonly string[]).includes(mime);
}
