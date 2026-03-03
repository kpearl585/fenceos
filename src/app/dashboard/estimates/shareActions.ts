"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { sendEmail, estimateShareEmail } from "@/lib/email";
import { redirect } from "next/navigation";

export async function sendEstimateEmail(
  fd: FormData
): Promise<{ success: boolean; error?: string }> {
  const estimateId = fd.get("estimateId") as string;
  const to = fd.get("to") as string;

  if (!estimateId || !to) return { success: false, error: "Missing fields" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  const { data: est } = await supabase
    .from("estimates")
    .select("id, total, accept_token, title, customers(name), organizations(name)")
    .eq("id", estimateId)
    .eq("org_id", profile.org_id)
    .single();

  if (!est || !est.accept_token) {
    return { success: false, error: "Estimate not found or not quoted yet" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com";
  const acceptUrl = `${baseUrl}/accept/${estimateId}/${est.accept_token}`;

  const orgObj = est.organizations as unknown as { name: string } | { name: string }[] | null;
  const orgName =
    (Array.isArray(orgObj) ? orgObj[0]?.name : (orgObj as { name: string } | null)?.name) ||
    "Your Contractor";
  const customerName =
    (est.customers as unknown as { name: string }[])?.[0]?.name || "there";

  try {
    await sendEmail({
      to,
      subject: `Your fence estimate from ${orgName} is ready`,
      html: estimateShareEmail({
        orgName,
        customerName,
        total: Number(est.total),
        acceptUrl,
        expiryDays: 30,
      }),
    });

    // Log the send (columns added in migration 20260303000000_fix_change_orders_schema.sql)
    const admin = createAdminClient();
    try {
      await admin
        .from("estimates")
        .update({ last_sent_at: new Date().toISOString(), last_sent_to: to })
        .eq("id", estimateId);
    } catch {
      // Non-blocking — email already sent; columns may not exist yet if migration pending
    }

    return { success: true };
  } catch (err) {
    console.error("[shareActions] sendEstimateEmail error:", err);
    return { success: false, error: "Email send failed" };
  }
}
