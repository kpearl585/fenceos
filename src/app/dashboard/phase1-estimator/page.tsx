/**
 * Phase 1 Estimator — SUNSET REDIRECT
 *
 * The Phase 1 estimator has been superseded by the Advanced Estimator
 * with Simple Mode (which provides the same quick-entry UX with the
 * full graph-based engine underneath). Any bookmarks or links to the
 * old Phase 1 page now redirect to the Advanced Estimator.
 *
 * Existing Phase 1 estimates at /dashboard/phase1-estimator/[design_id]
 * still render (read-only) so contractors can reference old work.
 */

import { redirect } from "next/navigation";

export default function Phase1EstimatorPage() {
  redirect("/dashboard/advanced-estimate");
}
