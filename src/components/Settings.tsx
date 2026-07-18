import { getAllForExport } from '../data/localRepository'
import { buildExportData, downloadJson } from '../lib/exportData'

export default function Settings() {
  function exportJson() {
    const { layers, habitEntries, logEntries } = getAllForExport()
    downloadJson(buildExportData(layers, habitEntries, logEntries))
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="text-lg font-bold text-slate-100">設定</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24">
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">Google カレンダー連携</h2>
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-sm text-slate-400">
              未接続(現在はモック予定を表示中)。
              <br />
              Supabase + Google OAuth のセットアップ後に接続できます。手順は{' '}
              <code className="text-xs text-slate-500">docs/SETUP_GOOGLE_OAUTH.md</code> を参照。
            </p>
            <button
              disabled
              className="mt-3 w-full cursor-not-allowed rounded-lg bg-slate-700 py-2.5 text-sm text-slate-500"
            >
              Googleアカウントを接続(準備中)
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">データ</h2>
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-sm text-slate-400">全レイヤー・全記録をJSONで一括エクスポートします。</p>
            <button
              onClick={exportJson}
              className="mt-3 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-bold text-white active:bg-sky-500"
            >
              JSONエクスポート
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">このアプリについて</h2>
          <div className="rounded-xl bg-slate-800/60 p-4 text-sm text-slate-400">
            <p>MyCal v1 — 自分専用ライフログカレンダー</p>
            <p className="mt-1 text-xs text-slate-500">
              データは現在この端末のブラウザ(localStorage)に保存されています。Supabase接続後は端末間で同期されます。
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
