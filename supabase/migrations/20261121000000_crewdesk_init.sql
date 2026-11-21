-- CrewDesk — initial schema (migration file only).
-- Supabase project NOT created yet. Do not run this against a live database
-- until the project exists and Dony approves it. Demo data is seeded by the
-- app code (lib/crew/demo-data.ts), not by this migration.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, keyed to Supabase Auth.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- threads: one row per customer email thread.
-- ---------------------------------------------------------------------------
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  subject text,
  from_address text,
  body text,
  category text,
  priority text,
  sentiment integer,
  status text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- steps: audit trail of crew actions per thread (triage / draft / approve…).
-- ---------------------------------------------------------------------------
create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads (id) on delete cascade,
  step text,
  detail text,
  actor text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- knowledge_items: the knowledge base the crew may answer from — and only from.
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  question text,
  answer text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- approvals: human decisions on drafts (approve / edit / reject).
-- ---------------------------------------------------------------------------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads (id) on delete cascade,
  action text,
  edited_draft text,
  decided_by text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- usage_daily: sent-reply counter per user per day (free daily quota).
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
  plan text,
  email text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: users own their rows only.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.steps enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.approvals enable row level security;
alter table public.usage_daily enable row level security;
alter table public.upgrade_intents enable row level security;

-- profiles: a user sees only their own profile row.
create policy "users own rows only"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- threads: a user sees only threads they own.
create policy "users own rows only"
  on public.threads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- knowledge_items: a user sees only their own knowledge base.
create policy "users own rows only"
  on public.knowledge_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- usage_daily: a user sees only their own daily usage.
create policy "users own rows only"
  on public.usage_daily for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- upgrade_intents: a user sees only their own upgrade intents.
create policy "users own rows only"
  on public.upgrade_intents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- steps: only via a thread the user owns.
create policy "users own rows only"
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

-- approvals: only via a thread the user owns.
create policy "users own rows only"
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
