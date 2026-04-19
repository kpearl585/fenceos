/**
 * GET /api/cron/photo-estimate-cleanup
 *
 * Daily housekeeping for the public AI Photo Estimator:
 *   1. Hard-delete uploaded photos older than 7 days from the
 *      photo-estimate-uploads bucket. Photos are only needed long
 *      enough for a user to see their result + decide to claim.
 *   2. Hard-delete public_photo_estimates rows older than 30 days
 *      that are still unclaimed. Claimed rows stay — they're
 *      referenced by fence_graphs via claimed_fence_graph_id.
 *
 * Scheduled daily at 03:00 UTC via vercel.json. Requires CRON_SECRET
 * bearer header (same pattern as the other cron routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

const BUCKET = "photo-estimate-uploads";
const UPLOAD_RETENTION_DAYS = 7;
const ROW_RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const uploadCutoff = new Date(now - UPLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const rowCutoff = new Date(now - ROW_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result: {
    storage_scanned: number;
    storage_deleted: number;
    storage_errors: number;
    rows_deleted: number;
  } = {
    storage_scanned: 0,
    storage_deleted: 0,
    storage_errors: 0,
    rows_deleted: 0,
  };

  // ── Storage cleanup ────────────────────────────────────────────
  // Uploads are grouped by YYYY-MM-DD folder. Iterate day folders up
  // to the retention cutoff and batch-delete everything inside each.
  try {
    const { data: topLevel, error: listErr } = await admin.storage
      .from(BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (listErr) throw listErr;

    const dayFolders = (topLevel ?? [])
      .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .filter((entry) => new Date(entry.name) < uploadCutoff);

    for (const folder of dayFolders) {
      const { data: files, error: filesErr } = await admin.storage
        .from(BUCKET)
        .list(folder.name, { limit: 1000 });

      if (filesErr) {
        result.storage_errors++;
        console.error(
          `[photo-estimate-cleanup] list error on ${folder.name}:`,
          filesErr.message
        );
        continue;
      }
      if (!files || files.length === 0) continue;

      const paths = files.map((f) => `${folder.name}/${f.name}`);
      result.storage_scanned += paths.length;

      const { error: rmErr } = await admin.storage
        .from(BUCKET)
        .remove(paths);
      if (rmErr) {
        result.storage_errors++;
        console.error(
          `[photo-estimate-cleanup] remove error on ${folder.name}:`,
          rmErr.message
        );
      } else {
        result.storage_deleted += paths.length;
      }
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "cleanup_storage" },
    });
    console.error("[photo-estimate-cleanup] storage phase threw:", err);
    result.storage_errors++;
  }

  // ── DB row cleanup ─────────────────────────────────────────────
  try {
    const { data: deleted, error: deleteErr } = await admin
      .from("public_photo_estimates")
      .delete()
      .is("claimed_at", null)
      .lt("created_at", rowCutoff.toISOString())
      .select("id");

    if (deleteErr) throw deleteErr;
    result.rows_deleted = deleted?.length ?? 0;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "cleanup_rows" },
    });
    console.error("[photo-estimate-cleanup] row phase threw:", err);
  }

  return NextResponse.json({
    ...result,
    upload_cutoff: uploadCutoff.toISOString(),
    row_cutoff: rowCutoff.toISOString(),
    ran_at: new Date().toISOString(),
  });
}
