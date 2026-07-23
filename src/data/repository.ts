import type { AppEvent, ExportData, GcalEvent, HabitEntry, Layer, LogEntry, Todo } from '../types'

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
  // 指定レイヤーの直近の記録(新しい順)。ワンタップ再入力のテンプレ候補に使う
  getRecentLogEntries(layerId: string, limit: number): Promise<LogEntry[]>


  getGcalEvents(dateFrom: string, dateTo: string): Promise<GcalEvent[]>

  // アプリ内予定(Google非連携)
  getEvents(dateFrom: string, dateTo: string): Promise<AppEvent[]>
  saveEvent(event: AppEvent): Promise<void>
  deleteEvent(eventId: string): Promise<void>

  // ToDo(期日は任意)。件数が少ないので範囲指定なしで全件返す
  getTodos(): Promise<Todo[]>
  saveTodo(todo: Todo): Promise<void>
  deleteTodo(todoId: string): Promise<void>

  // JSON一括エクスポート/インポート(端末間移行・バックアップ用)
  exportAll(): Promise<
    Pick<ExportData, 'layers' | 'habitEntries' | 'logEntries' | 'events' | 'todos'>
  >
  importAll(data: ExportData): Promise<void>
}
