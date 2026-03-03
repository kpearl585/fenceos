// TEMPORARY MIGRATION ROUTE — remove after use
// Only runs if secret token matches
import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const SECRET = "pv-migrate-2026";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Check available connection env vars (masked)
  const envCheck: Record<string, string> = {};
  for (const key of ["POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL",
    "DATABASE_URL", "SUPABASE_DB_URL", "DIRECT_URL"]) {
    const v = process.env[key];
    envCheck[key] = v ? `SET (${v.substring(0, 30)}...)` : "NOT SET";
  }

  return Response.json({ envCheck, message: "Env check complete" });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // Try to run migration via a creative workaround using admin client
  // We'll insert a test row and check what columns exist
  const admin = createAdminClient();

  // Try each ALTER TABLE statement individually
  // Supabase PostgREST doesn't support DDL, but we can check if columns exist
  // by attempting a select and catching the error
  const colsToAdd = [
    { table: "change_orders", col: "reason", type: "text" },
    { table: "change_orders", col: "subtotal", type: "numeric" },
    { table: "change_orders", col: "cost_total", type: "numeric" },
    { table: "change_orders", col: "gross_profit", type: "numeric" },
    { table: "change_orders", col: "gross_margin_pct", type: "numeric" },
    { table: "change_orders", col: "approved_by", type: "uuid" },
    { table: "change_orders", col: "approved_at", type: "timestamptz" },
    { table: "change_orders", col: "notes", type: "text" },
    { table: "change_order_line_items", col: "sort_order", type: "integer" },
  ];

  for (const { table, col } of colsToAdd) {
    const { error } = await admin.from(table as "change_orders").select(col).limit(0);
    if (error && error.message.includes("does not exist")) {
      results.push(`MISSING: ${table}.${col}`);
    } else if (error) {
      results.push(`ERROR checking ${table}.${col}: ${error.message}`);
    } else {
      results.push(`EXISTS: ${table}.${col}`);
    }
  }

  return Response.json({
    results,
    note: "DDL cannot run via REST API. See results for missing columns.",
  });
}
