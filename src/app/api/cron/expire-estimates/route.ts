import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Expire estimates that were quoted more than 30 days ago (not created_at).
  const { data, error } = await supabase
    .from("estimates")
    .update({ status: "expired" })
    .eq("status", "quoted")
    .lt("quoted_at", thirtyDaysAgo.toISOString())
    .select("id");

  if (error) {
    console.error("[expire-estimates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length ?? 0;

  return NextResponse.json({ expired: count, timestamp: new Date().toISOString() });
}
