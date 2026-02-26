import { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "./roles";

/**
 * Ensures a public.users profile exists for the authenticated user.
 * Uses a SECURITY DEFINER RPC function to atomically create org + profile,
 * avoiding the RLS chicken-and-egg problem where SELECT policies on
 * organizations require a users row that doesn't exist yet.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  authUser: { id: string; email?: string }
): Promise<UserProfile> {
  // Fast path: check if profile already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id, auth_id, org_id, email, full_name, role")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (existing) {
    return existing as UserProfile;
  }

  // Bootstrap via SECURITY DEFINER function — creates org + profile atomically
  const { data, error } = await supabase.rpc("bootstrap_user_profile");

  if (error) {
    throw new Error("Bootstrap failed: " + error.message);
  }

  return data as UserProfile;
}
