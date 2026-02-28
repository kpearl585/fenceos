"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { revalidatePath } from "next/cache";

export async function addMaterial(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await ensureProfile(supabase, user);

  const { error } = await supabase.from("materials").insert({
    org_id: profile.org_id,
    name: fd.get("name") as string,
    sku: (fd.get("sku") as string) || null,
    unit: fd.get("unit") as string,
    unit_cost: Number(fd.get("unit_cost")) || 0,
    unit_price: Number(fd.get("unit_price")) || 0,
    category: (fd.get("category") as string) || null,
    supplier: (fd.get("supplier") as string) || null,
    notes: (fd.get("notes") as string) || null,
  });

  if (error) throw new Error(`Failed to add material: ${error.message}`);
  revalidatePath("/dashboard/materials");
}

export async function deleteMaterial(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await ensureProfile(supabase, user);

  const id = fd.get("id") as string;
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to delete material: ${error.message}`);
  revalidatePath("/dashboard/materials");
}
