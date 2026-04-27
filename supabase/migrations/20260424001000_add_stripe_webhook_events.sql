CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (status);
