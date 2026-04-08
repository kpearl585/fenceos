"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, onboardingWelcomeEmail } from "@/lib/email";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const refCode = (formData.get("ref") as string | null) ?? "";

  const { error, data: signUpData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Store referral code in user metadata so it's available after email confirmation
      data: refCode ? { referral_code: refCode } : {},
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Track referral: look up the referring org and record the referral
  if (refCode && signUpData?.user?.id) {
    try {
      const adminClient = (await import("@/lib/supabase/server")).createAdminClient();
      // Find org whose ID starts with the ref code (first 8 chars of org_id, no dashes)
      const { data: orgs } = await adminClient
        .from("organizations")
        .select("id")
        .limit(50);
      const referringOrg = orgs?.find(
        (o: { id: string }) => o.id.replace(/-/g, "").substring(0, 8) === refCode
      );
      if (referringOrg) {
        await adminClient.from("referrals").insert({
          referring_org_id: referringOrg.id,
          referred_email: email,
          referred_user_id: signUpData.user.id,
          status: "pending",
        }).select();
      }
    } catch (_) {
      // non-blocking — referral tracking failure should never break signup
    }
  }

  // Send welcome email immediately on signup — non-blocking
  try {
    await sendEmail({
      to: email,
      subject: "Welcome to FenceEstimatePro — here is what you can do",
      html: onboardingWelcomeEmail({
        ownerEmail: email,
        dashboardUrl: "https://fenceestimatepro.com/dashboard",
      }),
    });
  } catch (_) {
    // never block signup if email fails
  }

  redirect("/signup?message=Check your email to confirm your account");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
