import type { AppEvent, Layer, LogEntry } from '../types'
import { eventEndDate } from './events'

export interface SearchResult {
  kind: 'event' | 'log'
  id: string
  date: string
  icon: string // 絵文字(なければ '')
  title: string // 主表示
  subtitle: string // レイヤー名や期間など補助表示
  color: string // ログはレイヤー色、予定は ''
}

interface SearchInput {
  events: AppEvent[]
  logEntries: LogEntry[]
  layers: Layer[]
}

// 予定・ログ(日記/株の売買/食事など)をテキスト横断検索する。
// 大文字小文字を区別せず、部分一致。日付の新しい順に返す。
export function searchAll(query: string, { events, logEntries, layers }: SearchInput): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const layerById = new Map(layers.map((l) => [l.id, l]))
  const results: SearchResult[] = []

  for (const ev of events) {
    const hay = [ev.title, ev.note, ev.icon].join(' ').toLowerCase()
    if (!hay.includes(q)) continue
    const multiday = ev.endDate && ev.endDate !== ev.date
    results.push({
      kind: 'event',
      id: ev.id,
      date: ev.date,
      icon: ev.icon,
      title: ev.title,
      subtitle: multiday ? `予定 ${ev.date}〜${eventEndDate(ev)}` : '予定',
      color: '',
    })
  }

  for (const log of logEntries) {
    const layer = layerById.get(log.layerId)
    const values = Object.values(log.data).map(String)
    const hay = [...values, log.note, layer?.name ?? ''].join(' ').toLowerCase()
    if (!hay.includes(q)) continue
    results.push({
      kind: 'log',
      id: log.id,
      date: log.date,
      icon: '',
      title: values.filter(Boolean).join(' / ') || (layer?.name ?? ''),
      subtitle: `${layer?.name ?? 'ログ'}${log.note ? ` — ${log.note}` : ''}`,
      color: layer?.color ?? '#64748b',
    })
  }

  return results.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}
