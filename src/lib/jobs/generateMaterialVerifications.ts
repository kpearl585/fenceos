import { createClient } from "@/lib/supabase/server";

export async function generateMaterialVerifications(
  jobId: string
): Promise<void> {
  const supabase = await createClient();
  const { data: materials, error: loadErr } = await supabase
    .from("job_line_items")
    .select("sku, name, qty")
    .eq("job_id", jobId)
    .eq("type", "material")
    .not("sku", "is", null);
  if (loadErr) {
    throw new Error(`Failed to load job materials: ${loadErr.message}`);
  }
  if (!materials || materials.length === 0) return;
  const rows = materials.map((m) => ({
    job_id: jobId,
    sku: m.sku as string,
    name: m.name || m.sku || "Unknown",
    required_qty: Number(m.qty) || 0,
  }));
  const { error } = await supabase
    .from("job_material_verifications")
    .upsert(rows, { onConflict: "job_id,sku", ignoreDuplicates: true });
  if (error) {
    throw new Error(`Failed to generate material verifications: ${error.message}`);
  }
}
