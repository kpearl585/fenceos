import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMaterialVerifications(jobId: string): Promise<void> {
  const userClient = await createClient();
  const adminClient = createAdminClient();

  // Read with user-scoped client (respects RLS)
  const { data: materials, error: loadErr } = await userClient
    .from("job_line_items")
    .select("sku, name, qty")
    .eq("job_id", jobId)
    .eq("type", "material")
    .not("sku", "is", null);

  if (loadErr) throw new Error(`Failed to load job materials: ${loadErr.message}`);
  if (!materials || materials.length === 0) return;

  const rows = materials.map((m) => ({
    job_id: jobId,
    sku: m.sku as string,
    name: m.name || m.sku || "Unknown",
    required_qty: Number(m.qty) || 0,
  }));

  // Write with admin client (bypasses RLS for insert)
  const { error } = await adminClient
    .from("job_material_verifications")
    .upsert(rows, { onConflict: "job_id,sku", ignoreDuplicates: true });

  if (error) throw new Error(`Failed to generate material verifications: ${error.message}`);
}
