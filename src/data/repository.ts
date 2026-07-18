import type { GcalEvent, HabitEntry, Layer, LogEntry } from '../types'

// データアクセスの抽象化。
// v1はLocalStorageRepositoryで動かし、Supabase接続時はこのインターフェースの
// Supabase実装を追加して差し替える(呼び出し側は変更不要)。
export interface Repository {
  getLayers(): Promise<Layer[]>
  saveLayer(layer: Layer): Promise<void>
  deleteLayer(layerId: string): Promise<void>

  getHabitEntries(dateFrom: string, dateTo: string): Promise<HabitEntry[]>
  upsertHabitEntry(entry: HabitEntry): Promise<void>
  deleteHabitEntry(entryId: string): Promise<void>

  getLogEntries(dateFrom: string, dateTo: string): Promise<LogEntry[]>
  saveLogEntry(entry: LogEntry): Promise<void>
  deleteLogEntry(entryId: string): Promise<void>

  getGcalEvents(dateFrom: string, dateTo: string): Promise<GcalEvent[]>
}
