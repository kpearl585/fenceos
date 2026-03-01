import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error, count } = await supabase
      .from("estimates")
      .update({ status: "expired" })
      .eq("status", "quoted")
      .lt("quoted_at", thirtyDaysAgo.toISOString());

    if (error) throw error;

    return NextResponse.json({ success: true, expired: count });
  } catch (err) {
    console.error("[cron] expire-estimates error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
