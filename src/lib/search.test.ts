import { describe, expect, it } from 'vitest'
import { searchAll } from './search'
import type { AppEvent, Layer, LogEntry } from '../types'

const layers: Layer[] = [
  { id: 'l-diary', name: '日記', type: 'log', color: '#a855f7', config: {}, sortOrder: 0, archived: false, visible: true },
  { id: 'l-trade', name: '株の売買', type: 'log', color: '#3b82f6', config: {}, sortOrder: 1, archived: false, visible: true },
]

const events: AppEvent[] = [
  { id: 'e1', date: '2026-07-20', endDate: '', time: '', endTime: '', title: '歯医者', icon: '🏥', note: '定期検診' },
  { id: 'e2', date: '2026-07-25', endDate: '2026-07-27', time: '', endTime: '', title: '温泉旅行', icon: '✈️', note: '' },
]

const logs: LogEntry[] = [
  { id: 'd1', layerId: 'l-diary', date: '2026-07-21', time: '', data: { mood: '😄', content: '良い一日だった' }, note: '' },
  { id: 't1', layerId: 'l-trade', date: '2026-07-19', time: '', data: { symbol: 'TSLA', side: '買', shares: 100, price: 230 }, note: '押し目買い' },
]

const input = { events, logEntries: logs, layers }

describe('searchAll', () => {
  it('空クエリは空配列', () => {
    expect(searchAll('', input)).toEqual([])
    expect(searchAll('   ', input)).toEqual([])
  })

  it('予定のタイトルにヒット', () => {
    const r = searchAll('歯医者', input)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'event', date: '2026-07-20', icon: '🏥' })
  })

  it('予定のメモにもヒット', () => {
    expect(searchAll('検診', input).map((r) => r.id)).toEqual(['e1'])
  })

  it('日記の内容にヒット', () => {
    const r = searchAll('良い一日', input)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'log', date: '2026-07-21' })
    expect(r[0].subtitle).toContain('日記')
  })

  it('株の売買は銘柄・メモどちらでもヒット', () => {
    expect(searchAll('tsla', input).map((r) => r.id)).toEqual(['t1']) // 大文字小文字を無視
    expect(searchAll('押し目', input).map((r) => r.id)).toEqual(['t1'])
  })

  it('レイヤー名でも検索できる', () => {
    expect(searchAll('株の売買', input).map((r) => r.id)).toEqual(['t1'])
  })

  it('複数日予定は期間をsubtitleに表示', () => {
    const r = searchAll('温泉', input)
    expect(r[0].subtitle).toBe('予定 2026-07-25〜2026-07-27')
  })

  it('日付の新しい順に並ぶ', () => {
    const r = searchAll('a', { ...input, events: [], logEntries: logs })
    // t1(07-19) と d1(07-21) のうち content に 'a' は無いが symbol TSLA に a あり→t1のみ… 明示ケースで確認
    const r2 = searchAll('2026', {
      events: [
        { ...events[0], title: '2026予定A' },
        { ...events[1], title: '2026予定B', date: '2026-07-28', endDate: '' },
      ],
      logEntries: [],
      layers,
    })
    expect(r2.map((x) => x.date)).toEqual(['2026-07-28', '2026-07-20'])
    void r
  })
})
