import { NextResponse } from "next/server";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function POST() {
  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ success: true });

  response.cookies.set("fep_lead_captured", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: NINETY_DAYS,
    path: "/",
  });

  return response;
}
