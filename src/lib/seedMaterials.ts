import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Seeds a new org with standard fence materials.
 * unit_cost = typical contractor cost; unit_price = suggested sell price (2x markup).
 * Users can edit prices freely from the Materials page.
 */
export async function seedMaterials(admin: SupabaseClient, orgId: string): Promise<void> {
  const materials = [
    // Wood Privacy
    { name: "Wood Privacy Panel 8ft", sku: "WOOD_PANEL_8FT",   category: "wood_privacy",  unit: "ea",  unit_cost: 45.00,  unit_price: 90.00 },
    { name: "Wood Privacy Panel 6ft", sku: "WOOD_PANEL_6FT",   category: "wood_privacy",  unit: "ea",  unit_cost: 35.00,  unit_price: 70.00 },
    { name: "Wood Picket 1x4x6",      sku: "WOOD_PICKET_6FT",  category: "wood_privacy",  unit: "ea",  unit_cost: 3.50,   unit_price: 7.00  },
    { name: "Wood Picket 1x4x8",      sku: "WOOD_PICKET_8FT",  category: "wood_privacy",  unit: "ea",  unit_cost: 4.50,   unit_price: 9.00  },
    // Wood Posts
    { name: "Wood Post 4x4x8",        sku: "WOOD_POST_4X4_8",  category: "wood_post",     unit: "ea",  unit_cost: 12.00,  unit_price: 24.00 },
    { name: "Wood Post 4x4x10",       sku: "WOOD_POST_4X4_10", category: "wood_post",     unit: "ea",  unit_cost: 16.00,  unit_price: 32.00 },
    { name: "Wood Post 6x6x8",        sku: "WOOD_POST_6X6_8",  category: "wood_post",     unit: "ea",  unit_cost: 22.00,  unit_price: 44.00 },
    // Wood Rails
    { name: "Top Rail 2x4x8 Pressure Treated", sku: "WOOD_RAIL_2X4_8", category: "wood_rail", unit: "ea", unit_cost: 8.00, unit_price: 16.00 },
    { name: "Bottom Rail 2x4x8 Pressure Treated", sku: "WOOD_RAIL_BOT_8", category: "wood_rail", unit: "ea", unit_cost: 8.00, unit_price: 16.00 },
    // Vinyl
    { name: "Vinyl Privacy Panel 8ft", sku: "VINYL_PANEL_8FT",  category: "vinyl_privacy", unit: "ea",  unit_cost: 75.00,  unit_price: 150.00 },
    { name: "Vinyl Privacy Panel 6ft", sku: "VINYL_PANEL_6FT",  category: "vinyl_privacy", unit: "ea",  unit_cost: 60.00,  unit_price: 120.00 },
    { name: "Vinyl Post 5x5x10",       sku: "VINYL_POST_5X5",   category: "vinyl_post",    unit: "ea",  unit_cost: 35.00,  unit_price: 70.00  },
    { name: "Vinyl Post Cap",          sku: "VINYL_POST_CAP",   category: "vinyl_post",    unit: "ea",  unit_cost: 4.00,   unit_price: 8.00   },
    { name: "Vinyl Rail 8ft",          sku: "VINYL_RAIL_8FT",   category: "vinyl_rail",    unit: "ea",  unit_cost: 18.00,  unit_price: 36.00  },
    // Chain Link — fabric & top rail priced PER FOOT (engine calculates in linear ft)
    // $85/50ft roll = $1.70/ft cost; $18/21ft section = $0.86/ft cost
    { name: "Chain Link Fabric 4ft (per ft)", sku: "CL_FABRIC_4FT",  category: "chain_link", unit: "ft",  unit_cost: 1.70,   unit_price: 3.40  },
    { name: "Chain Link Fabric 6ft (per ft)", sku: "CL_FABRIC_6FT",  category: "chain_link", unit: "ft",  unit_cost: 2.40,   unit_price: 4.80  },
    { name: "Chain Link Post 2in x 10ft",     sku: "CL_POST_2IN",    category: "chain_link", unit: "ea",  unit_cost: 22.00,  unit_price: 44.00 },
    { name: "Chain Link Terminal Post 2.5in", sku: "CL_POST_TERM",   category: "chain_link", unit: "ea",  unit_cost: 28.00,  unit_price: 56.00 },
    { name: "Chain Link Top Rail (per ft)",   sku: "CL_TOPRAIL",     category: "chain_link", unit: "ft",  unit_cost: 0.90,   unit_price: 1.80  },
    { name: "Chain Link Tension Wire",        sku: "CL_TENSION_WIRE",category: "chain_link", unit: "ea",  unit_cost: 20.00,  unit_price: 40.00 },
    // Aluminum / Ornamental
    { name: "Aluminum Picket Panel 4ft",  sku: "ALUM_PANEL_4FT",  category: "aluminum",  unit: "ea",  unit_cost: 65.00,  unit_price: 130.00 },
    { name: "Aluminum Picket Panel 6ft",  sku: "ALUM_PANEL_6FT",  category: "aluminum",  unit: "ea",  unit_cost: 85.00,  unit_price: 170.00 },
    { name: "Aluminum Post 2x2x8",        sku: "ALUM_POST_2X2",   category: "aluminum",  unit: "ea",  unit_cost: 28.00,  unit_price: 56.00  },
    { name: "Aluminum Flat Top Rail 1x1.5x21ft", sku: "ALUM_RAIL_FLAT", category: "aluminum", unit: "ea", unit_cost: 22.00, unit_price: 44.00 },
    { name: "Aluminum Post Cap 2x2",      sku: "ALUM_POST_CAP",   category: "aluminum",  unit: "ea",  unit_cost: 3.00,   unit_price: 6.00   },
    // Gates
    { name: "Wood Walk Gate 4ft",         sku: "GATE_WOOD_4FT",   category: "gate",       unit: "ea",  unit_cost: 95.00,  unit_price: 190.00 },
    { name: "Wood Walk Gate 6ft",         sku: "GATE_WOOD_6FT",   category: "gate",       unit: "ea",  unit_cost: 120.00, unit_price: 240.00 },
    { name: "Wood Double Drive Gate 12ft",sku: "GATE_WOOD_DBL",   category: "gate",       unit: "ea",  unit_cost: 280.00, unit_price: 560.00 },
    { name: "Chain Link Walk Gate 4ft",   sku: "GATE_CL_4FT",     category: "gate",       unit: "ea",  unit_cost: 75.00,  unit_price: 150.00 },
    { name: "Chain Link Drive Gate 10ft", sku: "GATE_CL_DBL",     category: "gate",       unit: "ea",  unit_cost: 180.00, unit_price: 360.00 },
    { name: "Vinyl Walk Gate 4ft",        sku: "GATE_VINYL_4FT",  category: "gate",       unit: "ea",  unit_cost: 130.00, unit_price: 260.00 },
    { name: "Aluminum Walk Gate 4ft",     sku: "GATE_ALUM_4FT",   category: "gate",       unit: "ea",  unit_cost: 110.00, unit_price: 220.00 },
    // Hardware & Concrete
    { name: "Post Concrete 80lb Bag",     sku: "CONCRETE_80LB",   category: "hardware",   unit: "bag", unit_cost: 7.00,   unit_price: 14.00  },
    { name: "Hinge Heavy Duty Pair",      sku: "HINGE_HD",        category: "hardware",   unit: "pr",  unit_cost: 18.00,  unit_price: 36.00  },
    { name: "Gate Latch",                 sku: "GATE_LATCH",      category: "hardware",   unit: "ea",  unit_cost: 12.00,  unit_price: 24.00  },
    { name: "Post Cap 4x4",               sku: "POST_CAP_4X4",    category: "hardware",   unit: "ea",  unit_cost: 3.50,   unit_price: 7.00   },
    { name: "Fence Screws 1lb",           sku: "SCREWS_1LB",      category: "hardware",   unit: "lb",  unit_cost: 6.00,   unit_price: 12.00  },
    { name: "Fence Staples 1lb",          sku: "STAPLES_1LB",     category: "hardware",   unit: "lb",  unit_cost: 5.00,   unit_price: 10.00  },
  ];

  const rows = materials.map((m) => ({ ...m, org_id: orgId }));

  // Insert in batches of 20 to avoid payload limits
  for (let i = 0; i < rows.length; i += 20) {
    await admin.from("materials").insert(rows.slice(i, i + 20));
  }
}
