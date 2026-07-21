import { useRef, useState } from 'react'
import type { AppData } from '../useAppData'
import { repo } from '../useAppData'
import { signOut } from '../useAuth'
import { isSupabaseMode } from '../data/supabaseClient'
import { buildExportData, downloadJson } from '../lib/exportData'
import { parseExportJson } from '../lib/importData'
import { addIconPreset, getIconPresets, removeIconPreset } from '../lib/iconPresets'

export default function Settings({ data }: { data: AppData }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [icons, setIcons] = useState(() => getIconPresets())
  const [newIcon, setNewIcon] = useState('')

  async function exportJson() {
    const all = await repo.exportAll()
    downloadJson(buildExportData(all.layers, all.habitEntries, all.logEntries, all.events ?? []))
  }

  async function importJson(file: File) {
    setMessage('')
    try {
      const parsed = parseExportJson(await file.text())
      await repo.importAll(parsed)
      data.reload()
      setMessage(
        `インポート完了: レイヤー${parsed.layers.length}件 / 習慣${parsed.habitEntries.length}件 / ログ${parsed.logEntries.length}件 / 予定${(parsed.events ?? []).length}件`,
      )
    } catch (e) {
      setMessage(`インポート失敗: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="text-lg font-bold text-slate-100">設定</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24">
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">データ保存先</h2>
          <div className="rounded-xl bg-slate-800/60 p-4">
            {isSupabaseMode ? (
              <>
                <p className="text-sm text-slate-300">Supabase接続中(端末間で同期されます)</p>
                <button
                  onClick={() => signOut()}
                  className="mt-3 w-full rounded-lg bg-slate-700 py-2.5 text-sm text-slate-300 active:bg-slate-600"
                >
                  サインアウト
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                ローカルモード(この端末のブラウザにのみ保存)。
                <br />
                端末間同期を有効にするには{' '}
                <code className="text-xs text-slate-500">docs/SETUP_SUPABASE.md</code>{' '}
                の手順でSupabaseを設定し、<code className="text-xs text-slate-500">.env.local</code>{' '}
                に接続情報を記載してください。
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">Google カレンダー連携</h2>
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-sm text-slate-400">
              未接続{!isSupabaseMode && '(現在はモック予定を表示中)'}。手順は{' '}
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
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">予定アイコン</h2>
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-sm text-slate-400">
              予定フォームに表示するアイコンの候補です。タップで削除、下の欄から追加できます。
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {icons.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    if (!confirm(`アイコン ${emoji} を候補から削除しますか?`)) return
                    setIcons(removeIconPreset(emoji))
                  }}
                  className="rounded-lg bg-slate-800 px-2 py-1 text-lg active:bg-rose-900"
                  title="タップで削除"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value.trim())}
                placeholder="絵文字を入力"
                maxLength={4}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center text-base text-slate-200"
              />
              <button
                onClick={() => {
                  if (!newIcon) return
                  setIcons(addIconPreset(newIcon))
                  setNewIcon('')
                }}
                className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white active:bg-sky-500"
              >
                追加
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-600">※この設定は端末ごとに保存されます</p>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">データ</h2>
          <div className="space-y-3 rounded-xl bg-slate-800/60 p-4">
            <div>
              <p className="text-sm text-slate-400">全レイヤー・全記録をJSONで一括エクスポートします。</p>
              <button
                onClick={exportJson}
                className="mt-2 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-bold text-white active:bg-sky-500"
              >
                JSONエクスポート
              </button>
            </div>
            <div>
              <p className="text-sm text-slate-400">
                エクスポートJSONを取り込みます(ローカル→Supabase移行用)。同名レイヤーは統合されます。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importJson(f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full rounded-lg bg-slate-700 py-2.5 text-sm text-slate-300 active:bg-slate-600"
              >
                JSONインポート
              </button>
            </div>
            {message && <p className="text-sm text-slate-300">{message}</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">このアプリについて</h2>
          <div className="rounded-xl bg-slate-800/60 p-4 text-sm text-slate-400">
            <p>MyCal v1 — 自分専用ライフログカレンダー</p>
            <p className="mt-1 text-xs text-slate-500">
              {isSupabaseMode
                ? 'データはSupabase(RLS有効)に保存されています。'
                : 'データは現在この端末のブラウザ(localStorage)に保存されています。'}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
