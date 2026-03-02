import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!["owner", "sales"].includes(profile.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { rows } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 customers per import" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("customers")
    .select("email")
    .eq("org_id", profile.org_id);

  const existingEmails = new Set((existing || []).map((c: { email: string }) => c.email?.toLowerCase()).filter(Boolean));

  const toInsert: Record<string, string | null>[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const name = String(row.name || "").trim();
    if (!name) { errors.push(`Row missing name: ${JSON.stringify(row)}`); continue; }

    const email = String(row.email || "").trim().toLowerCase() || null;
    if (email && existingEmails.has(email)) {
      skipped.push(name);
      continue;
    }

    toInsert.push({
      org_id: profile.org_id,
      name,
      email: email || null,
      phone: String(row.phone || "").trim() || null,
      address: String(row.address || "").trim() || null,
      city: String(row.city || "").trim() || null,
      state: String(row.state || "").trim() || null,
      zip: String(row.zip || "").trim() || null,
      notes: String(row.notes || "").trim() || null,
    });

    if (email) existingEmails.add(email);
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insertErr } = await admin.from("customers").insert(toInsert);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    inserted = toInsert.length;
  }

  return NextResponse.json({
    success: true,
    inserted,
    skipped: skipped.length,
    errors: errors.length,
    message: `Imported ${inserted} customers. ${skipped.length} duplicates skipped.`
  });
}
