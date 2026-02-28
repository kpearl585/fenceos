import { createAdminClient } from "@/lib/supabase/server";

const CHECKLIST_TEMPLATES: Record<
  string,
  { item_key: string; label: string; required: boolean }[]
> = {
  wood_privacy: [
    { item_key: "mark_utilities", label: "Mark utility lines", required: true },
    { item_key: "set_posts", label: "Set posts in concrete", required: true },
    { item_key: "attach_rails", label: "Attach horizontal rails", required: true },
    { item_key: "install_pickets", label: "Install pickets / boards", required: true },
    { item_key: "install_gates", label: "Install gate(s)", required: false },
    { item_key: "final_walkthrough", label: "Final walkthrough with customer", required: true },
  ],
  chain_link: [
    { item_key: "mark_utilities", label: "Mark utility lines", required: true },
    { item_key: "set_posts", label: "Set terminal & line posts", required: true },
    { item_key: "install_top_rail", label: "Install top rail", required: true },
    { item_key: "stretch_mesh", label: "Stretch & tie mesh fabric", required: true },
    { item_key: "final_walkthrough", label: "Final walkthrough with customer", required: true },
  ],
  vinyl: [
    { item_key: "mark_utilities", label: "Mark utility lines", required: true },
    { item_key: "set_posts", label: "Set vinyl posts in concrete", required: true },
    { item_key: "assemble_panels", label: "Assemble & attach panels", required: true },
    { item_key: "final_walkthrough", label: "Final walkthrough with customer", required: true },
  ],
};

const DEFAULT_CHECKLIST = [
  { item_key: "mark_utilities", label: "Mark utility lines", required: true },
  { item_key: "set_posts", label: "Set posts", required: true },
  { item_key: "install_fence", label: "Install fence sections", required: true },
  { item_key: "final_walkthrough", label: "Final walkthrough with customer", required: true },
];

export async function generateChecklist(jobId: string, fenceType: string | null): Promise<void> {
  const supabase = createAdminClient();
  const template = CHECKLIST_TEMPLATES[fenceType ?? ""] ?? DEFAULT_CHECKLIST;
  const rows = template.map((item, idx) => ({
    job_id: jobId,
    item_key: item.item_key,
    label: item.label,
    required: item.required,
    sort_order: idx,
  }));
  const { error } = await supabase
    .from("job_checklists")
    .upsert(rows, { onConflict: "job_id,item_key", ignoreDuplicates: true });
  if (error) throw new Error(`Failed to generate checklist: ${error.message}`);
}
