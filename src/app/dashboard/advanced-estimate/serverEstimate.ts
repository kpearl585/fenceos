import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import {
  estimateFence,
  type FenceEstimateResult,
  type FenceProjectInput,
  type FenceType,
  type WoodStyle,
} from "@/lib/fence-graph/engine";
import {
  assertValidEstimateOptions,
  assertValidFenceProjectInput,
  totalLinearFeet,
} from "@/lib/fence-graph/estimateInput";

export interface OrgEstimateContext {
  admin: ReturnType<typeof createAdminClient>;
  orgId: string;
  profileId: string;
  userId: string;
}

export async function requireOrgEstimateContext(): Promise<OrgEstimateContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await ensureProfile(supabase, user);
  const admin = createAdminClient();

  return {
    admin,
    orgId: profile.org_id,
    profileId: profile.id,
    userId: user.id,
  };
}

export async function getOrgMaterialPricesByOrgId(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<Record<string, number>> {
  const { data: materials } = await admin
    .from("materials")
    .select("sku, unit_cost")
    .eq("org_id", orgId);

  if (!materials) return {};
  return Object.fromEntries(
    materials
      .filter((material) => material.unit_cost != null)
      .map((material) => [material.sku, Number(material.unit_cost)])
  );
}

export async function recomputeEstimateForOrg(
  context: OrgEstimateContext,
  {
    input,
    laborRate,
    wastePctPercent,
    fenceType,
    woodStyle,
  }: {
    input: FenceProjectInput;
    laborRate: number;
    wastePctPercent: number;
    fenceType: FenceType;
    woodStyle?: WoodStyle;
  }
): Promise<{ result: FenceEstimateResult; totalLF: number }> {
  const wastePct = wastePctPercent / 100;
  assertValidFenceProjectInput(input);
  assertValidEstimateOptions({
    laborRatePerHr: laborRate,
    wastePct,
    fenceType,
    woodStyle,
  });

  const priceMap = await getOrgMaterialPricesByOrgId(context.admin, context.orgId);
  const result = estimateFence(input, {
    fenceType,
    woodStyle,
    laborRatePerHr: laborRate,
    wastePct,
    priceMap,
  });

  return {
    result,
    totalLF: totalLinearFeet(input),
  };
}
