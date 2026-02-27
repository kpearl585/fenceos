import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const profile = await ensureProfile(supabase, user);

  // Owner-only guard
  if (profile.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: owner role required" },
      { status: 403 }
    );
  }

  // Query the summary view for this org
  const { data: summaryRows, error: summaryErr } = await supabase
    .from("owner_margin_summary_view")
    .select("*")
    .eq("org_id", profile.org_id);

  if (summaryErr) {
    return NextResponse.json(
      { error: summaryErr.message },
      { status: 500 }
    );
  }

  // Default summary if no data yet
  const summary = summaryRows?.[0] ?? {
    org_id: profile.org_id,
    total_quoted_revenue: 0,
    total_accepted_revenue: 0,
    total_active_job_revenue: 0,
    total_completed_revenue: 0,
    total_estimated_gross_profit: 0,
    total_actual_gross_profit: 0,
    avg_margin_pct: 0,
    jobs_below_target_margin_count: 0,
    margin_delta_from_change_orders: 0,
  };

  // Query the at-risk jobs view for this org
  const { data: atRiskJobs, error: riskErr } = await supabase
    .from("owner_jobs_risk_view")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("margin_erosion_pct", { ascending: false });

  if (riskErr) {
    return NextResponse.json(
      { error: riskErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    summary,
    atRiskJobs: atRiskJobs ?? [],
  });
}
