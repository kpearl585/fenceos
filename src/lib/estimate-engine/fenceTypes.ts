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
export const REQUIRED_SKUS: Record<FenceType, string[]> = {
  wood_privacy: [
    "WOOD_PANEL_8FT",
    "WOOD_POST_4X4_8FT",
    "CONCRETE_BAG_80LB",
    "WOOD_GATE_SINGLE",
    "WOOD_GATE_HARDWARE_SET",
    "WOOD_FASTENERS_BOX",
  ],
  chain_link: [
    "CL_FABRIC_4FT",
    "CL_TOP_RAIL",
    "CL_LINE_POST",
    "CL_TERMINAL_POST",
    "CL_TENSION_BAND",
    "CL_TIE_WIRE",
    "CONCRETE_BAG_80LB",
    "CL_GATE_SINGLE",
    "CL_FITTINGS_MISC",
  ],
  vinyl: [
    "VINYL_PANEL_8FT",
    "VINYL_POST_5X5_8FT",
    "CONCRETE_BAG_80LB",
    "VINYL_GATE_SINGLE",
    "VINYL_GATE_HARDWARE_SET",
  ],
  aluminum: [
    "ALUM_PANEL_4FT",
    "ALUM_POST_2X2",
    "CONCRETE_BAG_80LB",
    "GATE_ALUM_4FT",
    "HINGE_HD",
    "GATE_LATCH",
  ],
};
