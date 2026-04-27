// Constructs public Supabase Storage URLs for AR assets stored in the ar-assets bucket.
import { getSupabaseUrl } from "@/lib/supabase/env";

const SUPABASE_URL = getSupabaseUrl();

export interface ARAssetUrls {
  glbUrl: string;
  usdzUrl: string;
  thumbnailUrl?: string;
}

export function getARAssetUrls(
  glbPath: string,
  usdzPath: string,
  thumbnailPath?: string
): ARAssetUrls {
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  const base = `${SUPABASE_URL}/storage/v1/object/public/ar-assets`;
  return {
    glbUrl: `${base}/${glbPath}`,
    usdzUrl: `${base}/${usdzPath}`,
    thumbnailUrl: thumbnailPath ? `${base}/${thumbnailPath}` : undefined,
  };
}
