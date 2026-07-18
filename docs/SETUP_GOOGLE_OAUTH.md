# Google OAuth / Calendar API セットアップ手順

Googleカレンダーの予定を読み取り表示するための設定。
**scopeは `calendar.readonly` のみ**(書き込みしない: 要件定義 non-goals)。

## 1. Google Cloud プロジェクト作成
1. https://console.cloud.google.com で新規プロジェクト作成(例: `mycal`)
2. 「APIとサービス」→「ライブラリ」→ **Google Calendar API** を検索して有効化

## 2. OAuth同意画面(テストモード運用)
1. 「APIとサービス」→「OAuth同意画面」
2. User Type: **外部** を選択(組織アカウントでなければこれしか選べない)
3. アプリ名 `MyCal`、サポートメール=自分のメールを入力
4. スコープに `https://www.googleapis.com/auth/calendar.readonly` を追加
5. **テストユーザーに自分のGoogleアカウントを追加**
6. 公開ステータスは「テスト」のまま維持する
   - 自分専用ならGoogleの審査は不要(要件定義 5章の正攻法)
   - 注意: テストモードのrefresh_tokenは**7日で失効**する場合がある(External + Testing)。
     失効したらアプリの再接続導線から再認可する

## 3. OAuthクライアントID作成
1. 「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリケーションの種類: **ウェブアプリケーション**
3. 承認済みのJavaScript生成元:
   - `http://localhost:3000`(開発)
   - 本番URL(デプロイ先が決まったら追加)
4. 承認済みのリダイレクトURI:
   - `http://localhost:3000/auth/callback`
   - (Supabase AuthのGoogleログインも使う場合)`https://xxxx.supabase.co/auth/v1/callback`
5. クライアントID / クライアントシークレットを控える

## 4. アプリへの設定
`.env.local` に追記(gitignore済み):

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

- クライアントシークレットはフロントに置かない。トークン交換・refresh_tokenの保管は
  Supabase Edge Function 経由で行い、暗号化してSupabaseに保存する(要件定義 9章)
- 取得範囲: 直近3ヶ月+先3ヶ月 → `gcal_cache` テーブルへupsert
- 更新: 手動リフレッシュボタン+起動時に前回取得から6時間超なら自動更新
