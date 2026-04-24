-- Job Outcomes Table
-- Tracks actual costs vs estimates for continuous improvement

CREATE TABLE IF NOT EXISTS job_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimated_total DECIMAL(10, 2) NOT NULL,
  actual_material_cost DECIMAL(10, 2),
  actual_labor_hours DECIMAL(6, 2),
  actual_total_cost DECIMAL(10, 2),
  complications TEXT[],
  profit_margin DECIMAL(5, 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_job_outcomes_job_id ON job_outcomes(job_id);
CREATE INDEX idx_job_outcomes_org_id ON job_outcomes(org_id);

-- RLS Policies
ALTER TABLE job_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can only see outcomes for their org
CREATE POLICY job_outcomes_org_isolation ON job_outcomes
  FOR ALL
  USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_job_outcomes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_outcomes_updated_at_trigger
  BEFORE UPDATE ON job_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_job_outcomes_updated_at();
