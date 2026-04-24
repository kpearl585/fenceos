-- ================================================================
-- PHASE 1: FenceEstimatePro Configuration Tables
-- ================================================================
-- Lookup tables for fence types, post configs, materials, etc.

-- ================================================================
-- 1. FENCE TYPES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fence_types (
  id TEXT PRIMARY KEY, -- e.g., 'wood_privacy_6ft'
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('wood', 'chain_link', 'vinyl', 'aluminum', 'steel', 'composite')),
  height_ft INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. POST CONFIGS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.post_configs (
  id TEXT PRIMARY KEY, -- e.g., '4x4_line_wood'
  fence_type_id TEXT NOT NULL REFERENCES public.fence_types(id),

  -- Post specifications
  post_size TEXT NOT NULL, -- '4x4', '6x6'
  node_type TEXT NOT NULL, -- 'line_post', 'corner_post', 'end_post', 'gate_post'
  actual_size_in DECIMAL(10,2) NOT NULL, -- 3.5 for "4x4", 5.5 for "6x6"
  length_ft INTEGER NOT NULL DEFAULT 8,

  -- Installation specs
  default_hole_diameter_in INTEGER, -- 10 for 4x4, 12 for 6x6
  embedment_depth_base_in INTEGER DEFAULT 30, -- Base depth before frost adjustment

  -- Material specs
  material_type TEXT DEFAULT 'pressure_treated', -- 'pressure_treated', 'cedar', 'steel'

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_configs_fence_type ON public.post_configs(fence_type_id);

-- ================================================================
-- 3. RAIL CONFIGS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.rail_configs (
  id TEXT PRIMARY KEY, -- e.g., '2x4_wood_6ft'
  fence_type_id TEXT NOT NULL REFERENCES public.fence_types(id),

  -- Rail specifications
  nominal_size TEXT NOT NULL, -- '2x4'
  actual_width_in DECIMAL(10,2) NOT NULL, -- 1.5
  actual_height_in DECIMAL(10,2) NOT NULL, -- 3.5

  -- Rails per height
  rails_per_bay_4ft INTEGER DEFAULT 2,
  rails_per_bay_6ft INTEGER DEFAULT 3,
  rails_per_bay_8ft INTEGER DEFAULT 4,

  -- Available lengths
  available_lengths_ft INTEGER[] DEFAULT '{8,10,12,16}',

  material_type TEXT DEFAULT 'pressure_treated',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rail_configs_fence_type ON public.rail_configs(fence_type_id);

-- ================================================================
-- 4. PANEL CONFIGS (Pickets/Boards)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.panel_configs (
  id TEXT PRIMARY KEY, -- e.g., '1x6_dogear_privacy'
  fence_type_id TEXT NOT NULL REFERENCES public.fence_types(id),

  -- Board specifications
  nominal_size TEXT NOT NULL, -- '1x6'
  actual_width_in DECIMAL(10,2) NOT NULL, -- 5.5
  length_ft INTEGER NOT NULL DEFAULT 6,

  -- Style
  style TEXT NOT NULL, -- 'privacy', 'semi_privacy', 'board_on_board', 'picket'
  top_style TEXT, -- 'dog_ear', 'flat', 'gothic'

  -- Spacing rules
  gap_inches DECIMAL(10,2) DEFAULT 0, -- 0 for privacy, 1+ for semi-privacy

  material_type TEXT DEFAULT 'pressure_treated',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_panel_configs_fence_type ON public.panel_configs(fence_type_id);

-- ================================================================
-- 5. GATE CONFIGS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.gate_configs (
  id TEXT PRIMARY KEY, -- e.g., 'walk_3ft_wood'
  fence_type_id TEXT NOT NULL REFERENCES public.fence_types(id),

  -- Gate specs
  gate_type TEXT NOT NULL CHECK (gate_type IN ('walk', 'drive_single', 'drive_double')),
  width_ft DECIMAL(10,2) NOT NULL,
  height_ft INTEGER NOT NULL,

  -- Material
  frame_material TEXT DEFAULT 'metal', -- 'metal', 'wood'

  -- Hardware requirements
  hinge_count INTEGER DEFAULT 2,
  requires_wheel BOOLEAN DEFAULT false, -- true if width > 6ft

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_configs_fence_type ON public.gate_configs(fence_type_id);

-- ================================================================
-- 6. HARDWARE KITS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.hardware_kits (
  id TEXT PRIMARY KEY, -- e.g., 'wood_fence_brackets'
  fence_type_id TEXT NOT NULL REFERENCES public.fence_types(id),

  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'fasteners', 'brackets', 'caps', 'hinges', 'latches'

  -- Usage rules
  qty_per_bay INTEGER, -- e.g., 12 brackets per bay
  qty_per_post INTEGER, -- e.g., 1 cap per post
  qty_per_gate INTEGER, -- e.g., 2 hinges per gate

  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hardware_kits_fence_type ON public.hardware_kits(fence_type_id);

-- ================================================================
-- 7. HARDWARE ITEMS (Individual items within kits)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.hardware_items (
  id TEXT PRIMARY KEY, -- e.g., 'tee_hinge_heavy'
  kit_id TEXT NOT NULL REFERENCES public.hardware_kits(id),

  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1, -- qty per kit usage

  sku TEXT,
  unit_cost DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hardware_items_kit_id ON public.hardware_items(kit_id);

-- ================================================================
-- 8. CONCRETE RULES (Volumetric calculation parameters)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.concrete_rules (
  id TEXT PRIMARY KEY, -- e.g., 'zone2_4x4_normal'

  -- Conditions
  frost_zone INTEGER NOT NULL CHECK (frost_zone BETWEEN 1 AND 4),
  post_size TEXT NOT NULL,
  soil_type TEXT NOT NULL,

  -- Hole specifications
  hole_diameter_in INTEGER NOT NULL,
  hole_depth_in INTEGER NOT NULL, -- Includes frost depth + 6"

  -- Concrete calculation
  bags_per_post DECIMAL(10,2), -- Pre-calculated for common sizes, or NULL to use volumetric formula

  -- Frost depths by zone (for reference)
  -- Zone 1: 18", Zone 2: 30", Zone 3: 36", Zone 4: 48"

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concrete_rules_conditions ON public.concrete_rules(frost_zone, post_size, soil_type);
