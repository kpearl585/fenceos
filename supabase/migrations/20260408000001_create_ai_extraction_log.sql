-- AI Extraction Audit Log
-- Tracks all GPT-4o extraction calls for rate limiting, cost monitoring, and quality analysis

create table public.ai_extraction_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  -- Input metadata
  input_type text not null check (input_type in ('text', 'image')),
  input_hash text not null, -- for deduplication

  -- Model info
  model text not null default 'gpt-4o',
  schema_version text not null default 'v1',

  -- Results
  raw_extraction jsonb,
  critique_json jsonb,
  validation_errors text[],
  confidence numeric check (confidence >= 0 and confidence <= 1),

  -- Cost tracking
  input_tokens integer,
  output_tokens integer,

  -- Timestamps
  created_at timestamptz not null default now()
);

-- RLS
alter table public.ai_extraction_log enable row level security;

-- Indexes for rate limiting queries (org_id + created_at window)
create index ai_extraction_log_org_created_idx on public.ai_extraction_log(org_id, created_at desc);

-- Index for cost monitoring
create index ai_extraction_log_org_tokens_idx on public.ai_extraction_log(org_id, input_tokens, output_tokens);

-- RLS policies (same pattern as other org-scoped tables)
create policy "Users can view their org's extraction logs"
  on public.ai_extraction_log
  for select
  using (
    org_id in (
      select org_id from public.users where auth_id = auth.uid()
    )
  );

create policy "Users can insert extraction logs for their org"
  on public.ai_extraction_log
  for insert
  with check (
    org_id in (
      select org_id from public.users where auth_id = auth.uid()
    )
  );

comment on table public.ai_extraction_log is 'Audit log for all AI-powered fence estimate extractions. Used for rate limiting (20/hour per org), cost tracking, and quality monitoring.';
