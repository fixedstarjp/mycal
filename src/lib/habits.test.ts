import { describe, expect, it } from 'vitest'
import { nextHabitValues, selectedMenuName } from './habits'
import type { HabitEntry, Layer } from '../types'

const boolLayer: Layer = {
  id: 'l1',
  name: '瞑想',
  type: 'habit',
  color: '#000',
  config: { habitKind: 'bool' },
  sortOrder: 0,
  archived: false,
  visible: true,
}

const numLayer: Layer = {
  ...boolLayer,
  id: 'l2',
  name: '筋トレ',
  config: {
    habitKind: 'number',
    habitUnit: 'セット',
    menus: [
      { name: 'A', items: ['腹筋', 'ベンチプレス'] },
      { name: 'B', items: ['デッドリフト', '腕'] },
    ],
  },
}

const entry = (over: Partial<HabitEntry>): HabitEntry => ({
  id: 'e1',
  layerId: 'l2',
  date: '2026-07-29',
  valueBool: null,
  valueNum: null,
  note: '',
  ...over,
})

describe('nextHabitValues (メニューなし)', () => {
  it('未記録から達成にする(bool)', () => {
    expect(nextHabitValues(undefined, boolLayer)).toEqual({
      valueBool: true,
      valueNum: null,
      note: '',
    })
  })

  it('未記録から達成にする(number)は1', () => {
    expect(nextHabitValues(undefined, numLayer).valueNum).toBe(1)
  })

  it('達成済みを再タップで解除する', () => {
    expect(nextHabitValues(entry({ valueNum: 3 }), numLayer).valueNum).toBe(0)
  })

  it('解除済み(0)から再タップすると既定の1になる', () => {
    expect(nextHabitValues(entry({ valueNum: 0 }), numLayer).valueNum).toBe(1)
  })

  it('メモは維持する', () => {
    expect(nextHabitValues(entry({ valueNum: 0, note: 'A' }), numLayer).note).toBe('A')
  })
})

describe('nextHabitValues (メニュー選択)', () => {
  it('未記録からAを選ぶと達成+note=A', () => {
    expect(nextHabitValues(undefined, numLayer, 'A')).toEqual({
      valueBool: null,
      valueNum: 1,
      note: 'A',
    })
  })

  it('A達成中にAを再タップすると解除される', () => {
    const r = nextHabitValues(entry({ valueNum: 2, note: 'A' }), numLayer, 'A')
    expect(r.valueNum).toBe(0)
    expect(r.note).toBe('')
  })

  it('A達成中にBを選ぶと達成のままBに付け替わる', () => {
    const r = nextHabitValues(entry({ valueNum: 2, note: 'A' }), numLayer, 'B')
    expect(r.valueNum).toBe(2) // セット数は維持
    expect(r.note).toBe('B')
  })

  it('解除済み(0セット)でAを選ぶと再び達成になる', () => {
    const r = nextHabitValues(entry({ valueNum: 0, note: '' }), numLayer, 'A')
    expect(r.valueNum).toBe(1)
    expect(r.note).toBe('A')
  })
})

describe('selectedMenuName', () => {
  it('達成中はメニュー名を返す', () => {
    expect(selectedMenuName(entry({ valueNum: 1, note: 'A' }))).toBe('A')
  })

  it('未達成ならnull', () => {
    expect(selectedMenuName(entry({ valueNum: 0, note: 'A' }))).toBeNull()
  })

  it('未記録・メニュー未選択ならnull', () => {
    expect(selectedMenuName(undefined)).toBeNull()
    expect(selectedMenuName(entry({ valueNum: 1, note: '' }))).toBeNull()
  })
})
