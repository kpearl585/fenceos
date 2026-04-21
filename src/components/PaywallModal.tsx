"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PLAN_DISPLAY_NAME,
  PLAN_PRICE,
  isPaywallBlock,
  type PaywallBlock,
  type PaywallTrigger,
} from "@/lib/paywall";

interface Copy {
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta?: string;
}

function getCopy(block: PaywallBlock): Copy {
  const suggestedName = PLAN_DISPLAY_NAME[block.suggestedPlan];
  const suggestedPrice = PLAN_PRICE[block.suggestedPlan];
  const primaryCta = `Upgrade to ${suggestedName} — ${suggestedPrice}`;
  const used = block.context?.used ?? 0;
  const limit = block.context?.limit ?? 0;
  const left = Math.max(0, limit - used);

  const copyMap: Record<PaywallTrigger, Copy> = {
    estimate_cap_warning: {
      title: `${left} ${left === 1 ? "estimate" : "estimates"} left this month`,
      body: `You're closing deals faster than ${PLAN_DISPLAY_NAME[block.currentPlan]} was built for. ${suggestedName} bumps you to ${block.suggestedPlan === "pro" ? "50/mo plus $2 overage" : "unlimited"}, and unlocks branded proposals the kind customers actually sign without edits.`,
      primaryCta,
      secondaryCta: "See what changes",
    },
    estimate_cap_hit: {
      title: `You've used all ${limit} estimates this month`,
      body: `Your next estimate unlocks with ${suggestedName}. You keep everything you've built — catalog, templates, job history. Resets in 14 days on your current plan.`,
      primaryCta,
      secondaryCta: "Keep current plan",
    },
    seat_cap: {
      title: `${PLAN_DISPLAY_NAME[block.currentPlan]} is built for ${limit === 1 ? "solo operators" : `${limit}-person teams`}`,
      body: `Adding your estimator, office admin, or foreman? ${suggestedName} includes ${block.suggestedPlan === "pro" ? "4 seats" : "unlimited seats"} and lets them see live job status without calling you.`,
      primaryCta,
      secondaryCta: "Cancel",
    },
    feature_alternative_bids: {
      title: `Send 3 bid options in one proposal`,
      body: `Contractors who send multiple options close ~30% more often — the customer picks instead of negotiating. Available on ${suggestedName} and up.`,
      primaryCta,
      secondaryCta: "Not now",
    },
    feature_qb_sync: {
      title: `QuickBooks sync is a Crew feature`,
      body: `Stop double-entering invoices. Crew pushes accepted estimates straight to QuickBooks as invoices, and pulls payment status back into your pipeline automatically.`,
      primaryCta,
      secondaryCta: "See Crew details",
    },
    feature_pricing_rules: {
      title: `You're overriding catalog prices a lot`,
      body: `Crew's pricing rules engine handles this automatically — by job type, customer tier, or season. One setup, no more manual math on every estimate.`,
      primaryCta,
      secondaryCta: "Learn more",
    },
    feature_pipeline: {
      title: `Pipeline dashboard unlocks with ${suggestedName}`,
      body: `See forecasted revenue, close rates by job type, and which estimates are going cold — before you lose them. Upgrade to track the full funnel, not just individual jobs.`,
      primaryCta,
      secondaryCta: "Not now",
    },
    feature_branded_pdf: {
      title: `Send proposals with your logo, not ours`,
      body: `${suggestedName} removes the FenceOS footer and puts your logo, colors, and contact info at the top of every PDF. Small change, big credibility jump on bids.`,
      primaryCta,
      secondaryCta: "Keep default PDF",
    },
    feature_jobs: {
      title: `Jobs board unlocks with ${suggestedName}`,
      body: `Turn signed estimates into trackable jobs. Your foreman sees the schedule, materials, and closeout checklist. You see margin in real time, not two weeks after the job ends.`,
      primaryCta,
      secondaryCta: "Not now",
    },
    feature_advanced_reporting: {
      title: `KPI reporting unlocks with ${suggestedName}`,
      body: `Close rate, margin trends, revenue by fence type, jobs at risk — everything you need to run the business, not just the next estimate. Available on Business.`,
      primaryCta,
      secondaryCta: "Not now",
    },
    subscription_expired: {
      title: `Your free trial has ended`,
      body: `Your data is safe. Pick a plan to pick up where you left off — same estimates, same catalog, same customer records.`,
      primaryCta: `Choose a plan`,
    },
    subscription_lapsed: {
      title: `Your ${PLAN_DISPLAY_NAME[block.currentPlan]} subscription is past due`,
      body: `Update your payment method to restore access. All your data stays intact in the meantime.`,
      primaryCta: "Update payment",
    },
  };

  return copyMap[block.trigger];
}

interface PaywallModalProps {
  block: PaywallBlock | null;
  onClose: () => void;
}

export function PaywallModal({ block, onClose }: PaywallModalProps) {
  useEffect(() => {
    if (!block) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [block, onClose]);

  if (!block) return null;
  const copy = getCopy(block);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        className="bg-surface-2 border border-accent/20 accent-glow rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3
            id="paywall-title"
            className="text-xl font-bold text-text pr-4"
          >
            {copy.title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-2xl leading-none p-1 transition-colors duration-150"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-muted text-sm md:text-base mb-6 leading-relaxed">
          {copy.body}
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href={block.upgradeUrl}
            className="w-full bg-accent hover:bg-accent-light accent-glow text-white font-semibold text-base py-3 px-4 rounded-lg text-center transition-colors duration-150"
            onClick={onClose}
          >
            {copy.primaryCta}
          </Link>
          {copy.secondaryCta && (
            <button
              onClick={onClose}
              className="w-full text-muted hover:text-text font-medium text-sm py-2 transition-colors duration-150"
            >
              {copy.secondaryCta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for wiring the modal into a page or action handler.
 *
 * Usage:
 *   const { block, handle, clear } = usePaywall();
 *   const onSave = async () => {
 *     const result = await saveAdvancedEstimate(input);
 *     if (handle(result)) return; // modal shown, stop here
 *     // ...success path
 *   };
 *   return <>
 *     <PaywallModal block={block} onClose={clear} />
 *     ...
 *   </>
 */
export function usePaywall() {
  const [block, setBlock] = useState<PaywallBlock | null>(null);

  /** Pass any server action result; returns true if a paywall was shown. */
  const handle = (result: unknown): boolean => {
    if (isPaywallBlock(result)) {
      setBlock(result);
      return true;
    }
    return false;
  };

  const clear = () => setBlock(null);

  return { block, handle, clear };
}
