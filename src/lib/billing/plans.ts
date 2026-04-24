import { getPlanLimits, type PlanKey } from "@/lib/planLimits";

export type BillablePlanKey = Extract<PlanKey, "starter" | "pro" | "business">;
export type BillingPeriod = "monthly" | "annual";

type BillingPlanMeta = {
  key: BillablePlanKey;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  monthlyPriceId: string;
  annualPriceId: string;
};

export const BILLING_PLANS: Record<BillablePlanKey, BillingPlanMeta> = {
  starter: {
    key: "starter",
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 290,
    annualSavings: 58,
    description: "Perfect for solo operators who need fast, accurate estimates.",
    features: [
      "Unlimited estimates",
      "Auto material calculations",
      "Margin protection",
      "PDF quote generation",
      "1 user",
      "Email support",
    ],
    highlighted: false,
    monthlyPriceId: "price_1T6t9h38qXAGqAtugJvPNdxg",
    annualPriceId: "price_1T6t9h38qXAGqAtu4bWIT6NI",
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyPrice: 79,
    annualPrice: 790,
    annualSavings: 158,
    description: "For contractors running a crew. Everything in Starter, plus job management.",
    features: [
      "Everything in Starter",
      "Jobs & foreman board",
      "Foreman mobile access",
      "Change order tracking",
      "Custom branding on PDFs",
      "3 users",
      "Priority support",
    ],
    highlighted: true,
    monthlyPriceId: "price_1T6t9h38qXAGqAtu6Hx3Co36",
    annualPriceId: "price_1T6t9i38qXAGqAtuUrw39fcc",
  },
  business: {
    key: "business",
    name: "Business",
    monthlyPrice: 149,
    annualPrice: 1490,
    annualSavings: 298,
    description: "For growing operations running multiple crews and high job volume.",
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Advanced reporting",
      "Dedicated onboarding",
      "Phone support",
    ],
    highlighted: false,
    monthlyPriceId: "price_1T6t9i38qXAGqAtulhchhs7O",
    annualPriceId: "price_1T6t9i38qXAGqAtuW5GiL25Z",
  },
};

export const BILLABLE_PLAN_ORDER: BillablePlanKey[] = ["starter", "pro", "business"];

export function getBillablePlanMeta(plan: BillablePlanKey) {
  return BILLING_PLANS[plan];
}

export function getStripePriceId(plan: BillablePlanKey, billingPeriod: BillingPeriod) {
  const meta = getBillablePlanMeta(plan);
  return billingPeriod === "annual" ? meta.annualPriceId : meta.monthlyPriceId;
}

export function getBillablePlanLimits(plan: BillablePlanKey) {
  return getPlanLimits(plan);
}
