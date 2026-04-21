"use client";
import { useEffect } from "react";
import {
  initPostHogClient,
  identifyUser,
  resetPostHog,
} from "@/lib/analytics/posthog-client";

interface PostHogProviderProps {
  // Pre-resolved user + org info from the server layout. Null when
  // there's no authenticated user — provider still initializes PostHog
  // for anon pageview tracking but skips identify. If there's a cached
  // distinct_id from a previous session, we call reset() so the next
  // sign-in on a shared browser doesn't attribute events to the prior
  // user. PostHog's reset is idempotent when nothing's cached, so
  // calling it on every anon load is safe and cheaper than tracking
  // "was previously signed in" state ourselves.
  identity: {
    userId: string;
    email: string | null;
    fullName: string | null;
    orgId: string;
    orgName: string | null;
    plan: string | null;
  } | null;
}

export default function PostHogProvider({ identity }: PostHogProviderProps) {
  useEffect(() => {
    initPostHogClient();
    if (identity) {
      identifyUser(identity);
    } else {
      resetPostHog();
    }
  }, [identity]);

  return null;
}
