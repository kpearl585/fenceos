import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserProfile, Role } from "./roles";

/**
 * Ensures a public.users profile exists for the authenticated user.
 * If no profile exists:
 *   1. Creates an organization for the user.
 *   2. Creates a users row with role = 'owner'.
 * Returns the user profile.
 *
 * NOTE: Inserts use the service-role admin client to bypass RLS —
 * new users have no profile yet and cannot satisfy row-level policies.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  authUser: { id: string; email?: string }
): Promise<UserProfile> {
  // Try to fetch existing profile using the user's own client
  const { data: existing, error: fetchErr } = await supabase
    .from("users")
    .select("id, auth_id, org_id, email, full_name, role")
    .eq("auth_id", authUser.id)
    .single();

  if (existing && !fetchErr) {
    return existing as UserProfile;
  }

  // No profile found — use admin client to bypass RLS for inserts
  const admin = createAdminClient();
  const email = authUser.email ?? "";
  const orgName = email.split("@")[0] + "'s Org";

  // 1. Create organization
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgErr || !org) {
    throw new Error(
      "Failed to create organization: " + (orgErr?.message ?? "unknown")
    );
  }

  const role: Role = "owner"; // First user is always owner

  // 2. Create user profile
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .insert({
      auth_id: authUser.id,
      org_id: org.id,
      email,
      role,
    })
    .select("id, auth_id, org_id, email, full_name, role")
    .single();

  if (profileErr || !profile) {
    // Rollback: remove the org we just created so we don't leave orphans
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(
      "Failed to create user profile: " + (profileErr?.message ?? "unknown")
    );
  }

  return profile as UserProfile;
}
