# Supabase セットアップ手順

MyCalのデータ同期(端末間共有)を有効にするための手順。
未設定の間、アプリはlocalStorageのみで動作します(単一端末)。

## 1. プロジェクト作成
1. https://supabase.com にサインアップ(無料枠でOK)
2. 「New project」→ プロジェクト名 `mycal`、リージョンは `Northeast Asia (Tokyo)` を推奨
3. Database Password を安全な場所に控える

## 2. スキーマ適用
1. ダッシュボード左メニュー「SQL Editor」を開く
2. `supabase/migrations/001_init.sql` の内容を貼り付けて Run
3. 「Table Editor」で `layers` / `habit_entries` / `log_entries` / `gcal_cache` の4テーブルとRLS有効を確認

## 3. 認証設定(個人利用)
1. 「Authentication」→「Providers」で Email を有効のままにする
   (Google連携をログインにも使う場合は Google プロバイダも有効化 → `SETUP_GOOGLE_OAUTH.md` 参照)
2. 「Authentication」→「Users」→「Add user」で自分のメールアドレスのユーザーを作成
3. Sign upは自分しか使わないため、「Settings」で「Allow new users to sign up」をOFFにしておくと安全

## 4. アプリへの接続情報設定
1. 「Project Settings」→「API」から以下を控える
   - Project URL
   - anon public key
2. プロジェクトルートに `.env.local` を作成(gitignore済み):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

3. `npm install @supabase/supabase-js` を実行
4. `src/data/repository.ts` のインターフェースを実装した `SupabaseRepository` を追加し、
   `src/useAppData.ts` の `repo` を差し替える(環境変数があればSupabase、なければlocalStorageにフォールバック)

## 5. ローカルデータの移行
1. アプリの「設定」→「JSONエクスポート」でローカルデータを書き出す
2. Supabase接続後にインポート処理を実行(v1.1で実装予定。それまでは手動でSQL投入)

## 注意
- anon keyはRLS前提の公開可能キーだが、`.env.local` はコミットしない運用を守ること
- RLSポリシーを削除・無効化しないこと(全テーブル `user_id = auth.uid()` 必須)
