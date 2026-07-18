import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExportData, GcalEvent, HabitEntry, Layer, LogEntry } from '../types'
import type { Repository } from './repository'
import { planImport } from '../lib/importData'
import { seedLayers } from './seed'
import {
  gcalFromRow,
  habitFromRow,
  habitToRow,
  layerFromRow,
  layerToRow,
  logFromRow,
  logToRow,
  type GcalEventRow,
  type HabitEntryRow,
  type LayerRow,
  type LogEntryRow,
} from './mappers'

// Supabase実装。全テーブルRLS(user_id = auth.uid())前提で、
// user_idはDB側のdefault auth.uid()に任せるためクライアントからは送らない。
export class SupabaseRepository implements Repository {
  private seeded = false
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async getLayers(): Promise<Layer[]> {
    const { data, error } = await this.client
      .from('layers')
      .select('id,name,type,color,config,sort_order,archived,visible')
      .order('sort_order')
    if (error) throw error
    if (data.length === 0 && !this.seeded) {
      // 初回ログイン時にv1デフォルトレイヤーを作成(IDはDB採番)
      this.seeded = true
      const rows = seedLayers.map((l) => {
        const { id: _id, ...row } = layerToRow(l)
        return row
      })
      const { error: seedErr } = await this.client.from('layers').insert(rows)
      if (seedErr) throw seedErr
      return this.getLayers()
    }
    return (data as LayerRow[]).map(layerFromRow)
  }

  async saveLayer(layer: Layer): Promise<void> {
    const { error } = await this.client.from('layers').upsert(layerToRow(layer))
    if (error) throw error
  }

  async deleteLayer(layerId: string): Promise<void> {
    // habit_entries / log_entries は FK on delete cascade で削除される
    const { error } = await this.client.from('layers').delete().eq('id', layerId)
    if (error) throw error
  }

  async getHabitEntries(dateFrom: string, dateTo: string): Promise<HabitEntry[]> {
    const { data, error } = await this.client
      .from('habit_entries')
      .select('id,layer_id,date,value_bool,value_num,note')
      .gte('date', dateFrom)
      .lte('date', dateTo)
    if (error) throw error
    return (data as HabitEntryRow[]).map(habitFromRow)
  }

  async upsertHabitEntry(entry: HabitEntry): Promise<void> {
    const { id: _id, ...row } = habitToRow(entry)
    const { error } = await this.client
      .from('habit_entries')
      .upsert(row, { onConflict: 'layer_id,date' })
    if (error) throw error
  }

  async deleteHabitEntry(entryId: string): Promise<void> {
    const { error } = await this.client.from('habit_entries').delete().eq('id', entryId)
    if (error) throw error
  }

  async getLogEntries(dateFrom: string, dateTo: string): Promise<LogEntry[]> {
    const { data, error } = await this.client
      .from('log_entries')
      .select('id,layer_id,date,time,data,note')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date')
      .order('time')
    if (error) throw error
    return (data as LogEntryRow[]).map(logFromRow)
  }

  async saveLogEntry(entry: LogEntry): Promise<void> {
    // 新規作成時のIDはクライアント採番のUUIDをそのまま使う
    const { error } = await this.client.from('log_entries').upsert(logToRow(entry))
    if (error) throw error
  }

  async deleteLogEntry(entryId: string): Promise<void> {
    const { error } = await this.client.from('log_entries').delete().eq('id', entryId)
    if (error) throw error
  }

  async getGcalEvents(dateFrom: string, dateTo: string): Promise<GcalEvent[]> {
    // 日付境界のタイムゾーンずれを吸収するため前後1日広めに取得し、表示側で日付判定する
    const { data, error } = await this.client
      .from('gcal_cache')
      .select('id,event_id,title,start_at,end_at,all_day')
      .gte('start_at', `${dateFrom}T00:00:00Z`)
      .lte('start_at', `${dateTo}T23:59:59Z`)
      .order('start_at')
    if (error) throw error
    return (data as GcalEventRow[]).map(gcalFromRow)
  }

  async exportAll() {
    const [layersRes, habitsRes, logsRes] = await Promise.all([
      this.client.from('layers').select('id,name,type,color,config,sort_order,archived,visible'),
      this.client.from('habit_entries').select('id,layer_id,date,value_bool,value_num,note'),
      this.client.from('log_entries').select('id,layer_id,date,time,data,note'),
    ])
    for (const res of [layersRes, habitsRes, logsRes]) {
      if (res.error) throw res.error
    }
    return {
      layers: (layersRes.data as LayerRow[]).map(layerFromRow),
      habitEntries: (habitsRes.data as HabitEntryRow[]).map(habitFromRow),
      logEntries: (logsRes.data as LogEntryRow[]).map(logFromRow),
    }
  }

  async importAll(data: ExportData): Promise<void> {
    const existing = await this.getLayers()
    const plan = planImport(existing, data, () => crypto.randomUUID())

    if (plan.layersToCreate.length > 0) {
      const { error } = await this.client.from('layers').insert(plan.layersToCreate.map(layerToRow))
      if (error) throw error
    }
    if (plan.habitEntries.length > 0) {
      const rows = plan.habitEntries.map((e) => {
        const { id: _id, ...row } = habitToRow(e)
        return row
      })
      const { error } = await this.client
        .from('habit_entries')
        .upsert(rows, { onConflict: 'layer_id,date' })
      if (error) throw error
    }
    if (plan.logEntries.length > 0) {
      const { error } = await this.client.from('log_entries').insert(plan.logEntries.map(logToRow))
      if (error) throw error
    }
  }
}
