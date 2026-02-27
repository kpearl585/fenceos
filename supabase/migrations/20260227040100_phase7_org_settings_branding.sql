-- Phase 7: Org Settings (legal terms) + Org Branding (white-label PDF)

-- ═══ org_settings ═══
-- Stores legal terms, payment terms, and version counter per org
CREATE TABLE IF NOT EXISTS org_settings (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  legal_terms text DEFAULT '',
  payment_terms text DEFAULT '',
  legal_version integer DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- RLS: same org can read; owner can update
CREATE POLICY "org_settings_select" ON org_settings
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "org_settings_insert" ON org_settings
  FOR INSERT WITH CHECK (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

CREATE POLICY "org_settings_update" ON org_settings
  FOR UPDATE USING (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

-- ═══ org_branding ═══
-- White-label PDF branding per org
CREATE TABLE IF NOT EXISTS org_branding (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#1e3a5f',
  accent_color text DEFAULT '#f59e0b',
  font_family text DEFAULT 'helvetica',
  footer_note text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

-- RLS: same org can read; owner can update
CREATE POLICY "org_branding_select" ON org_branding
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "org_branding_insert" ON org_branding
  FOR INSERT WITH CHECK (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

CREATE POLICY "org_branding_update" ON org_branding
  FOR UPDATE USING (
    org_id = get_my_org_id() AND get_my_role() = 'owner'
  );

-- Seed default settings for existing orgs
INSERT INTO org_settings (org_id, legal_terms, payment_terms, legal_version)
SELECT id,
  'This estimate is valid for 30 days from the date of issue. All work is subject to local building codes and regulations. The contractor will obtain necessary permits. Any changes to the scope of work after acceptance must be documented as a change order. The contractor warrants workmanship for a period of one (1) year from completion. Material warranties are provided by the manufacturer.',
  'Payment Terms: 50% deposit due upon acceptance. Remaining 50% due upon completion. Late payments subject to 1.5% monthly interest.',
  1
FROM organizations
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO org_branding (org_id)
SELECT id FROM organizations
ON CONFLICT (org_id) DO NOTHING;
