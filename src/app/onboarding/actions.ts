"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { sendEmail, onboardingWelcomeEmail } from "@/lib/email";

export async function saveOnboarding(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const admin = createAdminClient();

  const companyName   = (fd.get("company_name") as string)?.trim();
  const fullName      = (fd.get("full_name") as string)?.trim();
  const phone         = (fd.get("phone") as string)?.trim();
  const city          = (fd.get("city") as string)?.trim();
  const state         = (fd.get("state") as string)?.trim();
  const targetMargin  = parseFloat((fd.get("target_margin") as string) || "35") / 100;
  const laborRate     = parseFloat((fd.get("labor_rate") as string) || "65");

  if (!companyName) redirect("/onboarding?error=Company+name+is+required");

  // Update org name
  await admin
    .from("organizations")
    .update({ name: companyName })
    .eq("id", profile.org_id);

  // Update user full name
  if (fullName) {
    await admin
      .from("users")
      .update({ full_name: fullName })
      .eq("id", profile.id);
  }

  // Upsert org settings with target margin + labor rate
  await admin
    .from("org_settings")
    .upsert({
      org_id: profile.org_id,
      target_margin_pct: targetMargin,
      default_labor_rate: laborRate,
    }, { onConflict: "org_id" });

  // Send onboarding welcome email — never block the redirect if this fails
  try {
    const ownerEmail = user.email;
    if (ownerEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com";
      const dashboardUrl = `${baseUrl}/dashboard?welcome=1`;
      await sendEmail({
        to: ownerEmail,
        subject: "Welcome to FenceEstimatePro — let's get you set up",
        html: onboardingWelcomeEmail({
          orgName: companyName,
          ownerEmail,
          dashboardUrl,
        }),
      });
    }
  } catch (emailErr) {
    console.error("[onboarding] Welcome email failed:", emailErr);
  }

  redirect("/dashboard?welcome=1");
}
