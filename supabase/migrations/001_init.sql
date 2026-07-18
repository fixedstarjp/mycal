-- MyCal v1 初期スキーマ(要件定義 3-3章)
-- Supabaseダッシュボードの SQL Editor で実行するか、supabase db push で適用する

create table public.layers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('habit', 'log')),
  color text not null default '#3b82f6',
  config jsonb not null default '{}'::jsonb, -- habit: {habitKind, habitUnit} / log: {fields: [...]}
  sort_order int not null default 0,
  archived boolean not null default false,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null references public.layers (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  value_bool boolean,
  value_num numeric,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (layer_id, date)
);

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null references public.layers (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  time text not null default '',
  data jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.gcal_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id text not null,
  title text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  fetched_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index habit_entries_user_date_idx on public.habit_entries (user_id, date);
create index log_entries_user_date_idx on public.log_entries (user_id, date);
create index gcal_cache_user_start_idx on public.gcal_cache (user_id, start_at);

-- RLS: 個人利用でも必須(要件定義 3-3章)
alter table public.layers enable row level security;
alter table public.habit_entries enable row level security;
alter table public.log_entries enable row level security;
alter table public.gcal_cache enable row level security;

create policy "own layers" on public.layers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own habit_entries" on public.habit_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own log_entries" on public.log_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own gcal_cache" on public.gcal_cache
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
