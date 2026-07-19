import { addDays, format, setHours, setMinutes } from 'date-fns'
import type { GcalEvent, Layer } from '../types'

// v1初期レイヤー: 筋トレ・読書(習慣型)、株の売買・食事記録(ログ型)
export const seedLayers: Layer[] = [
  {
    id: 'layer-workout',
    name: '筋トレ',
    type: 'habit',
    color: '#f97316',
    config: { habitKind: 'number', habitUnit: 'セット' },
    sortOrder: 0,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-walking',
    name: 'ウォーキング',
    type: 'habit',
    color: '#22c55e',
    config: { habitKind: 'number', habitUnit: '分' },
    sortOrder: 1,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-meditation',
    name: '瞑想',
    type: 'habit',
    color: '#14b8a6',
    config: { habitKind: 'bool' },
    sortOrder: 2,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-trade',
    name: '株の売買',
    type: 'log',
    color: '#3b82f6',
    config: {
      fields: [
        { key: 'symbol', label: '銘柄', type: 'text', required: true },
        { key: 'side', label: '売/買', type: 'select', options: ['買', '売'], required: true },
        { key: 'shares', label: '株数', type: 'number', required: true },
        { key: 'price', label: '単価', type: 'number', required: true },
      ],
    },
    sortOrder: 3,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-meal',
    name: '食事記録',
    type: 'log',
    color: '#ec4899',
    config: {
      fields: [
        { key: 'slot', label: '時間帯', type: 'select', options: ['朝', '昼', '夜', '間食'], required: true },
        { key: 'content', label: '内容', type: 'text', required: true },
      ],
    },
    sortOrder: 4,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-diary',
    name: '日記',
    type: 'log',
    color: '#a855f7',
    config: {
      fields: [{ key: 'content', label: '内容', type: 'text', required: true }],
    },
    sortOrder: 5,
    archived: false,
    visible: true,
  },
]

// Google連携が未設定の間に月ビューの見た目を確認するためのモック予定。
// 実連携後は gcal_cache 由来のデータに置き換わる。
export function seedGcalEvents(today = new Date()): GcalEvent[] {
  const mk = (dayOffset: number, h: number, m: number, durMin: number, title: string): GcalEvent => {
    const start = setMinutes(setHours(addDays(today, dayOffset), h), m)
    const end = new Date(start.getTime() + durMin * 60000)
    return {
      id: `mock-${dayOffset}-${h}${m}`,
      eventId: `mock-ev-${dayOffset}-${h}${m}`,
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: false,
    }
  }
  const allDay = (dayOffset: number, title: string): GcalEvent => {
    const d = format(addDays(today, dayOffset), 'yyyy-MM-dd')
    return {
      id: `mock-ad-${dayOffset}`,
      eventId: `mock-ev-ad-${dayOffset}`,
      title,
      startAt: `${d}T00:00:00.000Z`,
      endAt: `${d}T00:00:00.000Z`,
      allDay: true,
    }
  }
  return [
    mk(0, 10, 0, 60, '定例MTG'),
    mk(0, 19, 0, 90, 'ジム'),
    mk(1, 9, 30, 30, '朝会'),
    mk(2, 13, 0, 60, 'ランチ約束'),
    mk(4, 15, 0, 120, 'クライアント打合せ'),
    allDay(3, '出張'),
    mk(-1, 18, 0, 60, '歯医者'),
    mk(-3, 11, 0, 45, '面談'),
  ]
}
