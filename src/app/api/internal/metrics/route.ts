import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  try {
    const [orgs, users, estimates, jobs] = await Promise.all([
      admin.from("organizations").select("id, name, created_at"),
      admin.from("users").select("id, role, created_at, org_id"),
      admin.from("estimates").select("id, status, total, created_at").order("created_at", { ascending: false }).limit(200),
      admin.from("jobs").select("id, status, created_at"),
    ]);

    let waitlistCount = 0;
    let waitlistToday = 0;
    try {
      const { data: wl } = await admin.from("waitlist").select("id, created_at");
      const dayAgo = new Date(Date.now() - 86400000).toISOString();
      waitlistCount = wl?.length ?? 0;
      waitlistToday = wl?.filter((w: {created_at: string}) => w.created_at > dayAgo).length ?? 0;
    } catch {}

    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      organizations: {
        total: orgs.data?.length ?? 0,
        new_today: orgs.data?.filter((o: {created_at: string}) => o.created_at > dayAgo).length ?? 0,
        new_this_week: orgs.data?.filter((o: {created_at: string}) => o.created_at > weekAgo).length ?? 0,
      },
      users: {
        total: users.data?.length ?? 0,
        owners: users.data?.filter((u: {role: string}) => u.role === "owner").length ?? 0,
        new_today: users.data?.filter((u: {created_at: string}) => u.created_at > dayAgo).length ?? 0,
      },
      estimates: {
        total: estimates.data?.length ?? 0,
        quoted: estimates.data?.filter((e: {status: string}) => e.status === "quoted").length ?? 0,
        accepted: estimates.data?.filter((e: {status: string}) => e.status === "accepted").length ?? 0,
        pipeline_value: estimates.data?.filter((e: {status: string}) => e.status === "quoted")
          .reduce((s: number, e: {total: number}) => s + Number(e.total), 0) ?? 0,
      },
      jobs: {
        total: jobs.data?.length ?? 0,
        active: jobs.data?.filter((j: {status: string}) => j.status === "active").length ?? 0,
        scheduled: jobs.data?.filter((j: {status: string}) => j.status === "scheduled").length ?? 0,
        completed: jobs.data?.filter((j: {status: string}) => j.status === "complete").length ?? 0,
      },
      waitlist: { total: waitlistCount, new_today: waitlistToday },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
