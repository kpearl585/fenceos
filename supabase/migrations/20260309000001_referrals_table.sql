-- Referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  referred_email  text NOT NULL,
  referred_user_id uuid,
  referred_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rewarded')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  rewarded_at     timestamptz
);

CREATE INDEX IF NOT EXISTS referrals_referring_org_idx ON public.referrals(referring_org_id);
CREATE INDEX IF NOT EXISTS referrals_referred_email_idx ON public.referrals(referred_email);

-- RLS: org members can only see their own referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    referring_org_id IN (
      SELECT org_id FROM public.users WHERE auth_id = auth.uid()
    )
  );
