import type { AppEvent, GcalEvent, HabitEntry, Layer, LayerConfig, LogEntry } from '../types'

// Supabaseの行(snake_case)⇔アプリのモデル(camelCase)の変換。
// 純粋関数としてテスト可能にしている。

export interface LayerRow {
  id: string
  name: string
  type: 'habit' | 'log'
  color: string
  config: LayerConfig
  sort_order: number
  archived: boolean
  visible: boolean
}

export interface HabitEntryRow {
  id: string
  layer_id: string
  date: string
  value_bool: boolean | null
  value_num: number | null
  note: string
}

export interface LogEntryRow {
  id: string
  layer_id: string
  date: string
  time: string
  data: Record<string, string | number>
  note: string
}

export interface GcalEventRow {
  id: string
  event_id: string
  title: string
  start_at: string
  end_at: string
  all_day: boolean
}

export function layerFromRow(r: LayerRow): Layer {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    config: r.config ?? {},
    sortOrder: r.sort_order,
    archived: r.archived,
    visible: r.visible,
  }
}

export function layerToRow(l: Layer): LayerRow {
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    color: l.color,
    config: l.config,
    sort_order: l.sortOrder,
    archived: l.archived,
    visible: l.visible,
  }
}

export function habitFromRow(r: HabitEntryRow): HabitEntry {
  return {
    id: r.id,
    layerId: r.layer_id,
    date: r.date,
    valueBool: r.value_bool,
    valueNum: r.value_num === null ? null : Number(r.value_num),
    note: r.note ?? '',
  }
}

export function habitToRow(e: HabitEntry): HabitEntryRow {
  return {
    id: e.id,
    layer_id: e.layerId,
    date: e.date,
    value_bool: e.valueBool,
    value_num: e.valueNum,
    note: e.note,
  }
}

export function logFromRow(r: LogEntryRow): LogEntry {
  return {
    id: r.id,
    layerId: r.layer_id,
    date: r.date,
    time: r.time ?? '',
    data: r.data ?? {},
    note: r.note ?? '',
  }
}

export function logToRow(e: LogEntry): LogEntryRow {
  return {
    id: e.id,
    layer_id: e.layerId,
    date: e.date,
    time: e.time,
    data: e.data,
    note: e.note,
  }
}

export interface AppEventRow {
  id: string
  date: string
  end_date: string | null // 単日予定はnull
  time: string
  end_time: string
  title: string
  icon: string
  note: string
}

export function eventFromRow(r: AppEventRow): AppEvent {
  return {
    id: r.id,
    date: r.date,
    endDate: r.end_date ?? '',
    time: r.time ?? '',
    endTime: r.end_time ?? '',
    title: r.title,
    icon: r.icon ?? '',
    note: r.note ?? '',
  }
}

export function eventToRow(e: AppEvent): AppEventRow {
  return {
    id: e.id,
    date: e.date,
    end_date: e.endDate || null,
    time: e.time,
    end_time: e.endTime,
    title: e.title,
    icon: e.icon,
    note: e.note,
  }
}

export function gcalFromRow(r: GcalEventRow): GcalEvent {
  return {
    id: r.id,
    eventId: r.event_id,
    title: r.title,
    startAt: r.start_at,
    endAt: r.end_at,
    allDay: r.all_day,
  }
}
