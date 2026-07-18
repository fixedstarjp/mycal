import { describe, expect, it } from 'vitest'
import { parseExportJson, planImport } from './importData'
import type { ExportData, Layer } from '../types'

function makeIdgen() {
  let n = 0
  return () => `new-${++n}`
}

const importLayer: Layer = {
  id: 'layer-workout',
  name: '筋トレ',
  type: 'habit',
  color: '#f97316',
  config: { habitKind: 'number' },
  sortOrder: 0,
  archived: false,
  visible: true,
}

function exportData(over: Partial<ExportData> = {}): ExportData {
  return {
    exportedAt: '2026-07-18T00:00:00.000Z',
    version: 1,
    layers: [importLayer],
    habitEntries: [
      { id: 'h1', layerId: 'layer-workout', date: '2026-07-18', valueBool: null, valueNum: 3, note: '' },
    ],
    logEntries: [],
    ...over,
  }
}

describe('planImport', () => {
  it('同名・同型の既存レイヤーがあれば統合し、エントリのlayerIdを付け替える', () => {
    const existing: Layer[] = [{ ...importLayer, id: 'uuid-existing' }]
    const plan = planImport(existing, exportData(), makeIdgen())
    expect(plan.layersToCreate).toHaveLength(0)
    expect(plan.habitEntries[0].layerId).toBe('uuid-existing')
  })

  it('既存にないレイヤーは新IDで作成する(非UUIDの旧IDを持ち込まない)', () => {
    const plan = planImport([], exportData(), makeIdgen())
    expect(plan.layersToCreate).toHaveLength(1)
    expect(plan.layersToCreate[0].id).toBe('new-1')
    expect(plan.habitEntries[0].layerId).toBe('new-1')
    expect(plan.habitEntries[0].id).not.toBe('h1')
  })

  it('同名でも型が違えば別レイヤーとして作成する', () => {
    const existing: Layer[] = [{ ...importLayer, id: 'uuid-x', type: 'log', config: { fields: [] } }]
    const plan = planImport(existing, exportData(), makeIdgen())
    expect(plan.layersToCreate).toHaveLength(1)
  })

  it('対応レイヤーのないエントリはスキップする', () => {
    const data = exportData({
      habitEntries: [
        { id: 'h1', layerId: 'unknown-layer', date: '2026-07-18', valueBool: true, valueNum: null, note: '' },
      ],
    })
    const plan = planImport([], data, makeIdgen())
    expect(plan.habitEntries).toHaveLength(0)
  })
})

describe('parseExportJson', () => {
  it('正しいエクスポートJSONをパースする', () => {
    const parsed = parseExportJson(JSON.stringify(exportData()))
    expect(parsed.layers).toHaveLength(1)
    expect(parsed.habitEntries).toHaveLength(1)
  })

  it('versionがない/違うJSONはエラー', () => {
    expect(() => parseExportJson('{"foo": 1}')).toThrow()
    expect(() => parseExportJson(JSON.stringify({ version: 2, layers: [] }))).toThrow()
  })

  it('壊れたJSONはエラー', () => {
    expect(() => parseExportJson('not json')).toThrow()
  })
})
