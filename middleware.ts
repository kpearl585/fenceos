import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (svg, png, jpg, etc.)
     * - API routes for leads (public endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/leads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
