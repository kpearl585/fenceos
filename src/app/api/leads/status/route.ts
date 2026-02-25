import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("fep_lead_captured");
  const captured = cookie?.value === "1";
  return NextResponse.json({ captured });
}
