#!/usr/bin/env tsx

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { FenceEstimateResult, FenceProjectInput } from "../src/lib/fence-graph/engine";
import type { FenceType } from "../src/lib/fence-graph/bom";
import type { OrgEstimatorConfig, DeepPartial } from "../src/lib/fence-graph/config";
import {
  mergeEstimatorConfig,
  extractEstimatorOverrides,
  validateEstimatorConfig,
} from "../src/lib/fence-graph/config";
import { analyzeEstimateCloseout } from "../src/lib/fence-graph/closeout/analyzeCloseout";
import type { CloseoutActuals, EstimateCloseoutAnalysis } from "../src/lib/fence-graph/closeout/types";
import {
  buildEstimatorTuningRecommendations,
  applyEstimatorTuningRecommendations,
  type EstimatorTuningRecommendation,
} from "../src/lib/fence-graph/closeout/tuning";
import { inferFenceTypeFromProductLineId } from "../src/lib/fence-graph/estimateInput";
import type { SiteComplexity } from "../src/lib/fence-graph/accuracy-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const argv = process.argv.slice(2);
const shouldApply = argv.includes("--apply");
const includeTestRows = argv.includes("--include-test");
const orgIdArgIndex = argv.indexOf("--org");
const orgId = orgIdArgIndex >= 0 ? argv[orgIdArgIndex + 1] : null;
const minCloseoutsArgIndex = argv.indexOf("--min-closeouts");
const minCloseouts = minCloseoutsArgIndex >= 0 ? Number(argv[minCloseoutsArgIndex + 1]) : 5;
const minRepeatArgIndex = argv.indexOf("--min-repeat");
const minRepeat = minRepeatArgIndex >= 0 ? Number(argv[minRepeatArgIndex + 1]) : 3;

if (shouldApply && !orgId) {
  console.error("--apply requires --org <org-id> so calibration never writes to every org by accident.");
  process.exit(1);
}

type LegacyFenceGraphRow = {
  id: string;
  org_id: string;
  name: string | null;
  input_json: FenceProjectInput & { fenceType?: FenceType };
  result_json: FenceEstimateResult | null;
  site_complexity_json: SiteComplexity | null;
  status: string | null;
  closed_at: string | null;
  created_at: string | null;
  waste_pct: number | null;
  estimated_labor_hours: number | null;
  closeout_actual_waste_pct: number | null;
  closeout_actual_labor_hours: number | null;
  closeout_actual_material_cost: number | null;
  closeout_actual_labor_cost: number | null;
  closeout_actual_total_cost: number | null;
  closeout_notes: string | null;
  closeout_analysis_json?: EstimateCloseoutAnalysis | null;
  closeout_actuals_json?: CloseoutActuals | null;
};

type RecommendationDirection = "increase" | "decrease" | "mixed" | "neutral";

type RecommendationGroup = {
  configArea: string;
  title: string;
  count: number;
  directions: RecommendationDirection[];
  recommendations: EstimatorTuningRecommendation[];
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function inferFenceType(input: FenceProjectInput & { fenceType?: FenceType }): FenceType | null {
  if (
    input.fenceType === "vinyl" ||
    input.fenceType === "wood" ||
    input.fenceType === "chain_link" ||
    input.fenceType === "aluminum"
  ) {
    return input.fenceType;
  }
  return inferFenceTypeFromProductLineId(input.productLineId);
}

function looksLikeTestRow(name: string | null | undefined): boolean {
  if (!name) return false;
  return /(^|\b)(test|demo|sample|sandbox|seed)(\b|:)/i.test(name);
}

function buildActualsFromLegacyRow(row: LegacyFenceGraphRow): CloseoutActuals | null {
  const actuals: CloseoutActuals = {
    actualWastePct:
      typeof row.closeout_actual_waste_pct === "number"
        ? row.closeout_actual_waste_pct * 100
        : undefined,
    actualLaborHours:
      typeof row.closeout_actual_labor_hours === "number"
        ? row.closeout_actual_labor_hours
        : undefined,
    actualMaterialCost:
      typeof row.closeout_actual_material_cost === "number"
        ? row.closeout_actual_material_cost
        : undefined,
    actualLaborCost:
      typeof row.closeout_actual_labor_cost === "number"
        ? row.closeout_actual_labor_cost
        : undefined,
    actualFinalJobCost:
      typeof row.closeout_actual_total_cost === "number"
        ? row.closeout_actual_total_cost
        : undefined,
    notes: row.closeout_notes ?? undefined,
  };

  if (
    actuals.actualWastePct == null &&
    actuals.actualLaborHours == null &&
    actuals.actualMaterialCost == null &&
    actuals.actualLaborCost == null &&
    actuals.actualFinalJobCost == null
  ) {
    return null;
  }

  return actuals;
}

function getRecommendationDirection(
  recommendation: EstimatorTuningRecommendation,
): RecommendationDirection {
  if (
    typeof recommendation.beforeValue === "number" &&
    typeof recommendation.afterValue === "number"
  ) {
    if (recommendation.afterValue > recommendation.beforeValue) return "increase";
    if (recommendation.afterValue < recommendation.beforeValue) return "decrease";
    return "neutral";
  }
  return "neutral";
}

function scaleFenceTypeLabor(
  currentConfig: OrgEstimatorConfig,
  fenceType: FenceType,
  multiplier: number,
): DeepPartial<OrgEstimatorConfig> {
  const scaled = Object.fromEntries(
    Object.entries(currentConfig.labor[fenceType]).map(([key, value]) => [
      key,
      round3(value * multiplier),
    ]),
  );

  return {
    labor: {
      [fenceType]: scaled,
    },
  } as DeepPartial<OrgEstimatorConfig>;
}

function buildCombinedPatchForGroup(
  currentConfig: OrgEstimatorConfig,
  group: RecommendationGroup,
): DeepPartial<OrgEstimatorConfig> | null {
  const afterValues = group.recommendations
    .map((recommendation) => recommendation.afterValue)
    .filter((value): value is number => typeof value === "number");
  const beforeValues = group.recommendations
    .map((recommendation) => recommendation.beforeValue)
    .filter((value): value is number => typeof value === "number");

  if (afterValues.length === 0 || beforeValues.length === 0) return null;

  if (group.configArea === "region.materialMultiplier") {
    return { region: { materialMultiplier: round3(average(afterValues)) } };
  }

  if (group.configArea === "logistics.deliveryFee") {
    return { logistics: { deliveryFee: round2(average(afterValues)) } };
  }

  if (group.configArea === "removal.disposalCost") {
    return { removal: { disposalCost: round2(average(afterValues)) } };
  }

  const laborMatch = group.configArea.match(/^labor\.(vinyl|wood|chain_link|aluminum)\.\*$/);
  if (laborMatch) {
    const fenceType = laborMatch[1] as FenceType;
    const multipliers = group.recommendations
      .filter(
        (recommendation): recommendation is EstimatorTuningRecommendation & {
          beforeValue: number;
          afterValue: number;
        } =>
          typeof recommendation.beforeValue === "number" &&
          typeof recommendation.afterValue === "number" &&
          recommendation.beforeValue > 0,
      )
      .map((recommendation) => recommendation.afterValue / recommendation.beforeValue);

    if (multipliers.length === 0) return null;
    return scaleFenceTypeLabor(currentConfig, fenceType, average(multipliers));
  }

  const adaptiveMatch = group.configArea.match(
    /^adaptiveLabor\.byFenceType\.(vinyl|wood|chain_link|aluminum)\.([^.]+)\.multiplier$/,
  );
  if (adaptiveMatch) {
    const fenceType = adaptiveMatch[1] as FenceType;
    const band = adaptiveMatch[2];
    const currentBucket =
      currentConfig.adaptiveLabor.byFenceType[fenceType][
        band as keyof OrgEstimatorConfig["adaptiveLabor"]["byFenceType"][FenceType]
      ];

    return {
      adaptiveLabor: {
        byFenceType: {
          [fenceType]: {
            [band]: {
              multiplier: round3(average(afterValues)),
              sampleCount: currentBucket.sampleCount + group.count,
            },
          },
        },
      },
    } as DeepPartial<OrgEstimatorConfig>;
  }

  return null;
}

function summarizeRecommendations(
  recommendations: EstimatorTuningRecommendation[],
): RecommendationGroup[] {
  const grouped = new Map<string, RecommendationGroup>();

  for (const recommendation of recommendations) {
    if (!recommendation.patch) continue;
    const existing = grouped.get(recommendation.configArea);
    const direction = getRecommendationDirection(recommendation);
    if (existing) {
      existing.count += 1;
      existing.directions.push(direction);
      existing.recommendations.push(recommendation);
      continue;
    }
    grouped.set(recommendation.configArea, {
      configArea: recommendation.configArea,
      title: recommendation.title,
      count: 1,
      directions: [direction],
      recommendations: [recommendation],
    });
  }

  return Array.from(grouped.values()).map((group) => {
    const uniqueDirections = new Set(
      group.directions.filter((direction) => direction !== "neutral"),
    );
    if (uniqueDirections.size > 1) {
      group.directions = ["mixed"];
    }
    return group;
  });
}

async function fetchOrgSettings(orgIdValue: string) {
  const { data, error } = await supabase
    .from("org_settings")
    .select("org_id, estimator_config_json")
    .eq("org_id", orgIdValue)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchCloseoutRows(): Promise<LegacyFenceGraphRow[]> {
  let query = supabase
    .from("fence_graphs")
    .select(
      "id, org_id, name, input_json, result_json, site_complexity_json, status, closed_at, created_at, waste_pct, estimated_labor_hours, closeout_actual_waste_pct, closeout_actual_labor_hours, closeout_actual_material_cost, closeout_actual_labor_cost, closeout_actual_total_cost, closeout_notes",
    )
    .eq("status", "closed")
    .order("closed_at", { ascending: true });

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as LegacyFenceGraphRow[];
}

async function main() {
  const rows = await fetchCloseoutRows();
  const rowsByOrg = new Map<string, LegacyFenceGraphRow[]>();

  for (const row of rows) {
    const existing = rowsByOrg.get(row.org_id) ?? [];
    existing.push(row);
    rowsByOrg.set(row.org_id, existing);
  }

  const report: Record<string, unknown>[] = [];

  for (const [currentOrgId, orgRows] of rowsByOrg.entries()) {
    const orgSettings = await fetchOrgSettings(currentOrgId);
    const currentConfig = mergeEstimatorConfig(
      (orgSettings?.estimator_config_json as DeepPartial<OrgEstimatorConfig> | null) ?? null,
    );

    const analyzedRows = orgRows
      .map((row) => {
        const actuals = buildActualsFromLegacyRow(row);
        const fenceType = inferFenceType(row.input_json);
        if (!actuals || !row.result_json || !fenceType) return null;
        const analysis = analyzeEstimateCloseout(row.result_json, actuals);
        return {
          row,
          actuals,
          analysis,
          fenceType,
          isTestLike: looksLikeTestRow(row.name),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    const productionRows = includeTestRows
      ? analyzedRows
      : analyzedRows.filter((item) => !item.isTestLike);

    const recommendations = productionRows.flatMap((item) =>
      buildEstimatorTuningRecommendations({
        analysis: item.analysis,
        actuals: item.actuals,
        currentConfig,
        fenceType: item.fenceType,
        siteComplexity: item.row.site_complexity_json,
      }).filter((recommendation) => recommendation.patch),
    );

    const grouped = summarizeRecommendations(recommendations);
    const qualifyingGroups = grouped.filter((group) => {
      const direction = group.directions[0] ?? "neutral";
      return group.count >= minRepeat && direction !== "mixed";
    });

    let nextConfig = currentConfig;
    const appliedAreas: string[] = [];

    for (const group of qualifyingGroups) {
      const patch = buildCombinedPatchForGroup(nextConfig, group);
      if (!patch) continue;
      nextConfig = applyEstimatorTuningRecommendations(nextConfig, [
        {
          ...group.recommendations[0],
          patch,
        },
      ]);
      appliedAreas.push(group.configArea);
    }

    const validationWarnings = validateEstimatorConfig(nextConfig);
    const canAutoApply = productionRows.length >= minCloseouts && appliedAreas.length > 0;

    if (shouldApply && currentOrgId === orgId && canAutoApply) {
      const nextOverrides = extractEstimatorOverrides(nextConfig);
      const { error } = await supabase
        .from("org_settings")
        .upsert(
          {
            org_id: currentOrgId,
            estimator_config_json: nextOverrides as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "org_id" },
        );

      if (error) {
        throw error;
      }
    }

    report.push({
      orgId: currentOrgId,
      totalClosedRows: orgRows.length,
      analyzedRows: analyzedRows.length,
      skippedTestRows: analyzedRows.filter((item) => item.isTestLike).length,
      productionRows: productionRows.length,
      enoughDataToAutoApply: canAutoApply,
      applyAttempted: shouldApply && currentOrgId === orgId,
      applyExecuted: shouldApply && currentOrgId === orgId && canAutoApply,
      qualifyingAreas: appliedAreas,
      groupedRecommendations: grouped.map((group) => ({
        configArea: group.configArea,
        title: group.title,
        count: group.count,
        direction: group.directions[0] ?? "neutral",
      })),
      sampleFenceTypes: Array.from(
        new Set(productionRows.map((item) => item.fenceType)),
      ),
      validationWarnings,
    });
  }

  console.log(JSON.stringify({
    filters: {
      orgId,
      includeTestRows,
      minCloseouts,
      minRepeat,
    },
    orgCount: rowsByOrg.size,
    report,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
