"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { generateInvoiceForJob } from "@/lib/jobs/invoice";

export async function markJobPaidAndSendInvoice(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  return generateInvoiceForJob(jobId, profile);
}
