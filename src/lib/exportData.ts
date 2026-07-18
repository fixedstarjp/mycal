import type { AppEvent, ExportData, HabitEntry, Layer, LogEntry } from '../types'

export function buildExportData(
  layers: Layer[],
  habitEntries: HabitEntry[],
  logEntries: LogEntry[],
  events: AppEvent[] = [],
  now = new Date(),
): ExportData {
  return {
    exportedAt: now.toISOString(),
    version: 1,
    layers,
    habitEntries,
    logEntries,
    events,
  }
}

export function downloadJson(data: ExportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mycal-export-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
