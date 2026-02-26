import { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, Role } from "./roles";

/**
 * Ensures a public.users profile exists for the authenticated user.
 * If no profile exists:
 *   1. Creates an organization for the user.
 *   2. Creates a users row with role = 'owner'.
 * Returns the user profile.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  authUser: { id: string; email?: string }
): Promise<UserProfile> {
  // Try to fetch existing profile
  const { data: existing, error: fetchErr } = await supabase
    .from("users")
    .select("id, auth_id, org_id, email, full_name, role")
    .eq("auth_id", authUser.id)
    .single();

  if (existing && !fetchErr) {
    return existing as UserProfile;
  }

  // No profile — create org + profile in one flow
  const email = authUser.email ?? "";
  const orgName = email.split("@")[0] + "'s Org";

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgErr || !org) {
    throw new Error("Failed to create organization: " + (orgErr?.message ?? "unknown"));
  }

  const role: Role = "owner"; // First user is always owner

  const { data: profile, error: profileErr } = await supabase
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
    throw new Error("Failed to create user profile: " + (profileErr?.message ?? "unknown"));
  }

  return profile as UserProfile;
}
