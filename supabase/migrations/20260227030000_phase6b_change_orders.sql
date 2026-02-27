-- Phase 6B: Change Orders + Change Order Line Items

CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  reason text,
  subtotal numeric NOT NULL DEFAULT 0,
  cost_total numeric NOT NULL DEFAULT 0,
  gross_profit numeric NOT NULL DEFAULT 0,
  gross_margin_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX idx_change_orders_job ON public.change_orders(job_id);
CREATE INDEX idx_change_orders_status ON public.change_orders(status);
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.change_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('material', 'labor')),
  qty numeric NOT NULL,
  unit_cost numeric NOT NULL,
  unit_price numeric NOT NULL,
  extended_cost numeric NOT NULL,
  extended_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_co_line_items_co ON public.change_order_line_items(change_order_id);
ALTER TABLE public.change_order_line_items ENABLE ROW LEVEL SECURITY;
