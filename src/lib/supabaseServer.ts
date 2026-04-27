import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceKey, getSupabaseUrl } from "@/lib/supabase/env";

// Server-only Supabase client using service role key.
// Never import this file in client components.
// Lazy-initialized to avoid build-time errors when env vars are not yet set.

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Set these environment variables before using lead capture."
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
