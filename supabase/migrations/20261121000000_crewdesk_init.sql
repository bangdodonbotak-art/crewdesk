-- CrewDesk — initial schema.
-- Supabase project: crewdesk (nizvycrrusghsnefules, ap-southeast-1, free).
-- Run via Supabase SQL Editor or the Management API database/query endpoint.
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS /
-- CREATE OR REPLACE). No seed data — demo data lives in lib/crew/demo-data.ts.
--
-- Notes:
-- `profiles` is keyed to auth.users (the correct Supabase pattern — there
-- is no duplicate public.users table).
-- gen_random_uuid() is built-in on Postgres 17; no pgcrypto extension needed.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Atomic sent-reply counter: one RPC, no read-then-write race.
create or replace function public.increment_usage(p_user_id uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.usage_daily (user_id, day, sent_count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set sent_count = public.usage_daily.sent_count + 1
  returning sent_count into v_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, keyed to Supabase Auth.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'growth')),
  -- Consent to send real customer data to the free model provider.
  -- Default false; shown in Settings. Never assumed.
  data_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create the profile row on signup (Google OAuth included).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- inboxes: one inbound forward-to address + secret token per user.
-- The token authenticates POST /api/inbound (never Gmail OAuth).
-- ---------------------------------------------------------------------------
create table if not exists public.inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);
create unique index if not exists inboxes_user_id_key
  on public.inboxes (user_id);

-- ---------------------------------------------------------------------------
-- threads: one row per customer email thread.
-- ---------------------------------------------------------------------------
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  subject text,
  from_address text,
  body text,
  category text check (category in (
    'billing', 'bug', 'how-to', 'pricing', 'refund', 'complaint', 'pre-sales'
  )),
  priority text check (priority in ('P0', 'P1', 'P2', 'P3')),
  sentiment integer check (sentiment between -1 and 1),
  status text check (status in (
    'received', 'triaged', 'drafted', 'awaiting_approval',
    'sent', 'escalated', 'rejected'
  )),
  -- Gmail Message-ID / external id for inbound dedup (one row per message).
  message_id text,
  external_thread_id text,
  summary text,
  draft_text text,
  draft_source text check (draft_source in ('ai', 'template', 'human')),
  -- 1.0 = answer fully sourced from the knowledge base (auto-approve gate).
  kb_confidence numeric check (kb_confidence between 0 and 1),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, message_id)
);
create index if not exists threads_user_status_idx
  on public.threads (user_id, status);
create index if not exists threads_user_created_idx
  on public.threads (user_id, created_at desc);
drop trigger if exists threads_set_updated_at on public.threads;
create trigger threads_set_updated_at
  before update on public.threads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- steps: audit trail of crew actions per thread (triage / draft / approve…).
-- ---------------------------------------------------------------------------
create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads (id) on delete cascade,
  step text,
  detail text,
  actor text,
  status text not null default 'pending'
    check (status in ('pending', 'ok', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists steps_thread_created_idx
  on public.steps (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- knowledge_items: the knowledge base the crew may answer from — and only from.
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  question text,
  answer text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_items_user_idx
  on public.knowledge_items (user_id);
create index if not exists knowledge_items_search_idx
  on public.knowledge_items
  using gin (to_tsvector('english',
    coalesce(question, '') || ' ' || coalesce(answer, '')));
drop trigger if exists knowledge_items_set_updated_at on public.knowledge_items;
create trigger knowledge_items_set_updated_at
  before update on public.knowledge_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- approvals: human decisions on drafts (approve / edit / reject).
-- ---------------------------------------------------------------------------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads (id) on delete cascade,
  action text check (action in ('approve', 'edit', 'reject')),
  edited_draft text,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists approvals_thread_idx
  on public.approvals (thread_id);

-- ---------------------------------------------------------------------------
-- usage_daily: sent-reply counter per user per day (free daily quota).
-- Increment ONLY via public.increment_usage() (atomic RPC).
-- ---------------------------------------------------------------------------
create table if not exists public.usage_daily (
  user_id uuid references auth.users (id) on delete cascade,
  day date not null,
  sent_count integer not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- upgrade_intents: upgrade interest, recorded without any payment (no Stripe).
-- ---------------------------------------------------------------------------
create table if not exists public.upgrade_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  plan text check (plan in ('starter', 'growth')),
  email text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'converted')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: users own their rows only.
-- Policy names are distinct per table so re-runs stay idempotent.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.steps enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.approvals enable row level security;
alter table public.usage_daily enable row level security;
alter table public.upgrade_intents enable row level security;
alter table public.inboxes enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "threads own rows" on public.threads;
create policy "threads own rows"
  on public.threads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "knowledge_items own rows" on public.knowledge_items;
create policy "knowledge_items own rows"
  on public.knowledge_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usage_daily own rows" on public.usage_daily;
create policy "usage_daily own rows"
  on public.usage_daily for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "upgrade_intents own rows" on public.upgrade_intents;
create policy "upgrade_intents own rows"
  on public.upgrade_intents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "inboxes own rows" on public.inboxes;
create policy "inboxes own rows"
  on public.inboxes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "steps via own thread" on public.steps;
create policy "steps via own thread"
  on public.steps for all
  using (
    exists (
      select 1 from public.threads t
      where t.id = steps.thread_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.threads t
      where t.id = steps.thread_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "approvals via own thread" on public.approvals;
create policy "approvals via own thread"
  on public.approvals for all
  using (
    exists (
      select 1 from public.threads t
      where t.id = approvals.thread_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.threads t
      where t.id = approvals.thread_id
        and t.user_id = auth.uid()
    )
  );
