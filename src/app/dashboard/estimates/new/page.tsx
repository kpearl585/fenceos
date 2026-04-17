import { redirect } from "next/navigation";

// Legacy path consolidation — see 2026-04-17 audit Finding 3.
//
// Until this commit there were two "new estimate" entry points:
//   - /dashboard/estimates/new        (basic form with fence type dropdown)
//   - /dashboard/advanced-estimate    (graph-based engine with AI extraction,
//                                     paywall, BOM export, closeout intel)
//
// The Header button + Estimates index page + OnboardingChecklist all pointed
// here; the dashboard home CTAs pointed at advanced-estimate. A new user got
// contradictory wayfinding depending on which entry point they clicked.
//
// The advanced path is where every server action, paywall trigger, and
// Sentry funnel event has been wired. The basic path's createEstimate action
// has no external callers besides its own form. Consolidating to the
// advanced path removes the contradiction and unifies instrumentation.
//
// This file now redirects so bookmarks and stale share links continue to
// work. The old form component and its createEstimate server action are
// orphaned but not deleted — a follow-up commit can remove them once we've
// confirmed nothing outside the repo (help docs, marketing links) points to
// the old basic form.

export default async function NewEstimateRedirect({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  // The advanced estimator doesn't currently accept a customerId prefill;
  // preserving the query param so a follow-up can wire it in without breaking
  // existing links when we do.
  redirect(
    customerId
      ? `/dashboard/advanced-estimate?customerId=${encodeURIComponent(customerId)}`
      : "/dashboard/advanced-estimate"
  );
}
