// TEMPORARY DEBUG ROUTE — remove after diagnosis
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { FENCE_TYPE_OPTIONS } from "@/lib/estimate-engine";
import { createEstimate } from "@/app/dashboard/estimates/actions";

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("1_createClient");
    const supabase = await createClient();

    steps.push("2_getUser");
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) return Response.json({ step: "2_getUser", error: authErr.message, steps });
    if (!user) return Response.json({ step: "2_getUser", error: "not authenticated", steps });

    steps.push("3_ensureProfile");
    const profile = await ensureProfile(supabase, user);

    steps.push("4_canAccess");
    const ok = canAccess(profile.role, "estimates");

    steps.push("5_customersQuery");
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("id, name")
      .eq("org_id", profile.org_id)
      .order("name");

    steps.push("6_fenceTypeOptions");
    const opts = FENCE_TYPE_OPTIONS;

    steps.push("7_createEstimateRef");
    const fnType = typeof createEstimate;

    return Response.json({
      ok: true,
      steps,
      profile: { id: profile.id, org_id: profile.org_id, role: profile.role },
      canAccess: ok,
      customerCount: customers?.length ?? 0,
      customerError: custErr?.message ?? null,
      fenceTypeCount: opts.length,
      createEstimateType: fnType,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : null,
    });
  }
}
