import { describe, expect, it } from 'vitest'
import {
  eventFromRow,
  eventToRow,
  habitFromRow,
  habitToRow,
  layerFromRow,
  layerToRow,
  logFromRow,
  logToRow,
} from './mappers'
import type { AppEvent, HabitEntry, Layer, LogEntry } from '../types'

const layer: Layer = {
  id: 'uuid-1',
  name: '筋トレ',
  type: 'habit',
  color: '#f97316',
  config: { habitKind: 'number', habitUnit: 'セット' },
  sortOrder: 2,
  archived: false,
  visible: true,
}

const habit: HabitEntry = {
  id: 'uuid-2',
  layerId: 'uuid-1',
  date: '2026-07-18',
  valueBool: null,
  valueNum: 3,
  note: 'メモ',
}

const log: LogEntry = {
  id: 'uuid-3',
  layerId: 'uuid-1',
  date: '2026-07-18',
  time: '12:30',
  data: { symbol: '7203', shares: 100 },
  note: '',
}

describe('mappers', () => {
  it('layer: row⇔model が往復で一致する', () => {
    expect(layerFromRow(layerToRow(layer))).toEqual(layer)
  })

  it('habit: row⇔model が往復で一致する', () => {
    expect(habitFromRow(habitToRow(habit))).toEqual(habit)
  })

  it('log: row⇔model が往復で一致する', () => {
    expect(logFromRow(logToRow(log))).toEqual(log)
  })

  it('event: row⇔model が往復で一致する(end_time⇔endTime)', () => {
    const event: AppEvent = {
      id: 'uuid-4',
      date: '2026-07-20',
      endDate: '',
      time: '10:00',
      endTime: '11:00',
      title: '歯医者',
      icon: '🏥',
      note: '定期検診',
    }
    expect(eventFromRow(eventToRow(event))).toEqual(event)
    expect(eventToRow(event).end_time).toBe('11:00')
  })

  it('event: 複数日予定はendDate⇔end_date、単日はnullで保存', () => {
    const multi: AppEvent = {
      id: 'uuid-5',
      date: '2026-07-20',
      endDate: '2026-07-22',
      time: '',
      endTime: '',
      title: '出張',
      icon: '✈️',
      note: '',
    }
    expect(eventToRow(multi).end_date).toBe('2026-07-22')
    expect(eventFromRow(eventToRow(multi))).toEqual(multi)
    expect(eventToRow({ ...multi, endDate: '' }).end_date).toBeNull()
    expect(eventFromRow({ ...eventToRow(multi), end_date: null }).endDate).toBe('')
  })

  it('habit: numericが文字列で返ってもnumberに変換する', () => {
    const row = { ...habitToRow(habit), value_num: '3' as unknown as number }
    expect(habitFromRow(row).valueNum).toBe(3)
  })

  it('null系フィールドは安全なデフォルトに落ちる', () => {
    const row = { ...logToRow(log), time: null as unknown as string, data: null as unknown as Record<string, string>, note: null as unknown as string }
    const model = logFromRow(row)
    expect(model.time).toBe('')
    expect(model.data).toEqual({})
    expect(model.note).toBe('')
  })
})
