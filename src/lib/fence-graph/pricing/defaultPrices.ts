// ── Default Price Map ────────────────────────────────────────────
// Regional pricing tables for contractor-realistic material costs
// Prices based on Q1 2026 wholesale supplier averages
// Last updated: April 2026

/**
 * Base prices for East Coast / Mid-Atlantic region
 * All prices in USD
 */
export const DEFAULT_PRICES_BASE: Record<string, number> = {
  // ── VINYL ──────────────────────────────────────────────────────
  // Posts
  VINYL_POST_5X5: 38.00,
  VINYL_POST_4X4: 25.00,
  VINYL_POST_CAP: 7.50,
  POST_SLEEVE_5X5: 10.50,
  POST_SLEEVE_4X4: 8.00,

  // Panels (pre-fab)
  VINYL_PANEL_8FT: 85.00,
  VINYL_PANEL_6FT: 68.00,
  VINYL_PANEL_4FT: 48.00,

  // Pickets (component systems)
  VINYL_PICKET_8FT: 4.50,
  VINYL_PICKET_6FT: 3.60,
  VINYL_PICKET_4FT: 2.65,

  // Rails
  VINYL_RAIL_8FT: 24.00,
  VINYL_RAIL_6FT: 18.50,

  // Vinyl Hardware
  VINYL_RAIL_BRACKET: 2.75,
  VINYL_U_CHANNEL_8FT: 6.50,

  // ── WOOD ───────────────────────────────────────────────────────
  // Posts
  WOOD_POST_6X6_8: 34.00,
  WOOD_POST_4X4_10: 19.50,
  WOOD_POST_4X4_8: 14.50,
  POST_CAP_4X4: 4.00,

  // Rails
  WOOD_RAIL_2X4_8: 7.50,
  WOOD_RAIL_BOT_8: 5.50,

  // Panels & Pickets
  WOOD_PANEL_8FT: 58.00,
  WOOD_PANEL_6FT: 46.00,
  WOOD_PICKET_8FT: 3.10,
  WOOD_PICKET_6FT: 2.50,
  WOOD_PICKET_4FT: 1.95,

  // Wood Hardware
  WOOD_HURRICANE_TIE: 1.85,
  WOOD_CARRIAGE_BOLT: 0.65,

  // ── CHAIN LINK ─────────────────────────────────────────────────
  CHAIN_LINK_POST_2IN: 12.00,
  CL_POST_2IN: 12.00,               // Alias for chain link line post
  CL_POST_TERM: 16.00,              // Terminal post (heavier gauge than line post)
  CHAIN_LINK_POST_CAP: 3.50,
  CHAIN_LINK_RAIL_10FT: 18.00,
  CL_TOPRAIL: 18.00,                // Alias for chain link top rail (21ft sections)
  CHAIN_LINK_FABRIC_6FT: 2.10,      // per linear foot
  CHAIN_LINK_FABRIC_4FT: 1.65,
  CL_FABRIC_6FT: 2.10,              // Alias for 6ft fabric
  CL_FABRIC_4FT: 1.65,              // Alias for 4ft fabric
  CHAIN_LINK_TENSION_WIRE: 0.35,
  CL_TENSION_WIRE: 0.35,            // Alias for tension wire
  CHAIN_LINK_TIE_WIRE_LB: 12.00,
  CL_TENSION_BAR: 4.50,             // Tension bar for fabric termination
  CL_TENSION_BAND: 0.85,            // Tension band (clamps tension bar to post)
  CL_BRACE_BAND: 1.20,              // Brace band (holds top rail at terminal posts)
  CL_LOOP_CAP: 0.65,                // Loop cap (holds top rail on line posts)
  CL_RAIL_END: 2.00,                // Rail end fitting (where top rail meets terminal post)

  // ── ALUMINUM ───────────────────────────────────────────────────
  ALUMINUM_POST_4IN: 68.00,
  ALUM_POST_2X2: 68.00,             // Alias for aluminum post
  ALUMINUM_POST_CAP: 12.00,
  ALUM_POST_CAP: 12.00,             // Alias for aluminum post cap
  ALUMINUM_PANEL_6FT: 145.00,
  ALUM_PANEL_6FT: 145.00,           // Alias for 6ft aluminum panel
  ALUMINUM_PANEL_4FT: 110.00,
  ALUM_PANEL_4FT: 110.00,           // Alias for 4ft aluminum panel
  ALUMINUM_RAIL_8FT: 42.00,
  ALUM_RAIL_FLAT: 42.00,            // Alias for aluminum flat rail
  ALUM_SET_SCREW: 0.15,             // Aluminum fence set screw #14

  // ── GATES ──────────────────────────────────────────────────────
  GATE_VINYL_4FT: 185.00,
  GATE_VINYL_6FT: 240.00,
  GATE_VINYL_DBL: 485.00,           // Vinyl double drive gate kit (both leaves + center drop rod hw)
  GATE_WOOD_4FT: 165.00,
  GATE_WOOD_DBL: 425.00,
  GATE_CHAIN_LINK_4FT: 95.00,
  GATE_CL_4FT: 95.00,               // Alias for chain link walk gate
  GATE_CHAIN_LINK_DBL: 245.00,
  GATE_CL_DBL: 245.00,              // Alias for chain link double drive gate
  GATE_ALUMINUM_4FT: 295.00,
  GATE_ALUM_4FT: 295.00,            // Alias for aluminum walk gate
  GATE_ALUM_DBL: 695.00,            // Aluminum ornamental double drive gate kit

  // ── GATE HARDWARE ──────────────────────────────────────────────
  HINGE_HD: 18.50,              // Heavy duty hinge (per pair)
  GATE_LATCH: 28.00,            // Standard gate latch
  GATE_LATCH_POOL: 42.00,       // Pool-code self-closing latch
  GATE_STOP: 9.50,              // Gate stop (pair)
  DROP_ROD: 38.00,              // Drop rod for double gates
  GATE_SPRING_CLOSER: 32.00,    // Spring closer mechanism

  // ── CONCRETE & FOUNDATION ──────────────────────────────────────
  CONCRETE_80LB: 5.75,
  CONCRETE_60LB: 4.50,
  GRAVEL_40LB: 4.25,
  GRAVEL_50LB: 5.25,

  // ── GENERAL HARDWARE ───────────────────────────────────────────
  ALUM_INSERT: 16.50,           // Aluminum post insert (reinforcement)
  REBAR_4_3FT: 7.25,            // Rebar #4 3ft (wind bracing)
  SCREWS_1LB: 9.50,             // Deck screws (1lb box)
  SCREWS_5LB: 42.00,            // Bulk screws
  NAILS_1LB: 6.00,              // Galvanized nails
  STAPLES_1LB: 8.50,            // Fence staples / tie wire (1lb box)
};

/**
 * Regional price multipliers
 * Apply to base prices to get regional estimates
 */
export const REGIONAL_MULTIPLIERS = {
  base: 1.00,           // Base wholesale pricing (no regional adjustment)
  northeast: 1.15,      // Boston, NYC, Philly
  southeast: 0.95,      // Atlanta, Charlotte, Birmingham
  midwest: 0.88,        // Chicago, Detroit, Cleveland
  south_central: 0.92,  // Dallas, Houston, Memphis
  southwest: 1.05,      // Phoenix, Albuquerque, Vegas
  west: 1.28,           // LA, SF, Seattle, Portland
  florida: 1.08,        // Miami, Tampa, Jacksonville
  northwest: 1.12,      // Portland, Seattle
  mountain: 0.98,       // Denver, Salt Lake City
} as const;

export type Region = keyof typeof REGIONAL_MULTIPLIERS;

/**
 * Get price map for specific region
 * @param region Geographic region for pricing
 * @returns Price map with regional adjustments applied
 */
export function getPriceMap(region: Region = 'base'): Record<string, number> {
  const multiplier = REGIONAL_MULTIPLIERS[region];
  const prices: Record<string, number> = {};

  for (const [sku, basePrice] of Object.entries(DEFAULT_PRICES_BASE)) {
    // Round to nearest $0.25 for realistic pricing
    prices[sku] = Math.round(basePrice * multiplier * 4) / 4;
  }

  return prices;
}

/**
 * Merge user-provided prices with defaults
 * User prices take precedence
 */
export function mergePrices(
  userPrices: Record<string, number>,
  region: Region = 'base'
): Record<string, number> {
  return {
    ...getPriceMap(region),
    ...userPrices,
  };
}

/**
 * Get price for a specific SKU with fallback
 */
export function getPrice(
  sku: string,
  userPrices: Record<string, number> = {},
  region: Region = 'base'
): number | undefined {
  return userPrices[sku] ?? getPriceMap(region)[sku];
}

/**
 * Validate that all required SKUs have prices
 * Returns list of missing SKUs
 */
export function validatePriceMap(
  requiredSkus: string[],
  priceMap: Record<string, number>
): { valid: boolean; missing: string[] } {
  const missing = requiredSkus.filter(sku => priceMap[sku] === undefined);
  return {
    valid: missing.length === 0,
    missing,
  };
}
