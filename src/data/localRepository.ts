import type { AppEvent, ExportData, GcalEvent, HabitEntry, Layer, LogEntry } from '../types'
import type { Repository } from './repository'
import { planImport } from '../lib/importData'
import { seedGcalEvents, seedLayers } from './seed'

const KEYS = {
  layers: 'mycal.layers',
  habits: 'mycal.habit_entries',
  logs: 'mycal.log_entries',
  gcal: 'mycal.gcal_cache',
  events: 'mycal.events',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// localStorageベースの実装。Supabase移行時はこのクラスと同じ
// インターフェースのSupabaseRepositoryを実装して差し替える。
export class LocalStorageRepository implements Repository {
  constructor() {
    if (!localStorage.getItem(KEYS.layers)) {
      save(KEYS.layers, seedLayers)
    }
    if (!localStorage.getItem(KEYS.gcal)) {
      save(KEYS.gcal, seedGcalEvents())
    }
  }

  async getLayers(): Promise<Layer[]> {
    return load<Layer[]>(KEYS.layers, []).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async saveLayer(layer: Layer): Promise<void> {
    const layers = load<Layer[]>(KEYS.layers, [])
    const idx = layers.findIndex((l) => l.id === layer.id)
    if (idx >= 0) layers[idx] = layer
    else layers.push(layer)
    save(KEYS.layers, layers)
  }

  async deleteLayer(layerId: string): Promise<void> {
    save(KEYS.layers, load<Layer[]>(KEYS.layers, []).filter((l) => l.id !== layerId))
    save(KEYS.habits, load<HabitEntry[]>(KEYS.habits, []).filter((e) => e.layerId !== layerId))
    save(KEYS.logs, load<LogEntry[]>(KEYS.logs, []).filter((e) => e.layerId !== layerId))
  }

  async getHabitEntries(dateFrom: string, dateTo: string): Promise<HabitEntry[]> {
    return load<HabitEntry[]>(KEYS.habits, []).filter((e) => inRange(e.date, dateFrom, dateTo))
  }

  async upsertHabitEntry(entry: HabitEntry): Promise<void> {
    const entries = load<HabitEntry[]>(KEYS.habits, [])
    // UNIQUE(layer_id, date) 相当
    const idx = entries.findIndex((e) => e.layerId === entry.layerId && e.date === entry.date)
    if (idx >= 0) entries[idx] = { ...entry, id: entries[idx].id }
    else entries.push(entry)
    save(KEYS.habits, entries)
  }

  async deleteHabitEntry(entryId: string): Promise<void> {
    save(KEYS.habits, load<HabitEntry[]>(KEYS.habits, []).filter((e) => e.id !== entryId))
  }

  async getLogEntries(dateFrom: string, dateTo: string): Promise<LogEntry[]> {
    return load<LogEntry[]>(KEYS.logs, [])
      .filter((e) => inRange(e.date, dateFrom, dateTo))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }

  async saveLogEntry(entry: LogEntry): Promise<void> {
    const entries = load<LogEntry[]>(KEYS.logs, [])
    const idx = entries.findIndex((e) => e.id === entry.id)
    if (idx >= 0) entries[idx] = entry
    else entries.push(entry)
    save(KEYS.logs, entries)
  }

  async deleteLogEntry(entryId: string): Promise<void> {
    save(KEYS.logs, load<LogEntry[]>(KEYS.logs, []).filter((e) => e.id !== entryId))
  }

  async getGcalEvents(dateFrom: string, dateTo: string): Promise<GcalEvent[]> {
    return load<GcalEvent[]>(KEYS.gcal, []).filter((e) => {
      // 終日イベントはISOの日付部分、時刻付きはローカル日付で判定する
      const d = e.allDay ? e.startAt.slice(0, 10) : toLocalDateStr(new Date(e.startAt))
      return inRange(d, dateFrom, dateTo)
    })
  }

  async getEvents(dateFrom: string, dateTo: string): Promise<AppEvent[]> {
    return load<AppEvent[]>(KEYS.events, [])
      .filter((e) => {
        // 複数日予定: 期間が表示範囲と少しでも重なれば返す
        const end = e.endDate && e.endDate >= e.date ? e.endDate : e.date
        return e.date <= dateTo && end >= dateFrom
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }

  async saveEvent(event: AppEvent): Promise<void> {
    const events = load<AppEvent[]>(KEYS.events, [])
    const idx = events.findIndex((e) => e.id === event.id)
    if (idx >= 0) events[idx] = event
    else events.push(event)
    save(KEYS.events, events)
  }

  async deleteEvent(eventId: string): Promise<void> {
    save(KEYS.events, load<AppEvent[]>(KEYS.events, []).filter((e) => e.id !== eventId))
  }

  async exportAll() {
    return {
      layers: load<Layer[]>(KEYS.layers, []),
      habitEntries: load<HabitEntry[]>(KEYS.habits, []),
      logEntries: load<LogEntry[]>(KEYS.logs, []),
      events: load<AppEvent[]>(KEYS.events, []),
    }
  }

  async importAll(data: ExportData): Promise<void> {
    const existing = load<Layer[]>(KEYS.layers, [])
    const plan = planImport(existing, data, () => crypto.randomUUID())
    save(KEYS.layers, [...existing, ...plan.layersToCreate])
    for (const e of plan.habitEntries) await this.upsertHabitEntry(e)
    const logs = load<LogEntry[]>(KEYS.logs, [])
    save(KEYS.logs, [...logs, ...plan.logEntries])
    const events = load<AppEvent[]>(KEYS.events, [])
    save(KEYS.events, [...events, ...plan.events])
  }
}
