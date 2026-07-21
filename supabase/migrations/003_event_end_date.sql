-- 日付をまたぐ予定(複数日予定)に対応: 終了日カラムを追加
-- SupabaseダッシュボードのSQL Editorで実行する

alter table public.events add column end_date date;
