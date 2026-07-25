import { describe, expect, it } from 'vitest'
import { optionFrequency, orderOptions, splitData } from './logTemplates'
import type { FieldDef, LogEntry } from '../types'

const mealFields: FieldDef[] = [
  { key: 'slot', label: '時間帯', type: 'select', options: ['朝', '昼', '夜'] },
  { key: 'content', label: '内容', type: 'multiselect', options: ['白米', '納豆', '味噌汁', 'バナナ'] },
]

function log(id: string, data: Record<string, string | number>): LogEntry {
  return { id, layerId: 'meal', date: '2026-07-20', time: '', data, note: '' }
}

describe('splitData', () => {
  it('multiselectを選択肢(values)とその他(others)に分ける', () => {
    const { values, others } = splitData(mealFields, { slot: '朝', content: '白米,納豆,ゆで卵' })
    expect(values.content).toBe('白米,納豆')
    expect(others.content).toBe('ゆで卵')
    expect(values.slot).toBe('朝')
  })
})

describe('optionFrequency', () => {
  const entries = [
    log('1', { slot: '朝', content: 'バナナ,納豆' }),
    log('2', { slot: '朝', content: 'バナナ' }),
    log('3', { slot: '夜', content: '白米,味噌汁' }),
  ]

  it('時間帯ごとに食材の出現回数を数える', () => {
    const f = optionFrequency(entries, 'content', 'slot')
    expect(f['朝']).toEqual({ バナナ: 2, 納豆: 1 })
    expect(f['夜']).toEqual({ 白米: 1, 味噌汁: 1 })
  })

  it('slotKeyがnullなら全体を集計', () => {
    const f = optionFrequency(entries, 'content', null)
    expect(f['']['バナナ']).toBe(2)
  })
})

describe('orderOptions', () => {
  it('よく食べる順(回数の多い順)に並べ、同数は元の順を保つ', () => {
    const ordered = orderOptions(['白米', '納豆', '味噌汁', 'バナナ'], { バナナ: 2, 納豆: 1 })
    expect(ordered).toEqual(['バナナ', '納豆', '白米', '味噌汁'])
  })

  it('頻度データがなければ元の順のまま', () => {
    expect(orderOptions(['a', 'b'], undefined)).toEqual(['a', 'b'])
  })
})
