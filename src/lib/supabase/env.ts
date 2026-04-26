function sanitizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  const cleaned = value.replace(/\\n/g, "").trim();
  return cleaned || undefined;
}

export function getSupabaseUrl() {
  return (
    sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    sanitizeEnvValue(process.env.SUPABASE_URL)
  );
}

export function getSupabasePublicKey() {
  return (
    sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    sanitizeEnvValue(process.env.SUPABASE_PUBLISHABLE_KEY) ??
    sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    sanitizeEnvValue(process.env.SUPABASE_ANON_KEY)
  );
}

export function getSupabaseServiceKey() {
  return (
    sanitizeEnvValue(process.env.SUPABASE_SECRET_KEY) ??
    sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
