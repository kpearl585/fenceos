import { createClient } from "@/lib/supabase/server";

export async function uploadJobPhoto(
  jobId: string,
  orgId: string,
  userId: string,
  file: File,
  caption?: string
): Promise<{ photoId: string; storagePath: string }> {
  const supabase = await createClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${orgId}/${jobId}/${timestamp}_${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from("job-photos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    throw new Error(`Photo upload failed: ${uploadErr.message}`);
  }
  const { data: photo, error: insertErr } = await supabase
    .from("job_photos")
    .insert({
      job_id: jobId,
      storage_path: storagePath,
      caption: caption || null,
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (insertErr) {
    await supabase.storage.from("job-photos").remove([storagePath]);
    throw new Error(`Failed to save photo record: ${insertErr.message}`);
  }
  return { photoId: photo.id, storagePath };
}
