import Link from "next/link";
import { PLAN_UPGRADE_URL } from "@/lib/planLimits";
import type { PaywallTrigger } from "@/lib/paywall";

interface Props {
  feature: string;
  requiredPlan: "Pro" | "Business";
  description?: string;
  /** Optional trigger identifier — appended to the upgrade link as
   *  ?from=<trigger> so the upgrade page can personalize + analytics
   *  can measure which feature-gate drove the visit. */
  trigger?: PaywallTrigger;
}

export default function UpgradeGate({ feature, requiredPlan, description, trigger }: Props) {
  const desc = description ?? `${feature} is available on the ${requiredPlan} plan and above.`;
  const href = trigger ? `${PLAN_UPGRADE_URL}?from=${encodeURIComponent(trigger)}` : PLAN_UPGRADE_URL;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-surface border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text mb-2">{feature}</h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">{desc}</p>
        <Link
          href={href}
          className="inline-block bg-accent text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-accent-light transition-colors"
        >
          Upgrade to {requiredPlan}
        </Link>
        <p className="text-xs text-muted mt-4">14-day free trial includes full access. Cancel anytime.</p>
      </div>
    </div>
  );
}
