import { PostHog } from "posthog-node";

// Server-side PostHog client for events that must fire reliably even
// if the user's browser blocks tracking — e.g. `quote_accepted`, the
// terminal conversion event in the contractor funnel. Client-side
// tracking on that page would miss datapoints when the customer's
// browser has an ad blocker or DNT enabled.
//
// Lazy-init singleton pattern (mirrors OpenAI + Resend clients in this
// repo): `new PostHog()` eagerly at module top level throws during
// Next's page-data collection when the env var is missing. Deferring
// to first call + checking the env var each time keeps builds green.

let client: PostHog | null = null;
let attemptedInit = false;

function getClient(): PostHog | null {
  if (attemptedInit) return client;
  attemptedInit = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").trim();

  if (!key) return null;

  client = new PostHog(key, {
    host,
    // `flushAt: 1` means every event flushes immediately — the default
    // of 20 batches events in memory, which works fine for long-running
    // services but loses events on Vercel where functions freeze
    // between invocations. For now we prioritize delivery reliability
    // over throughput since volume is low.
    flushAt: 1,
    flushInterval: 0,
  });

  return client;
}

// Fire-and-forget server-side event. Safe to call even when PostHog
// env vars aren't set (no-op). Awaits the flush so Vercel functions
// don't freeze mid-send.
//
// Pass `distinctId` as the Supabase user UUID when the event has an
// authenticated actor (contractor firing events from a dashboard
// action). For customer-side events on /quote/[token] use a stable
// per-token synthetic id like `quote-<token>` — that way every time
// the customer revisits we attribute to the same "person" without
// tracking their real identity.
export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  orgId?: string;  // Attaches the event to the org group.
}): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: params.properties,
      groups: params.orgId ? { organization: params.orgId } : undefined,
    });
    // Flush immediately (flushAt: 1 above makes capture() queue one,
    // but on Vercel serverless we need to await the flush before the
    // function returns or the event is lost).
    await ph.flush();
  } catch (err) {
    // Analytics must never break the user-facing action. Log and swallow.
    console.error("PostHog server capture failed:", err);
  }
}
