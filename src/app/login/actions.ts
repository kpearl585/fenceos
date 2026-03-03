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

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Send welcome email immediately on signup — non-blocking
  try {
    await sendEmail({
      to: data.email,
      subject: "Welcome to FenceEstimatePro — here is what you can do",
      html: onboardingWelcomeEmail({
        ownerEmail: data.email,
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
