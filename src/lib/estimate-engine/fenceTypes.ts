// ── Fence Type Configuration ────────────────────────────────────
import type { FenceType } from "./types";

export interface FenceTypeConfig {
  label: string;
  defaultPostSpacing: number;   // feet
  defaultHeight: number;        // feet
  laborHoursPer100Ft: number;   // crew-hours per 100 linear feet
  concreteBagsPerPost: number;
}

export const FENCE_TYPE_CONFIGS: Record<FenceType, FenceTypeConfig> = {
  wood_privacy: {
    label: "Wood Privacy",
    defaultPostSpacing: 8,
    defaultHeight: 6,
    laborHoursPer100Ft: 8,
    concreteBagsPerPost: 2,
  },
  chain_link: {
    label: "Chain Link",
    defaultPostSpacing: 10,
    defaultHeight: 4,
    laborHoursPer100Ft: 6,
    concreteBagsPerPost: 1.5,
  },
  vinyl: {
    label: "Vinyl",
    defaultPostSpacing: 8,
    defaultHeight: 6,
    laborHoursPer100Ft: 7,
    concreteBagsPerPost: 2,
  },
  aluminum: {
    label: "Aluminum / Ornamental",
    defaultPostSpacing: 6,
    defaultHeight: 4,
    laborHoursPer100Ft: 7,
    concreteBagsPerPost: 2,
  },
};

export const FENCE_TYPE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: "wood_privacy", label: "Wood Privacy" },
  { value: "chain_link", label: "Chain Link" },
  { value: "vinyl", label: "Vinyl" },
  { value: "aluminum", label: "Aluminum / Ornamental" },
];

/** Required SKUs per fence type — engine will error if any are missing */
// Only unconditional SKUs (always used regardless of gate count).
// Gate-specific SKUs are optional — engine skips them when gateCount = 0.
export const REQUIRED_SKUS: Record<FenceType, string[]> = {
  wood_privacy: [
    "WOOD_PANEL_8FT",
    "WOOD_POST_4X4_8",
    "CONCRETE_80LB",
    "SCREWS_1LB",
  ],
  chain_link: [
    "CL_FABRIC_4FT",
    "CL_TOPRAIL",
    "CL_POST_2IN",
    "CL_POST_TERM",
    "CL_TENSION_WIRE",
    "STAPLES_1LB",
    "CONCRETE_80LB",
  ],
  vinyl: [
    "VINYL_PANEL_8FT",
    "VINYL_POST_5X5",
    "CONCRETE_80LB",
  ],
  aluminum: [
    "ALUM_PANEL_4FT",
    "ALUM_POST_2X2",
    "CONCRETE_80LB",
  ],
};
