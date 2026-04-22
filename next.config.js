const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // 400 DPI rasterization of a letter-size PDF produces ~6-10 MB base64,
      // and larger/multi-page surveys can push ~15 MB. 10 MB was hitting the
      // limit with a generic 413 on real-world marked plats, surfacing to the
      // client as "unexpected response" (Sentry FENCEOS-9). 20 MB gives the
      // 400 DPI path comfortable headroom without opening the door to
      // arbitrarily large uploads.
      bodySizeLimit: "20mb",
    },
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  org: "pearl-labs-llc-u5",
  project: "fenceos",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // New webpack configuration format (replaces deprecated options)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
