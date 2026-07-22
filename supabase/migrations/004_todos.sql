-- ToDo(メモ)。期日は任意で、付けるとカレンダーのその日に表示される
-- SupabaseダッシュボードのSQL Editorで実行する

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  note text not null default '',
  due_date date,                                 -- null = 期日なし
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index todos_user_idx on public.todos (user_id, done, due_date);

alter table public.todos enable row level security;

create policy "own todos" on public.todos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
