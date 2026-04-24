-- ================================================================
-- PHASE 1: Seed Wood Privacy Configuration Data
-- ================================================================

-- ================================================================
-- 1. FENCE TYPE: Wood Privacy 6ft
-- ================================================================
INSERT INTO public.fence_types (id, name, category, height_ft, description, is_active)
VALUES
  ('wood_privacy_6ft', 'Wood Privacy 6ft', 'wood', 6, 'Standard 6ft pressure-treated wood privacy fence', true),
  ('wood_privacy_4ft', 'Wood Privacy 4ft', 'wood', 4, 'Standard 4ft pressure-treated wood privacy fence', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ================================================================
-- 2. POST CONFIGS
-- ================================================================
INSERT INTO public.post_configs (id, fence_type_id, post_size, node_type, actual_size_in, length_ft, default_hole_diameter_in, embedment_depth_base_in, material_type)
VALUES
  -- 4x4 posts for wood privacy
  ('4x4_line_wood', 'wood_privacy_6ft', '4x4', 'line_post', 3.5, 8, 10, 30, 'pressure_treated'),
  ('4x4_corner_wood', 'wood_privacy_6ft', '4x4', 'corner_post', 3.5, 8, 10, 30, 'pressure_treated'),
  ('4x4_end_wood', 'wood_privacy_6ft', '4x4', 'end_post', 3.5, 8, 10, 30, 'pressure_treated'),

  -- 6x6 posts for gates
  ('6x6_gate_wood', 'wood_privacy_6ft', '6x6', 'gate_post', 5.5, 8, 12, 36, 'pressure_treated'),

  -- 4ft fence variants (same configs, different fence_type reference)
  ('4x4_line_wood_4ft', 'wood_privacy_4ft', '4x4', 'line_post', 3.5, 8, 10, 30, 'pressure_treated'),
  ('4x4_corner_wood_4ft', 'wood_privacy_4ft', '4x4', 'corner_post', 3.5, 8, 10, 30, 'pressure_treated'),
  ('4x4_end_wood_4ft', 'wood_privacy_4ft', '4x4', 'end_post', 3.5, 8, 10, 30, 'pressure_treated'),
  ('6x6_gate_wood_4ft', 'wood_privacy_4ft', '6x6', 'gate_post', 5.5, 8, 12, 36, 'pressure_treated')
ON CONFLICT (id) DO UPDATE SET
  actual_size_in = EXCLUDED.actual_size_in,
  default_hole_diameter_in = EXCLUDED.default_hole_diameter_in;

-- ================================================================
-- 3. RAIL CONFIGS
-- ================================================================
INSERT INTO public.rail_configs (id, fence_type_id, nominal_size, actual_width_in, actual_height_in, rails_per_bay_4ft, rails_per_bay_6ft, rails_per_bay_8ft, available_lengths_ft, material_type)
VALUES
  ('2x4_wood_6ft', 'wood_privacy_6ft', '2x4', 1.5, 3.5, 2, 3, 4, '{8,10,12,16}', 'pressure_treated'),
  ('2x4_wood_4ft', 'wood_privacy_4ft', '2x4', 1.5, 3.5, 2, 3, 4, '{8,10,12,16}', 'pressure_treated')
ON CONFLICT (id) DO UPDATE SET
  rails_per_bay_6ft = EXCLUDED.rails_per_bay_6ft;

-- ================================================================
-- 4. PANEL CONFIGS (Pickets)
-- ================================================================
INSERT INTO public.panel_configs (id, fence_type_id, nominal_size, actual_width_in, length_ft, style, top_style, gap_inches, material_type)
VALUES
  ('1x6_dogear_privacy', 'wood_privacy_6ft', '1x6', 5.5, 6, 'privacy', 'dog_ear', 0, 'pressure_treated'),
  ('1x6_flat_privacy', 'wood_privacy_6ft', '1x6', 5.5, 6, 'privacy', 'flat', 0, 'pressure_treated'),
  ('1x6_dogear_privacy_4ft', 'wood_privacy_4ft', '1x6', 5.5, 4, 'privacy', 'dog_ear', 0, 'pressure_treated'),
  ('1x6_flat_privacy_4ft', 'wood_privacy_4ft', '1x6', 5.5, 4, 'privacy', 'flat', 0, 'pressure_treated')
ON CONFLICT (id) DO UPDATE SET
  actual_width_in = EXCLUDED.actual_width_in;

-- ================================================================
-- 5. GATE CONFIGS
-- ================================================================
INSERT INTO public.gate_configs (id, fence_type_id, gate_type, width_ft, height_ft, frame_material, hinge_count, requires_wheel)
VALUES
  ('walk_3ft_wood', 'wood_privacy_6ft', 'walk', 3, 6, 'metal', 2, false),
  ('walk_4ft_wood', 'wood_privacy_6ft', 'walk', 4, 6, 'metal', 2, false),
  ('walk_5ft_wood', 'wood_privacy_6ft', 'walk', 5, 6, 'metal', 2, false),
  ('walk_6ft_wood', 'wood_privacy_6ft', 'walk', 6, 6, 'metal', 2, true), -- Wheel required for 6ft+ gates
  ('walk_3ft_wood_4ft', 'wood_privacy_4ft', 'walk', 3, 4, 'metal', 2, false),
  ('walk_4ft_wood_4ft', 'wood_privacy_4ft', 'walk', 4, 4, 'metal', 2, false)
ON CONFLICT (id) DO UPDATE SET
  hinge_count = EXCLUDED.hinge_count;

-- ================================================================
-- 6. HARDWARE KITS
-- ================================================================
INSERT INTO public.hardware_kits (id, fence_type_id, name, category, qty_per_bay, qty_per_post, qty_per_gate, description)
VALUES
  ('wood_fence_brackets', 'wood_privacy_6ft', 'Fence Rail Brackets', 'brackets', 12, NULL, NULL, 'Metal brackets for rail-to-post connection (6 per rail × 2 sides)'),
  ('wood_post_caps', 'wood_privacy_6ft', 'Post Caps', 'caps', NULL, 1, NULL, 'Decorative post caps (pyramid or flat)'),
  ('wood_fasteners', 'wood_privacy_6ft', 'Fasteners', 'fasteners', NULL, NULL, NULL, '2.5" deck screws (box of 1000)'),
  ('wood_gate_hinges', 'wood_privacy_6ft', 'Gate Hinges', 'hinges', NULL, NULL, 2, 'Heavy-duty T-hinges'),
  ('wood_gate_latch', 'wood_privacy_6ft', 'Gate Latch', 'latches', NULL, NULL, 1, 'Gravity latch or thumb latch'),
  ('wood_gate_wheel', 'wood_privacy_6ft', 'Gate Wheel Kit', 'hardware', NULL, NULL, 1, 'Gate wheel for 6ft+ gates (prevents sagging)')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description;

-- ================================================================
-- 7. HARDWARE ITEMS
-- ================================================================
INSERT INTO public.hardware_items (id, kit_id, description, quantity, sku, unit_cost)
VALUES
  ('bracket_metal_2pack', 'wood_fence_brackets', 'Metal Rail Bracket (2-pack)', 6, 'BRK-001', 3.99),
  ('post_cap_pyramid', 'wood_post_caps', '4x4 Pyramid Post Cap', 1, 'CAP-001', 2.49),
  ('deck_screw_1000', 'wood_fasteners', '2.5" Deck Screws (1000ct box)', 1, 'SCR-001', 12.99),
  ('tee_hinge_heavy', 'wood_gate_hinges', '12" Heavy-Duty T-Hinge', 1, 'HNG-001', 8.99),
  ('gravity_latch', 'wood_gate_latch', 'Gravity Gate Latch', 1, 'LTC-001', 12.99),
  ('gate_wheel_kit', 'wood_gate_wheel', 'Adjustable Gate Wheel', 1, 'WHL-001', 19.99)
ON CONFLICT (id) DO UPDATE SET
  unit_cost = EXCLUDED.unit_cost;

-- ================================================================
-- 8. CONCRETE RULES
-- ================================================================
-- Frost Zone 1 (18" frost depth)
INSERT INTO public.concrete_rules (id, frost_zone, post_size, soil_type, hole_diameter_in, hole_depth_in, bags_per_post)
VALUES
  ('zone1_4x4_normal', 1, '4x4', 'normal', 10, 24, 2.5),
  ('zone1_6x6_normal', 1, '6x6', 'normal', 12, 24, 3),
  ('zone1_4x4_sandy', 1, '4x4', 'sandy', 12, 24, 3),
  ('zone1_6x6_sandy', 1, '6x6', 'sandy', 14, 24, 4),

  -- Frost Zone 2 (30" frost depth) - MOST COMMON
  ('zone2_4x4_normal', 2, '4x4', 'normal', 10, 36, 3),
  ('zone2_6x6_normal', 2, '6x6', 'normal', 12, 42, 4),
  ('zone2_4x4_sandy', 2, '4x4', 'sandy', 12, 36, 4),
  ('zone2_6x6_sandy', 2, '6x6', 'sandy', 14, 42, 5),

  -- Frost Zone 3 (36" frost depth)
  ('zone3_4x4_normal', 3, '4x4', 'normal', 10, 42, 4),
  ('zone3_6x6_normal', 3, '6x6', 'normal', 12, 48, 5),
  ('zone3_4x4_sandy', 3, '4x4', 'sandy', 12, 42, 5),
  ('zone3_6x6_sandy', 3, '6x6', 'sandy', 14, 48, 6),

  -- Frost Zone 4 (48" frost depth)
  ('zone4_4x4_normal', 4, '4x4', 'normal', 10, 54, 5),
  ('zone4_6x6_normal', 4, '6x6', 'normal', 12, 60, 6),
  ('zone4_4x4_sandy', 4, '4x4', 'sandy', 12, 54, 6),
  ('zone4_6x6_sandy', 4, '6x6', 'sandy', 14, 60, 7)
ON CONFLICT (id) DO UPDATE SET
  bags_per_post = EXCLUDED.bags_per_post;
