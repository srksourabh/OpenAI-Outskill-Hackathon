create table if not exists campaigns (
  id uuid primary key,
  name text not null,
  company_name text not null,
  provider text not null default 'simulated',
  status text not null default 'draft',
  default_language text not null default 'hi',
  retry_limit integer not null default 2,
  concurrency_limit integer not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key,
  campaign_id uuid not null references campaigns(id),
  provider_name text not null,
  phone text not null,
  location text not null,
  machine_count integer not null,
  order_id text not null,
  language_hint text not null default 'hi',
  alternate_phone text,
  address text,
  source_row_data jsonb not null default '{}',
  source_row_number integer not null,
  unique (campaign_id, phone, order_id)
);

create table if not exists calls (
  id uuid primary key,
  campaign_id uuid not null references campaigns(id),
  contact_id uuid not null references contacts(id),
  status text not null default 'queued',
  disposition text not null default 'unknown',
  next_action text not null default 'none',
  attempt_number integer not null default 1,
  transcript_text text,
  transcript_status text not null default 'missing',
  summary_text text,
  reason_code text,
  detected_language text,
  recording_url text,
  retry_eligible boolean not null default false,
  provider_call_id text,
  last_call_time timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists call_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls(id),
  event_type text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists language_assets (
  id uuid primary key default gen_random_uuid(),
  language_code text not null unique,
  mode text not null,
  script_text text not null
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  export_type text not null,
  row_count integer not null,
  created_at timestamptz not null default now()
);
