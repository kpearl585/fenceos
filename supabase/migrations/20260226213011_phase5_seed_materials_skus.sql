-- Phase 5A: Idempotent seed of required material SKUs for all orgs.
-- Safe to run multiple times — skips rows where (org_id, sku) already exists.
-- Already applied to the live DB; committed here for repo tracking.

INSERT INTO public.materials (org_id, sku, name, unit, unit_cost, unit_price, category)
SELECT o.id, v.sku, v.name, v.unit, v.unit_cost, v.unit_price, v.category
FROM public.organizations o
CROSS JOIN (VALUES
  -- WOOD PRIVACY
  ('WOOD_PANEL_8FT',         'Wood Privacy Panel 8ft',         'ea',   45.00,  90.00,  'wood_privacy'),
  ('WOOD_POST_4X4_8FT',      'Wood Post 4x4 8ft',             'ea',   12.00,  24.00,  'wood_privacy'),
  ('CONCRETE_BAG_80LB',      'Concrete Bag 80lb',              'bag',   5.50,  11.00,  'concrete'),
  ('WOOD_GATE_SINGLE',       'Wood Gate Single Assembly',       'ea',  120.00, 275.00,  'wood_privacy'),
  ('WOOD_GATE_HARDWARE_SET', 'Wood Gate Hardware Set',          'ea',   35.00,  70.00,  'wood_privacy'),
  ('WOOD_FASTENERS_BOX',     'Wood Fasteners Box',             'ea',   18.00,  36.00,  'wood_privacy'),

  -- CHAIN LINK
  ('CL_FABRIC_4FT',          'Chain Link Fabric 4ft (per ft)', 'ft',    4.50,   9.00,  'chain_link'),
  ('CL_TOP_RAIL',            'Chain Link Top Rail (per ft)',    'ft',    1.75,   3.50,  'chain_link'),
  ('CL_LINE_POST',           'Chain Link Line Post',            'ea',   14.00,  28.00,  'chain_link'),
  ('CL_TERMINAL_POST',       'Chain Link Terminal Post',        'ea',   22.00,  44.00,  'chain_link'),
  ('CL_TENSION_BAND',        'Chain Link Tension Band',         'ea',    2.00,   4.00,  'chain_link'),
  ('CL_TIE_WIRE',            'Chain Link Tie Wire (per ft)',    'ft',    0.30,   0.60,  'chain_link'),
  ('CL_GATE_SINGLE',         'Chain Link Gate Single',          'ea',   95.00, 220.00,  'chain_link'),
  ('CL_FITTINGS_MISC',       'Chain Link Misc Fittings',        'ea',   15.00,  30.00,  'chain_link'),

  -- VINYL
  ('VINYL_PANEL_8FT',        'Vinyl Privacy Panel 8ft',         'ea',   75.00, 150.00,  'vinyl'),
  ('VINYL_POST_5X5_8FT',     'Vinyl Post 5x5 8ft',             'ea',   28.00,  56.00,  'vinyl'),
  ('VINYL_GATE_SINGLE',      'Vinyl Gate Single Assembly',       'ea',  180.00, 400.00,  'vinyl'),
  ('VINYL_GATE_HARDWARE_SET','Vinyl Gate Hardware Set',          'ea',   45.00,  90.00,  'vinyl')
) AS v(sku, name, unit, unit_cost, unit_price, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials m WHERE m.org_id = o.id AND m.sku = v.sku
);
