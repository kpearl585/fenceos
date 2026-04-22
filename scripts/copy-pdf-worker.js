#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Copy the pdfjs-dist worker into /public so it ships with the app
 * and loads from our own origin (satisfies `worker-src 'self'` in the
 * CSP without having to whitelist a CDN).
 *
 * Runs automatically via predev + prebuild hooks in package.json.
 *
 * Why not use Next.js's `new URL(..., import.meta.url)` asset import?
 * That pattern depends on bundler config nuances and doesn't always
 * work reliably across Turbopack + Vercel. A straight file copy is
 * boring and bulletproof.
 */

const fs = require("node:fs");
const path = require("node:path");

const srcRelative = "pdfjs-dist/build/pdf.worker.min.mjs";
const destDir = path.resolve(process.cwd(), "public");
const destPath = path.join(destDir, "pdf.worker.min.mjs");

try {
  // Resolve the worker file out of node_modules. `require.resolve` works
  // whether we're in a monorepo, a worktree, or the root checkout.
  const src = require.resolve(srcRelative);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, destPath);
  // eslint-disable-next-line no-console
  console.log(`[copy-pdf-worker] ${srcRelative} → public/pdf.worker.min.mjs`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`[copy-pdf-worker] failed:`, err && err.message ? err.message : err);
  // Don't hard-fail the build — the worker is only needed for the
  // Marked Survey feature. Without it the feature throws a clearer
  // error at upload time, but the rest of the app still builds.
  process.exit(0);
}
