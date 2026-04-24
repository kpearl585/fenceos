"use client";
import posthog, { type PostHog } from "posthog-js";

// Client-side PostHog initializer.
//
// No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset so preview deployments
// and local dev without the key don't blow up. Also skips init on the
// server (posthog-js is browser-only; use posthog-node in server paths).
//
// Autocapture OFF — we use explicit capture() calls only. Autocapture
// generates a lot of noisy events and the signal-to-noise ratio is bad
// for B2B dashboards where we care about specific funnel steps.
//
// Session replay OFF — no contractor has consented to recording yet.
// Revisit when privacy policy / terms cover it.

let initialized = false;

export function initPostHogClient(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!key) {
    // Soft-skip. Mirror the pattern used by the Sentry init: don't
    // log a warning, just quietly disable so previews work without
    // requiring a PostHog key.
    return;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only", // Don't create profiles for anon visitors.
    capture_pageview: true,              // Simple pageview tracking is fine.
    capture_pageleave: true,
    autocapture: false,                  // Explicit events only.
    disable_session_recording: true,     // Off until privacy policy covers it.
    loaded: () => { initialized = true; },
  });
  initialized = true;
}

// Typed accessor. Returns null when not initialized so callers must
// handle the "no analytics" case explicitly rather than silently
// sending into the void.
export function getPostHog(): PostHog | null {
  if (!initialized) return null;
  if (typeof window === "undefined") return null;
  return posthog;
}

// Identify a logged-in user by Supabase UUID and attach them to their
// org's group. Call on login (or when a page loads for an authenticated
// user). Safe to call every page load — PostHog dedupes internally.
//
// Uses UUID (not email) so accidental re-identify calls with a different
// property don't create duplicate users. Email goes in `properties`
// where it's searchable but not the identity key.
export function identifyUser(params: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  orgId: string;
  orgName?: string | null;
  plan?: string | null;
}): void {
  const ph = getPostHog();
  if (!ph) return;

  ph.identify(params.userId, {
    email: params.email ?? undefined,
    name: params.fullName ?? undefined,
  });

  // Group analytics by organization — B2B funnel metrics are account-
  // level, not seat-level. "How many orgs generated a packet this week"
  // is the question that matters, not "how many users." A contractor +
  // their assistant are one customer.
  ph.group("organization", params.orgId, {
    name: params.orgName ?? undefined,
    plan: params.plan ?? undefined,
  });
}

// Clear identity on logout so the next sign-in on a shared browser
// doesn't attribute events to the previous user.
export function resetPostHog(): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.reset();
}

// Thin capture wrapper that's safe to call whether or not PostHog is
// initialized. Keeps call sites clean:
//
//   captureEvent("estimate_saved", { total_lf: 180 });
//
// instead of:
//
//   const ph = getPostHog();
//   if (ph) ph.capture("estimate_saved", { total_lf: 180 });
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(event, properties);
}
