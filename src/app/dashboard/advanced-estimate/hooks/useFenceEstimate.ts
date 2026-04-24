"use client";
import { useMemo } from "react";
import {
  estimateFence,
  type FenceProjectInput,
  type FenceEstimateResult,
  type FenceType,
  type WoodStyle,
  type RunInput,
  type GateInput,
  type OrgEstimatorConfig,
} from "@/lib/fence-graph/engine";
import type { SoilType, PanelHeight, PostSize } from "@/lib/fence-graph/types";

// Map engine/validation errors to contractor-friendly copy.
function getUserFriendlyError(technicalMessage: string): string {
  const errorMap: Record<string, string> = {
    "RunInput.linearFeet required": "Please enter the linear feet for your fence runs",
    "No runs provided": "Add at least one fence section to generate an estimate",
    "runs.length === 0": "Add at least one fence section to generate an estimate",
    "Invalid post spacing": "Post spacing must be between 6-10 feet for this fence type",
    "Gate width exceeds": "Gate is too wide for the fence section. Try a smaller gate or longer run",
    "missing required": "Please fill in all required fields",
    "calculation error": "Unable to calculate estimate. Please check your inputs and try again",
  };
  const lower = technicalMessage.toLowerCase();
  for (const [pattern, friendlyMsg] of Object.entries(errorMap)) {
    if (lower.includes(pattern.toLowerCase())) return friendlyMsg;
  }
  return "Something went wrong. Please check your inputs and try again.";
}

export interface UseFenceEstimateArgs {
  productLineId: string;
  fenceHeight: PanelHeight;
  postSize: PostSize;
  soilType: SoilType;
  windMode: boolean;
  effectiveRuns: RunInput[];
  gates: GateInput[];
  existingFenceRemoval: boolean;
  permitCost: number;
  inspectionCost: number;
  engineeringCost: number;
  surveyCost: number;
  fenceType: FenceType;
  woodStyle: WoodStyle;
  laborRate: number;
  wastePct: number;
  priceMap: Record<string, number>;
  estimateConfig?: OrgEstimatorConfig;
}

export interface UseFenceEstimateReturn {
  input: FenceProjectInput;
  result: FenceEstimateResult | null;
  estimateError: string | null;
  hasValidInput: boolean;
}

// Pure hook that builds the engine input, runs the estimator, and captures
// errors in a single memo. No component state, no setState-in-render.
// Caller owns all the source state and passes primitives in.
export function useFenceEstimate(args: UseFenceEstimateArgs): UseFenceEstimateReturn {
  const {
    productLineId, fenceHeight, postSize, soilType, windMode,
    effectiveRuns, gates, existingFenceRemoval,
    permitCost, inspectionCost, engineeringCost, surveyCost,
    fenceType, woodStyle, laborRate, wastePct, priceMap, estimateConfig,
  } = args;

  return useMemo<UseFenceEstimateReturn>(() => {
    const nextInput: FenceProjectInput = {
      projectName: "Advanced Estimate",
      productLineId,
      fenceHeight,
      postSize,
      soilType,
      windMode,
      runs: effectiveRuns.filter((r) => r.linearFeet > 0),
      gates,
      existingFenceRemoval,
      permitCost: permitCost > 0 ? permitCost : undefined,
      inspectionCost: inspectionCost > 0 ? inspectionCost : undefined,
      engineeringCost: engineeringCost > 0 ? engineeringCost : undefined,
      surveyCost: surveyCost > 0 ? surveyCost : undefined,
    };
    const hasValidInput = nextInput.runs.length > 0;
    if (!hasValidInput) {
      return { input: nextInput, result: null, estimateError: null, hasValidInput: false };
    }
    try {
      const r = estimateFence(nextInput, {
        fenceType, woodStyle, laborRatePerHr: laborRate, wastePct: wastePct / 100, priceMap,
        estimatorConfig: estimateConfig,
      });
      return { input: nextInput, result: r, estimateError: null, hasValidInput: true };
    } catch (err) {
      const technicalMessage = err instanceof Error ? err.message : "Calculation error";
      return {
        input: nextInput,
        result: null,
        estimateError: getUserFriendlyError(technicalMessage),
        hasValidInput: true,
      };
    }
  }, [
    productLineId, fenceHeight, postSize, soilType, windMode,
    effectiveRuns, gates, existingFenceRemoval,
    permitCost, inspectionCost, engineeringCost, surveyCost,
    fenceType, woodStyle, laborRate, wastePct, priceMap, estimateConfig,
  ]);
}
