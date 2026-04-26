import crypto from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PRICES_BASE } from "@/lib/fence-graph/pricing/defaultPrices";

export const e2eEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testUserEmail: process.env.TEST_USER_EMAIL,
  testUserPassword: process.env.TEST_USER_PASSWORD,
};

export const hasE2EAdminEnv = Boolean(
  e2eEnv.supabaseUrl &&
    e2eEnv.serviceRoleKey &&
    e2eEnv.testUserEmail &&
    e2eEnv.testUserPassword
);

export type OwnerTestContext = {
  authId: string;
  profileId: string;
  orgId: string;
  email: string;
};

export type TempOrgUser = {
  authId: string;
  profileId: string;
  orgId: string;
  email: string;
  password: string;
  role: "sales" | "foreman";
};

export type SeededEstimate = {
  estimateId: string;
  customerId: string;
  orgId: string;
  acceptToken: string;
  cleanupStoragePaths: string[];
};

export type SeededJob = {
  jobId: string;
  estimateId: string;
  customerId: string;
  orgId: string;
  cleanupStoragePaths: string[];
};

const CORE_VINYL_ESTIMATOR_MATERIALS = [
  { sku: "VINYL_POST_5X5", name: "Vinyl Post 5x5", unit: "ea", category: "Posts" },
  { sku: "VINYL_POST_CAP", name: "Vinyl Post Cap", unit: "ea", category: "Hardware" },
  { sku: "POST_SLEEVE_5X5", name: "Vinyl Post Sleeve 5x5", unit: "ea", category: "Posts" },
  { sku: "VINYL_PICKET_6FT", name: "Vinyl Privacy Picket 6ft", unit: "ea", category: "Panels" },
  { sku: "VINYL_U_CHANNEL_8FT", name: "Vinyl U-Channel 8ft", unit: "ea", category: "Hardware" },
  { sku: "VINYL_RAIL_8FT", name: "Vinyl Rail 8ft", unit: "ea", category: "Rails" },
  { sku: "CONCRETE_80LB", name: "Concrete Bag 80lb", unit: "bag", category: "Concrete" },
  { sku: "GRAVEL_40LB", name: "Gravel 40lb", unit: "bag", category: "Concrete" },
] as const;

let cachedAdmin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!hasE2EAdminEnv) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_EMAIL, or TEST_USER_PASSWORD"
    );
  }

  if (!cachedAdmin) {
    cachedAdmin = createClient(e2eEnv.supabaseUrl!, e2eEnv.serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedAdmin;
}

export async function getOwnerTestContext(): Promise<OwnerTestContext> {
  const admin = getAdminClient();
  const ownerEmail = e2eEnv.testUserEmail!;

  const { data: profile, error } = await admin
    .from("users")
    .select("id, auth_id, org_id, email, role")
    .eq("email", ownerEmail)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(
      `Failed to load owner test profile for ${ownerEmail}: ${error?.message ?? "not found"}`
    );
  }

  if (profile.role !== "owner") {
    throw new Error(`TEST_USER_EMAIL must belong to an owner, got ${profile.role}`);
  }

  return {
    authId: profile.auth_id,
    profileId: profile.id,
    orgId: profile.org_id,
    email: profile.email,
  };
}

export async function ensureFreshEstimatorMaterials(owner: OwnerTestContext) {
  const admin = getAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error } = await admin
    .from("materials")
    .select("id, sku")
    .eq("org_id", owner.orgId)
    .in("sku", CORE_VINYL_ESTIMATOR_MATERIALS.map((item) => item.sku));

  if (error) {
    throw new Error(`Failed to load org materials for E2E setup: ${error.message}`);
  }

  const existingBySku = new Map((existing ?? []).map((row) => [row.sku, row.id]));

  for (const material of CORE_VINYL_ESTIMATOR_MATERIALS) {
    const unitCost = DEFAULT_PRICES_BASE[material.sku];
    const unitPrice = Number((unitCost * 1.35).toFixed(2));
    const payload = {
      org_id: owner.orgId,
      name: material.name,
      sku: material.sku,
      unit: material.unit,
      unit_cost: unitCost,
      unit_price: unitPrice,
      category: material.category,
      supplier: "E2E Supplier Feed",
      notes: "Seeded fresh estimator pricing for E2E coverage.",
      price_updated_at: now,
      updated_at: now,
    };

    const existingId = existingBySku.get(material.sku);
    if (existingId) {
      const { error: updateError } = await admin
        .from("materials")
        .update(payload as any)
        .eq("id", existingId);
      if (updateError) {
        throw new Error(`Failed to refresh material ${material.sku}: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await admin
        .from("materials")
        .insert(payload as any);
      if (insertError) {
        throw new Error(`Failed to seed material ${material.sku}: ${insertError.message}`);
      }
    }
  }
}

export async function createTempOrgUser(
  owner: OwnerTestContext,
  role: "sales" | "foreman"
): Promise<TempOrgUser> {
  const admin = getAdminClient();
  const tag = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const email = `e2e-${role}-${tag}@example.com`;
  const password = `E2E-${role}-${tag}-Strong!123`;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      created_for: "e2e-negative-auth",
      role,
    },
  });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create auth user for ${role}: ${authError?.message ?? "unknown"}`);
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .insert({
      auth_id: authUser.user.id,
      org_id: owner.orgId,
      email,
      role,
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(
      `Failed to create public.users row for ${role}: ${profileError?.message ?? "unknown"}`
    );
  }

  return {
    authId: authUser.user.id,
    profileId: profile.id,
    orgId: owner.orgId,
    email,
    password,
    role,
  };
}

export async function deleteTempOrgUser(user: TempOrgUser) {
  const admin = getAdminClient();
  await admin.from("users").delete().eq("id", user.profileId);
  await admin.auth.admin.deleteUser(user.authId);
}

export async function seedQuotedEstimate(owner: OwnerTestContext): Promise<SeededEstimate> {
  const admin = getAdminClient();
  const tag = Date.now().toString(36);
  const acceptToken = crypto.randomUUID();

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      org_id: owner.orgId,
      name: `E2E Acceptance ${tag}`,
      email: `e2e-accept-${tag}@example.com`,
      phone: "555-0102",
      address: "123 Acceptance Way",
      city: "Orlando",
      state: "FL",
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    throw new Error(`Failed to seed customer: ${customerError?.message ?? "unknown"}`);
  }

  const { data: estimate, error: estimateError } = await admin
    .from("estimates")
    .insert({
      org_id: owner.orgId,
      created_by: owner.profileId,
      customer_id: customer.id,
      title: `E2E Acceptance Estimate ${tag}`,
      status: "quoted",
      fence_type: "wood_privacy",
      linear_feet: 120,
      gate_count: 1,
      post_spacing: 8,
      height: 6,
      waste_factor_pct: 5,
      target_margin_pct: 0.35,
      labor_rate_per_hr: 65,
      total: 4200,
      margin_pct: 0.38,
      materials_subtotal: 2200,
      labor_subtotal: 800,
      estimated_cost: 3000,
      gross_profit: 1200,
      gross_margin_pct: 0.38,
      margin_status: "good",
      quoted_at: new Date().toISOString(),
      accept_token: acceptToken,
      legal_terms_snapshot: "E2E legal terms snapshot",
      payment_terms_snapshot: "E2E payment terms snapshot",
    })
    .select("id")
    .single();

  if (estimateError || !estimate) {
    await admin.from("customers").delete().eq("id", customer.id);
    throw new Error(`Failed to seed estimate: ${estimateError?.message ?? "unknown"}`);
  }

  const { error: lineItemError } = await admin.from("estimate_line_items").insert([
    {
      estimate_id: estimate.id,
      org_id: owner.orgId,
      sku: "WOOD_PANEL_8FT",
      description: "Wood Privacy Panel 8ft",
      quantity: 15,
      unit: "ea",
      unit_cost: 95,
      unit_price: 140,
      extended_cost: 1425,
      extended_price: 2100,
      total: 2100,
      type: "material",
      sort_order: 0,
    },
    {
      estimate_id: estimate.id,
      org_id: owner.orgId,
      sku: "",
      description: "Labor — 12 hrs @ $65/hr",
      quantity: 12,
      unit: "hr",
      unit_cost: 65,
      unit_price: 90,
      extended_cost: 780,
      extended_price: 1080,
      total: 1080,
      type: "labor",
      sort_order: 1,
    },
  ]);

  if (lineItemError) {
    await admin.from("estimates").delete().eq("id", estimate.id);
    await admin.from("customers").delete().eq("id", customer.id);
    throw new Error(`Failed to seed estimate line items: ${lineItemError.message}`);
  }

  return {
    estimateId: estimate.id,
    customerId: customer.id,
    orgId: owner.orgId,
    acceptToken,
    cleanupStoragePaths: [
      `${owner.orgId}/${estimate.id}/signature.png`,
      `${owner.orgId}/${estimate.id}/signed-contract.pdf`,
      `${owner.orgId}/${estimate.id}/estimate.pdf`,
    ],
  };
}

export async function seedActiveJob(owner: OwnerTestContext): Promise<SeededJob> {
  const admin = getAdminClient();
  const tag = Date.now().toString(36);

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      org_id: owner.orgId,
      name: `E2E Auth Job ${tag}`,
      email: `e2e-job-${tag}@example.com`,
      phone: "555-0109",
      address: "456 Job Test Ave",
      city: "Tampa",
      state: "FL",
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    throw new Error(`Failed to seed job customer: ${customerError?.message ?? "unknown"}`);
  }

  const { data: estimate, error: estimateError } = await admin
    .from("estimates")
    .insert({
      org_id: owner.orgId,
      created_by: owner.profileId,
      customer_id: customer.id,
      title: `E2E Active Job ${tag}`,
      status: "converted",
      fence_type: "wood_privacy",
      linear_feet: 96,
      gate_count: 1,
      post_spacing: 8,
      height: 6,
      waste_factor_pct: 5,
      target_margin_pct: 0.35,
      labor_rate_per_hr: 65,
      total: 3600,
      margin_pct: 0.37,
      materials_subtotal: 1900,
      labor_subtotal: 700,
      estimated_cost: 2600,
      gross_profit: 1000,
      gross_margin_pct: 0.37,
      margin_status: "good",
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (estimateError || !estimate) {
    await admin.from("customers").delete().eq("id", customer.id);
    throw new Error(`Failed to seed job estimate: ${estimateError?.message ?? "unknown"}`);
  }

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .insert({
      org_id: owner.orgId,
      estimate_id: estimate.id,
      customer_id: customer.id,
      created_by: owner.profileId,
      title: `E2E Active Job ${tag}`,
      status: "active",
      total_price: 3600,
      total_cost: 2600,
      gross_profit: 1000,
      gross_margin_pct: 0.37,
      material_verification_status: "foreman_approved",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await admin.from("estimates").delete().eq("id", estimate.id);
    await admin.from("customers").delete().eq("id", customer.id);
    throw new Error(`Failed to seed active job: ${jobError?.message ?? "unknown"}`);
  }

  await admin.from("job_line_items").insert([
    {
      job_id: job.id,
      org_id: owner.orgId,
      sku: "WOOD_PANEL_8FT",
      name: "Wood Privacy Panel 8ft",
      qty: 12,
      unit: "ea",
      unit_cost: 95,
      unit_price: 140,
      extended_cost: 1140,
      extended_price: 1680,
      type: "material",
    },
  ]);

  return {
    jobId: job.id,
    estimateId: estimate.id,
    customerId: customer.id,
    orgId: owner.orgId,
    cleanupStoragePaths: [],
  };
}

export async function cleanupSeededEstimate(seed: SeededEstimate) {
  const admin = getAdminClient();
  await admin.from("estimate_line_items").delete().eq("estimate_id", seed.estimateId);
  await admin.from("estimates").delete().eq("id", seed.estimateId);
  await admin.from("customers").delete().eq("id", seed.customerId);
  if (seed.cleanupStoragePaths.length > 0) {
    await admin.storage.from("contracts").remove(seed.cleanupStoragePaths);
  }
}

export async function cleanupSeededJob(seed: SeededJob) {
  const admin = getAdminClient();
  await admin.from("invoices").delete().eq("job_id", seed.jobId);
  await admin.from("job_line_items").delete().eq("job_id", seed.jobId);
  await admin.from("job_material_verifications").delete().eq("job_id", seed.jobId);
  await admin.from("job_checklists").delete().eq("job_id", seed.jobId);
  await admin.from("job_photos").delete().eq("job_id", seed.jobId);
  await admin.from("change_orders").delete().eq("job_id", seed.jobId);
  await admin.from("jobs").delete().eq("id", seed.jobId);
  await admin.from("estimate_line_items").delete().eq("estimate_id", seed.estimateId);
  await admin.from("estimates").delete().eq("id", seed.estimateId);
  await admin.from("customers").delete().eq("id", seed.customerId);
}
