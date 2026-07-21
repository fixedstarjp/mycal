import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { repo } from '../useAppData'
import type { AppEvent, Layer, LogEntry } from '../types'
import { searchAll } from '../lib/search'

interface Props {
  onSelectDate: (date: string) => void
}

export default function SearchView({ onSelectDate }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [dataset, setDataset] = useState<{ events: AppEvent[]; logEntries: LogEntry[]; layers: Layer[] }>({
    events: [],
    logEntries: [],
    layers: [],
  })

  // 検索は全期間が対象なので、開いたときに全データを読み込む
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const all = await repo.exportAll()
      if (cancelled) return
      setDataset({ events: all.events ?? [], logEntries: all.logEntries, layers: all.layers })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(() => searchAll(query, dataset), [query, dataset])

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="mb-2 text-lg font-bold text-slate-100">検索</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="予定・日記・売買などを検索"
          autoFocus
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-slate-200"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <p className="text-sm text-slate-600">読み込み中...</p>
        ) : query.trim() === '' ? (
          <p className="text-sm text-slate-600">キーワードを入力してください</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-600">「{query}」に一致する記録はありません</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">{results.length}件</p>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    onClick={() => onSelectDate(r.date)}
                    className="flex w-full items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-left active:bg-slate-700"
                  >
                    <span className="w-16 shrink-0 text-xs text-slate-500">
                      {format(new Date(r.date + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {r.kind === 'log' && (
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                        )}
                        <span className="truncate text-sm text-slate-100">
                          {r.icon && <span className="mr-1">{r.icon}</span>}
                          {r.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
