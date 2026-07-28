import { addDays, format, setHours, setMinutes } from 'date-fns'
import type { GcalEvent, Layer } from '../types'

// 食事記録の食材候補(複数選択)と日記の気分候補
export const MEAL_OPTIONS = [
  'ヨーグルト',
  'バナナ',
  'スムージー',
  'ナッツ',
  'ゆで卵',
  'パスタ',
  'キャベツ',
  'トマト',
  'キムチ',
  '鶏豚牛肉',
  'さつま芋',
  'パン',
  '白米',
  '納豆',
  'サンドイッチ',
  'サラダ',
  '餃子',
  '豆腐',
  'アボカド',
  'チーズ',
  '肉まん',
]
export const MOOD_OPTIONS = ['😄', '🙂', '😐', '😕', '😢']

// 外出記録レイヤー: 位置情報による「出発/帰宅」の記録先。
// 既存ユーザーには設定画面(自宅の登録時)から同じ定義で作成する
export const OUTING_LAYER_NAME = '外出記録'
export const OUTING_FIELD_KEY = 'kind'
export const OUTING_KINDS = ['出発', '帰宅']

export function outingLayer(id: string, sortOrder = 6): Layer {
  return {
    id,
    name: OUTING_LAYER_NAME,
    type: 'log',
    color: '#7a8fa6',
    config: {
      hideNote: true,
      fields: [
        { key: OUTING_FIELD_KEY, label: '種別', type: 'select', options: OUTING_KINDS, required: true },
      ],
    },
    sortOrder,
    archived: false,
    visible: true,
  }
}

// v1初期レイヤー: 筋トレ・ウォーキング・瞑想(習慣型)、株の売買・食事記録・日記・外出記録(ログ型)
export const seedLayers: Layer[] = [
  {
    id: 'layer-workout',
    name: '筋トレ',
    type: 'habit',
    color: '#e0a028',
    config: {
      habitKind: 'number',
      habitUnit: 'セット',
      icon: '💪',
      menus: [
        { name: 'A', items: ['腹筋', 'ベンチプレス'] },
        { name: 'B', items: ['デッドリフト', '腕'] },
      ],
    },
    sortOrder: 0,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-walking',
    name: 'ウォーキング',
    type: 'habit',
    color: '#6fae5f',
    config: { habitKind: 'number', habitUnit: '分' },
    sortOrder: 1,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-meditation',
    name: '瞑想',
    type: 'habit',
    color: '#4e9c8f',
    config: { habitKind: 'bool' },
    sortOrder: 2,
    archived: false,
    visible: true,
  },
  {
    id: 'layer-trade',
    name: '株の売買',
    type: 'log',
    color: '#8b95a3',
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
    color: '#c0663f',
    config: {
      hideNote: true,
      fields: [
        { key: 'slot', label: '時間帯', type: 'select', options: ['朝', '昼', '夜', '間食'], required: true },
        {
          key: 'content',
          label: '内容',
          type: 'multiselect',
          options: MEAL_OPTIONS,
          required: true,
        },
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
    color: '#6b7fb5',
    config: {
      hideNote: true,
      fields: [
        { key: 'mood', label: '気分', type: 'select', options: MOOD_OPTIONS, required: false },
        { key: 'content', label: '内容', type: 'textarea', required: true },
      ],
    },
    sortOrder: 5,
    archived: false,
    visible: true,
  },
  outingLayer('layer-outing'),
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
