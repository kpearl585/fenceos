import { createAdminClient } from "@/lib/supabase/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_suppressions")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) {
    console.error("[email_suppressions] lookup failed:", error.message);
    return false;
  }

  return Boolean(data?.email);
}

export async function suppressEmail(
  email: string,
  source = "unsubscribe_page",
  reason = "marketing_opt_out"
) {
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  const { error } = await admin
    .from("email_suppressions")
    .upsert(
      {
        email: normalized,
        source,
        reason,
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

  if (error) {
    throw new Error(`Failed to suppress email: ${error.message}`);
  }
}

export async function clearEmailSuppression(email: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_suppressions")
    .delete()
    .eq("email", normalizeEmail(email));

  if (error) {
    throw new Error(`Failed to clear email suppression: ${error.message}`);
  }
}
