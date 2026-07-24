// レイヤー2型構造(要件定義 3章)の型定義

export type LayerType = 'habit' | 'log'

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'multiselect'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[] // type === 'select' | 'multiselect' のとき必須
  required?: boolean
}

export type HabitValueKind = 'bool' | 'number'

// 習慣のメニュー(例: 筋トレのAセット=腹筋・ベンチプレス)。
// 記録時にどのメニューをやったか選べる
export interface HabitMenu {
  name: string
  items: string[]
}

export interface LayerConfig {
  // habit型: bool(やった/やらない) or number(読書30分など)
  habitKind?: HabitValueKind
  habitUnit?: string // 数値習慣の単位(分、セット等)
  icon?: string // habit型: 達成日にカレンダーへ出す絵文字(未設定はレイヤー色のドット)
  menus?: HabitMenu[] // habit型: A/Bセットなどのメニュー(任意)
  // log型: フィールド定義
  fields?: FieldDef[]
  hideNote?: boolean // log型でメモ欄を隠す(日記など内容欄で完結する場合)
}

export interface Layer {
  id: string
  name: string
  type: LayerType
  color: string
  config: LayerConfig
  sortOrder: number
  archived: boolean
  visible: boolean // 月ビューでの表示ON/OFF
}

export interface HabitEntry {
  id: string
  layerId: string
  date: string // YYYY-MM-DD
  valueBool: boolean | null
  valueNum: number | null
  note: string
}

export interface LogEntry {
  id: string
  layerId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm ('' 可)
  data: Record<string, string | number>
  note: string
}

export interface GcalEvent {
  id: string
  eventId: string
  title: string
  startAt: string // ISO
  endAt: string // ISO
  allDay: boolean
}

// アプリ内で完結する自分の予定(Googleカレンダーには反映しない)
export interface AppEvent {
  id: string
  date: string // YYYY-MM-DD (開始日)
  endDate: string // YYYY-MM-DD ('' = 単日。日付をまたぐ予定は終了日を持つ)
  time: string // HH:mm ('' = 終日)
  endTime: string // HH:mm ('' 可)
  title: string
  icon: string // 絵文字 ('' 可)
  note: string
}

// ToDo(メモ)。期日は任意で、付けるとカレンダーのその日に表示される
export interface Todo {
  id: string
  title: string
  note: string
  dueDate: string // YYYY-MM-DD ('' = 期日なし)
  done: boolean
  sortOrder: number
}

export interface ExportData {
  exportedAt: string
  version: 1
  layers: Layer[]
  habitEntries: HabitEntry[]
  logEntries: LogEntry[]
  events?: AppEvent[] // 旧エクスポートには存在しない
  todos?: Todo[] // 旧エクスポートには存在しない
}
