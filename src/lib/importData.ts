import type { ExportData, HabitEntry, Layer, LogEntry } from '../types'

export interface ImportPlan {
  layersToCreate: Layer[]
  habitEntries: HabitEntry[]
  logEntries: LogEntry[]
}

// エクスポートJSONの取り込み計画を作る純粋関数。
// - 同名・同型のレイヤーが既にあればそれに統合(ローカル→Supabase移行時の重複防止)
// - なければ新IDで作成(localの 'layer-workout' 等の非UUID IDをSupabaseに送らないため)
// - エントリのIDも新規採番し、layerIdを付け替える
export function planImport(
  existingLayers: Layer[],
  data: ExportData,
  idgen: () => string,
): ImportPlan {
  const layerIdMap = new Map<string, string>()
  const layersToCreate: Layer[] = []

  for (const layer of data.layers) {
    const existing = existingLayers.find((l) => l.name === layer.name && l.type === layer.type)
    if (existing) {
      layerIdMap.set(layer.id, existing.id)
    } else {
      const newLayerId = idgen()
      layerIdMap.set(layer.id, newLayerId)
      layersToCreate.push({ ...layer, id: newLayerId })
    }
  }

  const habitEntries: HabitEntry[] = []
  for (const e of data.habitEntries) {
    const layerId = layerIdMap.get(e.layerId)
    if (!layerId) continue // 対応レイヤーがないエントリはスキップ
    habitEntries.push({ ...e, id: idgen(), layerId })
  }

  const logEntries: LogEntry[] = []
  for (const e of data.logEntries) {
    const layerId = layerIdMap.get(e.layerId)
    if (!layerId) continue
    logEntries.push({ ...e, id: idgen(), layerId })
  }

  return { layersToCreate, habitEntries, logEntries }
}

export function parseExportJson(text: string): ExportData {
  const parsed = JSON.parse(text)
  if (parsed?.version !== 1 || !Array.isArray(parsed.layers)) {
    throw new Error('MyCalのエクスポートJSONではありません')
  }
  return {
    exportedAt: String(parsed.exportedAt ?? ''),
    version: 1,
    layers: parsed.layers,
    habitEntries: Array.isArray(parsed.habitEntries) ? parsed.habitEntries : [],
    logEntries: Array.isArray(parsed.logEntries) ? parsed.logEntries : [],
  }
}
