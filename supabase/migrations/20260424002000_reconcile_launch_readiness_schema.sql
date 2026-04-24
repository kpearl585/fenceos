-- Launch readiness schema reconciliation
-- Aligns checked-in migrations with the app code paths used for jobs, invoices,
-- waitlist/trial email automation, and public unsubscribe handling.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_day7_sent timestamptz,
  ADD COLUMN IF NOT EXISTS trial_day12_sent timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired_sent timestamptz;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  day3_sent timestamptz,
  day7_sent timestamptz
);

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS day3_sent timestamptz,
  ADD COLUMN IF NOT EXISTS day7_sent timestamptz;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS material_verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_url text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_checklists'
      AND column_name = 'required'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_checklists'
      AND column_name = 'is_required'
  ) THEN
    EXECUTE 'ALTER TABLE public.job_checklists RENAME COLUMN required TO is_required';
  END IF;
END $$;

ALTER TABLE public.job_checklists
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_material_verification_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_material_verification_status_check
  CHECK (
    material_verification_status IN (
      'pending',
      'employee_confirmed',
      'foreman_approved',
      'rejected'
    )
  );

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  pdf_url text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_invoice_number
  ON public.invoices(org_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id
  ON public.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
  ON public.invoices(customer_id);

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'void'));

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select_org ON public.invoices;
CREATE POLICY invoices_select_org
  ON public.invoices FOR SELECT
  USING (
    org_id = get_my_org_id()
    AND get_my_role() IN ('owner', 'sales')
  );

DROP POLICY IF EXISTS invoices_insert_owner ON public.invoices;
CREATE POLICY invoices_insert_owner
  ON public.invoices FOR INSERT
  WITH CHECK (
    org_id = get_my_org_id()
    AND get_my_role() = 'owner'
  );

DROP POLICY IF EXISTS invoices_update_owner ON public.invoices;
CREATE POLICY invoices_update_owner
  ON public.invoices FOR UPDATE
  USING (
    org_id = get_my_org_id()
    AND get_my_role() = 'owner'
  );

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'marketing_opt_out',
  source text NOT NULL DEFAULT 'unsubscribe_page',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_created_at
  ON public.email_suppressions(created_at);
