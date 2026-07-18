-- アプリ内予定(Googleカレンダー非連携)。予定ごとに任意の絵文字アイコンを持てる
-- SupabaseダッシュボードのSQL Editorで実行する

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  time text not null default '',      -- HH:mm。'' は終日扱い
  end_time text not null default '',  -- HH:mm。'' 可
  title text not null,
  icon text not null default '',      -- 絵文字。'' 可
  note text not null default '',
  created_at timestamptz not null default now()
);

create index events_user_date_idx on public.events (user_id, date);

alter table public.events enable row level security;

create policy "own events" on public.events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
