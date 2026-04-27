import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase public env vars. Expected NEXT_PUBLIC_SUPABASE_URL and a publishable/anon key."
    );
  }

  return createBrowserClient(
    url,
    key
  );
}
