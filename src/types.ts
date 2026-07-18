// レイヤー2型構造(要件定義 3章)の型定義

export type LayerType = 'habit' | 'log'

export type FieldType = 'text' | 'number' | 'select'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[] // type === 'select' のとき必須
  required?: boolean
}

export type HabitValueKind = 'bool' | 'number'

export interface LayerConfig {
  // habit型: bool(やった/やらない) or number(読書30分など)
  habitKind?: HabitValueKind
  habitUnit?: string // 数値習慣の単位(分、セット等)
  // log型: フィールド定義
  fields?: FieldDef[]
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

export interface ExportData {
  exportedAt: string
  version: 1
  layers: Layer[]
  habitEntries: HabitEntry[]
  logEntries: LogEntry[]
}
