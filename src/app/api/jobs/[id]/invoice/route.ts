import { NextRequest, NextResponse } from "next/server";

import { ensureProfile } from "@/lib/bootstrap";
import { generateInvoiceForJob } from "@/lib/jobs/invoice";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const profile = await ensureProfile(supabase, user);
  if (profile.role !== "owner") {
    return NextResponse.json({ error: "Only owners can send invoices." }, { status: 403 });
  }

  const result = await generateInvoiceForJob(id, profile);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Invoice generation failed." }, { status: 400 });
  }

  return NextResponse.json(result);
}
