import { describe, expect, it } from 'vitest'
import { buildExportData } from './exportData'
import { seedLayers } from '../data/seed'

describe('buildExportData', () => {
  it('全データとメタ情報を含むオブジェクトを返す', () => {
    const now = new Date('2026-07-18T09:00:00Z')
    const data = buildExportData(seedLayers, [], [], [], now)
    expect(data.version).toBe(1)
    expect(data.exportedAt).toBe('2026-07-18T09:00:00.000Z')
    expect(data.layers).toHaveLength(4)
    expect(data.habitEntries).toEqual([])
    expect(data.logEntries).toEqual([])
  })

  it('JSONシリアライズ可能である', () => {
    const data = buildExportData(seedLayers, [], [])
    const roundTrip = JSON.parse(JSON.stringify(data))
    expect(roundTrip.layers).toEqual(data.layers)
  })
})
