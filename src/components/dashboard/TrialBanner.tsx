"use client";
import { useRouter } from "next/navigation";

interface TrialBannerProps {
  daysRemaining: number;
  plan: string;
}

export function TrialBanner({ daysRemaining, plan }: TrialBannerProps) {
  const router = useRouter();
  if (plan !== "trial" && plan !== "trialing") return null;

  const urgent = daysRemaining <= 3;
  const expired = daysRemaining <= 0;

  return (
    <div className={`w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm font-medium ${
      expired ? "bg-red-600" : urgent ? "bg-amber-500" : "bg-fence-700"
    } text-white`}>
      <span>
        {expired
          ? "⚠️ Your trial has expired — upgrade to keep access"
          : urgent
          ? `⏰ ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your trial`
          : `🚀 ${daysRemaining} days left in your free trial`}
      </span>
      <button
        onClick={() => router.push("/dashboard/upgrade")}
        className="shrink-0 bg-white text-fence-800 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
      >
        Upgrade Now
      </button>
    </div>
  );
}
