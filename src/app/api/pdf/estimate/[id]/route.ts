import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { buildPdfData } from "@/lib/contracts/uploadContractPdf";
import { generateEstimatePdfBuffer } from "@/lib/contracts/generateEstimatePdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureProfile(supabase, user);

  // Verify estimate belongs to org
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, org_id, title")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const pdfData = await buildPdfData(id, profile.org_id);
    const nodeBuffer = await generateEstimatePdfBuffer(pdfData);
    const buffer = new Uint8Array(nodeBuffer);

    const safeName = (estimate.title || "estimate")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
