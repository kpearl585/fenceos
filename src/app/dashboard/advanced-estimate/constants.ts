// Centralized defaults and limits for the Advanced Estimator.
// Owning these here instead of scattering literals across components means a
// single place to tune ranges when contractor feedback comes in.

// Project defaults
export const DEFAULT_LABOR_RATE = 65;         // $/hr for a 2-person crew
export const DEFAULT_WASTE_PCT = 5;            // Industry-standard waste factor %
export const DEFAULT_MARKUP_PCT = 35;          // Typical fence contractor markup over cost %
export const DEFAULT_FENCE_HEIGHT_IN = 72;     // 6 ft panel, used when productLine is missing
export const DEFAULT_POST_SIZE = "5x5";        // Fallback post size
export const DEFAULT_LABOR_EFFICIENCY = 1.0;   // Neutral site-difficulty multiplier

// Input ranges (min/max) — used by form validation + schema
export const LABOR_RATE_MIN = 20;
export const LABOR_RATE_MAX = 200;
export const WASTE_PCT_MIN = 1;
export const WASTE_PCT_MAX = 20;
export const MARKUP_PCT_MIN = 0;
export const MARKUP_PCT_MAX = 200;
export const LABOR_EFFICIENCY_MIN = 0.7;
export const LABOR_EFFICIENCY_MAX = 1.5;
export const LABOR_EFFICIENCY_STEP = 0.05;
export const SIMPLE_CORNERS_MAX = 20;
export const SLOPE_DEG_MIN = 0;
export const SLOPE_DEG_MAX = 45;
export const SLOPE_RACKED_MAX_DEG = 18; // Above this, panels are stepped, not racked

// Gate defaults
export const DEFAULT_GATE_WIDTH_FT = 4;
export const GATE_WIDTH_MIN = 3;
export const GATE_WIDTH_MAX = 14;

// Proposal / scheduling
export const DEFAULT_CREW_LEAD_DAYS = 7;       // Business days until crew available
export const DEFAULT_PROPOSAL_VALID_DAYS = 30; // Quote validity window

// Feedback / status timers (ms)
export const STATUS_RESET_MS = 3000;
export const CONVERT_ERROR_RESET_MS = 4000;
