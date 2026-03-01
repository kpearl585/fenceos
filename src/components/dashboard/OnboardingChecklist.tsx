import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  userId: string;
  orgId: string;
  userCreatedAt: string;
}

export default async function OnboardingChecklist({ userId, orgId, userCreatedAt }: Props) {
  // Only show for accounts < 14 days old
  const accountAge = Date.now() - new Date(userCreatedAt).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  if (accountAge > 14 * dayMs) return null;

  const supabase = await createClient();

  const [
    { count: customerCount },
    { count: estimateCount },
    { count: quotedCount },
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["quoted", "approved"]),
  ]);

  const steps = [
    {
      label: "Account created",
      done: true,
      href: null,
    },
    {
      label: "Add your first customer",
      done: (customerCount ?? 0) > 0,
      href: "/dashboard/customers/new",
    },
    {
      label: "Build your first estimate",
      done: (estimateCount ?? 0) > 0,
      href: "/dashboard/estimates/new",
    },
    {
      label: "Send estimate to customer",
      done: (quotedCount ?? 0) > 0,
      href: "/dashboard/estimates",
    },
    {
      label: "Set up company profile",
      done: false,
      href: "/dashboard/settings",
    },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white rounded-xl border border-fence-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-fence-900 text-sm">Getting Started</h3>
          <p className="text-xs text-gray-500 mt-0.5">{completedCount}/{steps.length} steps complete</p>
        </div>
        <div className="w-24 bg-gray-100 rounded-full h-2">
          <div
            className="bg-fence-600 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-green-100" : "bg-gray-100"}`}>
              {step.done ? (
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
            {step.done || !step.href ? (
              <span className={`text-sm ${step.done ? "text-gray-400 line-through" : "text-gray-700"}`}>{step.label}</span>
            ) : (
              <Link href={step.href} className="text-sm text-fence-700 hover:text-fence-900 hover:underline">
                {step.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
