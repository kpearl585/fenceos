-- ================================================================
-- PHASE 1: FenceEstimatePro Core Schema (Wood Privacy MVP)
-- ================================================================
-- Creates graph-based fence design tables for accurate BOM generation
-- Separate from existing simple estimate system

-- ================================================================
-- 1. FENCE DESIGNS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fence_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,

  -- Design parameters
  total_linear_feet DECIMAL(10,2) NOT NULL,
  fence_type_id TEXT NOT NULL, -- FK to fence_types config table
  height_ft INTEGER NOT NULL DEFAULT 6 CHECK (height_ft IN (4, 6, 8)),

  -- Site conditions
  zip_code TEXT,
  frost_zone INTEGER DEFAULT 2 CHECK (frost_zone BETWEEN 1 AND 4),
  soil_type TEXT DEFAULT 'normal' CHECK (soil_type IN ('normal', 'sandy', 'clay', 'rocky')),

  -- Calculated graph metrics
  total_node_count INTEGER DEFAULT 0,
  total_section_count INTEGER DEFAULT 0,
  total_gate_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_fence_designs_org_id ON public.fence_designs(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fence_designs_estimate_id ON public.fence_designs(estimate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fence_designs_fence_type ON public.fence_designs(fence_type_id);

-- RLS
ALTER TABLE public.fence_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fence_designs_org_isolation" ON public.fence_designs
  FOR ALL
  USING (org_id = (SELECT get_my_org_id()));

-- Updated_at trigger
CREATE TRIGGER set_fence_designs_updated_at
  BEFORE UPDATE ON public.fence_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 2. FENCE NODES (Posts in the graph)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fence_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.fence_designs(id) ON DELETE CASCADE,

  -- Node classification
  node_type TEXT NOT NULL CHECK (node_type IN ('end_post', 'line_post', 'corner_post', 'gate_post', 'tee_post')),
  position_ft DECIMAL(10,2) NOT NULL, -- Linear position along fence line

  -- Post configuration
  post_config_id TEXT, -- FK to post_configs table
  post_size TEXT CHECK (post_size IN ('4x4', '6x6')),

  -- Metadata
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_fence_nodes_design_id ON public.fence_nodes(design_id);
CREATE INDEX idx_fence_nodes_node_type ON public.fence_nodes(node_type);

-- No RLS needed - inherits from fence_designs via FK

-- ================================================================
-- 3. FENCE SECTIONS (Runs between nodes)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fence_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.fence_designs(id) ON DELETE CASCADE,

  -- Graph topology
  start_node_id UUID NOT NULL REFERENCES public.fence_nodes(id) ON DELETE CASCADE,
  end_node_id UUID NOT NULL REFERENCES public.fence_nodes(id) ON DELETE CASCADE,

  -- Section measurements
  length_ft DECIMAL(10,2) NOT NULL,

  -- Optimized spacing calculation
  post_spacing_ft DECIMAL(10,2), -- Optimized spacing (6-8ft)
  bay_count INTEGER, -- Number of bays in this section

  -- Metadata
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_fence_sections_design_id ON public.fence_sections(design_id);
CREATE INDEX idx_fence_sections_start_node ON public.fence_sections(start_node_id);
CREATE INDEX idx_fence_sections_end_node ON public.fence_sections(end_node_id);

-- ================================================================
-- 4. GATES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.fence_designs(id) ON DELETE CASCADE,

  -- Gate configuration
  gate_type TEXT NOT NULL DEFAULT 'walk' CHECK (gate_type IN ('walk', 'drive_single', 'drive_double')),
  width_ft DECIMAL(10,2) NOT NULL,
  position_ft DECIMAL(10,2), -- Position along fence line

  -- Configuration references
  gate_config_id TEXT, -- FK to gate_configs table

  -- Gate posts (nodes that support this gate)
  hinge_post_id UUID REFERENCES public.fence_nodes(id),
  latch_post_id UUID REFERENCES public.fence_nodes(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_gates_design_id ON public.gates(design_id);
CREATE INDEX idx_gates_gate_type ON public.gates(gate_type);

-- ================================================================
-- 5. BOMS (Bill of Materials)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.boms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.fence_designs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- BOM metadata
  total_line_count INTEGER DEFAULT 0,
  total_material_cost DECIMAL(10,2) DEFAULT 0,

  -- Validation status
  validation_passed BOOLEAN DEFAULT false,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  validation_warnings JSONB DEFAULT '[]'::jsonb,

  -- Lock state (prevent recalculation)
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,

  -- Performance tracking
  calculation_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_boms_design_id ON public.boms(design_id);
CREATE INDEX idx_boms_org_id ON public.boms(org_id);

-- RLS
ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boms_org_isolation" ON public.boms
  FOR ALL
  USING (org_id = (SELECT get_my_org_id()));

-- Updated_at trigger
CREATE TRIGGER set_boms_updated_at
  BEFORE UPDATE ON public.boms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 6. BOM LINES (Individual material items)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES public.boms(id) ON DELETE CASCADE,

  -- Item classification
  category TEXT NOT NULL, -- 'post', 'rail', 'picket', 'concrete', 'gate', 'hardware'
  description TEXT NOT NULL,

  -- Quantities
  raw_quantity DECIMAL(10,2) NOT NULL, -- Calculated quantity before adjustments
  insurance_quantity DECIMAL(10,2) DEFAULT 0, -- Safety buffer (+2 posts, +5% concrete, etc.)
  order_quantity DECIMAL(10,2) NOT NULL, -- Final quantity to order (raw + insurance)

  -- Pricing
  unit_cost DECIMAL(10,2) DEFAULT 0,
  extended_cost DECIMAL(10,2) DEFAULT 0,

  -- Traceability
  calculation_notes TEXT NOT NULL, -- e.g., "20 line + 2 corner + 2 end + 2 insurance = 24"

  -- Sorting
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bom_lines_bom_id ON public.bom_lines(bom_id);
CREATE INDEX idx_bom_lines_category ON public.bom_lines(category);

-- No RLS needed - inherits from boms via FK
