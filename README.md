# MyCal — 自分専用ライフログカレンダー PWA

Googleカレンダーの予定を「背景」として読み取り表示し、その上に自分専用の記録レイヤー
(習慣・売買ログ・食事ログ)を重ねる1人用カレンダー。要件定義v1(2026-07-18)に基づく実装。

## 技術構成
- フロント: Vite + React + TypeScript + Tailwind CSS v4(PWA: vite-plugin-pwa)
- バックエンド/DB/認証: Supabase(Postgres + Auth + RLS)※接続は今後、現状はlocalStorage
- 外部連携: Google OAuth 2.0 + Calendar API(`calendar.readonly` のみ)※接続は今後、現状はモック予定表示

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # ユニットテスト(vitest)
npm run build    # 型チェック + 本番ビルド + Service Worker生成
npm run lint     # oxlint
```

## 構成

```
src/
  types.ts               # レイヤー2型構造(habit/log)の型定義
  useAppData.ts          # 表示月±1ヶ月のデータロードフック
  data/
    repository.ts        # データアクセスの抽象インターフェース
    localRepository.ts   # localStorage実装(Supabase実装に差し替え予定)
    seed.ts              # 初期レイヤー(筋トレ/読書/株の売買/食事記録)+モック予定
  lib/
    stats.ts             # streak・月間達成率の計算
    exportData.ts        # JSON一括エクスポート
    dates.ts             # 月グリッド等の日付ユーティリティ
  components/
    MonthView.tsx        # 月ビュー(予定+習慣ドット+ログ件数バッジ)
    WeekView.tsx         # 週ビュー(簡易版)
    DayDetail.tsx        # 日詳細(習慣トグル・ログCRUD)
    LogEntryForm.tsx     # ログ型レイヤーの構造化フォーム
    LayerManager.tsx     # レイヤー追加/編集/フィールド定義/アーカイブ
    Settings.tsx         # 設定(JSONエクスポート、Google連携プレースホルダ)
supabase/migrations/     # スキーマ+RLS(001_init.sql)
docs/                    # Supabase / Google OAuth セットアップ手順
scripts/gen-icons.mjs    # PWAプレースホルダアイコン生成
```

## デプロイ(GitHub Pages)

- mainブランチへのpushで [.github/workflows/deploy.yml](.github/workflows/deploy.yml) が自動実行され、
  https://fixedstarjp.github.io/mycal/ に公開される(test → build → deploy)
- Supabase接続情報はリポジトリのActions variables(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)で管理
  (anonキーはRLS前提の公開可能キー)
- サブパス配信のためCIでは `DEPLOY_BASE=/mycal/` を指定(ローカル開発は `/` のまま)
- スマホでの利用: 公開URLをSafari/Chromeで開き「ホーム画面に追加」でPWAとしてインストール

## 次のステップ
1. ~~Supabaseセットアップ~~ 済(接続・認証・移行まで検証済み)
2. [docs/SETUP_GOOGLE_OAUTH.md](docs/SETUP_GOOGLE_OAUTH.md) に従いGoogle連携(読み取り専用)
3. iOS Safari(ホーム画面追加)での実機検証
