// Client-side Sentry instrumentation entry point.
//
// @sentry/nextjs v10 (and Next.js 15+) moved the browser SDK init from the
// webpack-auto-loaded sentry.client.config.ts to this file. Without it, the
// client SDK never initializes and no browser errors land in Sentry.
//
// We import the existing config so the init options stay in one place.
import "./sentry.client.config";

import * as Sentry from "@sentry/nextjs";

// Required by @sentry/nextjs v10 to instrument App Router navigations as
// performance transactions. Without this export, SPA route transitions are
// invisible in Sentry's Performance tab.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
