import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import {
  estimateFence,
  type FenceEstimateResult,
  type FenceProjectInput,
  type FenceType,
  type MaterialPriceMeta,
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

export interface OrgMaterialPricing {
  priceMap: Record<string, number>;
  priceMeta: Record<string, MaterialPriceMeta>;
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
  const pricing = await getOrgMaterialPricingByOrgId(admin, orgId);
  return pricing.priceMap;
}

export async function getOrgMaterialPricingByOrgId(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<OrgMaterialPricing> {
  const { data: materials } = await admin
    .from("materials")
    .select("sku, unit_cost, price_updated_at")
    .eq("org_id", orgId);

  if (!materials) return { priceMap: {}, priceMeta: {} };

  return {
    priceMap: Object.fromEntries(
      materials
        .filter((material) => material.unit_cost != null)
        .map((material) => [material.sku, Number(material.unit_cost)])
    ),
    priceMeta: Object.fromEntries(
      materials.map((material) => [
        material.sku,
        { updatedAt: material.price_updated_at },
      ])
    ),
  };
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

  const { priceMap, priceMeta } = await getOrgMaterialPricingByOrgId(
    context.admin,
    context.orgId
  );
  const result = estimateFence(input, {
    fenceType,
    woodStyle,
    laborRatePerHr: laborRate,
    wastePct,
    priceMap,
    priceMeta,
  });

  return {
    result,
    totalLF: totalLinearFeet(input),
  };
}
