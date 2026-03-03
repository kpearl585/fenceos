/**
 * Plan feature gates for FenceEstimatePro.
 * Use getPlanLimits(org.plan) — never hardcode plan names in components.
 *
 * Tier summary:
 *   trial    — full access (14 days, sell the value)
 *   starter  — estimates + materials + PDF + margin protection, 1 user, no jobs
 *   pro      — everything + jobs board + foreman + change orders + custom PDF branding, 3 users
 *   business — everything in pro + unlimited users + advanced reporting
 */

export type PlanKey = "trial" | "starter" | "pro" | "business" | "free";

export interface PlanLimits {
  maxUsers: number;                    // owner counts as 1
  maxEstimatesPerMonth: number | null; // null = unlimited
  jobTracking: boolean;                // jobs/kanban module
  foremanAccess: boolean;              // foreman role + mobile access
  changeOrders: boolean;               // change order module
  materialVerification: boolean;       // material verification on jobs
  customPdfBranding: boolean;          // logo + colors on PDF output
  advancedReporting: boolean;          // metrics/KPI dashboard (full)
}

const LIMITS: Record<PlanKey, PlanLimits> = {
  // Full access — let them see everything so they convert
  trial: {
    maxUsers: 3,
    maxEstimatesPerMonth: null,
    jobTracking: true,
    foremanAccess: true,
    changeOrders: true,
    materialVerification: true,
    customPdfBranding: true,
    advancedReporting: true,
  },
  // Estimates-only — unlimited estimates, materials, PDF, margin. No jobs.
  starter: {
    maxUsers: 1,
    maxEstimatesPerMonth: null,
    jobTracking: false,
    foremanAccess: false,
    changeOrders: false,
    materialVerification: false,
    customPdfBranding: false,
    advancedReporting: false,
  },
  // Full operations — jobs, foreman, change orders, custom PDF branding
  pro: {
    maxUsers: 3,
    maxEstimatesPerMonth: null,
    jobTracking: true,
    foremanAccess: true,
    changeOrders: true,
    materialVerification: true,
    customPdfBranding: true,
    advancedReporting: false,
  },
  // Scale — everything in pro + unlimited users + full reporting
  business: {
    maxUsers: Infinity,
    maxEstimatesPerMonth: null,
    jobTracking: true,
    foremanAccess: true,
    changeOrders: true,
    materialVerification: true,
    customPdfBranding: true,
    advancedReporting: true,
  },
  // Expired/downgraded
  free: {
    maxUsers: 1,
    maxEstimatesPerMonth: 3,
    jobTracking: false,
    foremanAccess: false,
    changeOrders: false,
    materialVerification: false,
    customPdfBranding: false,
    advancedReporting: false,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return LIMITS[(plan as PlanKey) ?? "trial"] ?? LIMITS.trial;
}

export const PLAN_UPGRADE_URL = "/dashboard/upgrade";

/** Quick helpers */
export const planHasJobs = (plan: string | null | undefined) => getPlanLimits(plan).jobTracking;
export const planHasForeman = (plan: string | null | undefined) => getPlanLimits(plan).foremanAccess;
export const planHasChangeOrders = (plan: string | null | undefined) => getPlanLimits(plan).changeOrders;
export const planHasCustomBranding = (plan: string | null | undefined) => getPlanLimits(plan).customPdfBranding;
