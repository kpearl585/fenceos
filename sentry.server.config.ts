// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in development, 20% in production to control cost while still
  // catching performance regressions on server actions.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out noise
  beforeSend(event, hint) {
    // Ignore Supabase auth token refresh errors (expected behavior)
    if (event.exception?.values?.[0]?.value?.includes('refresh_token_not_found')) {
      return null;
    }
    return event;
  },

  ignoreErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],
});
