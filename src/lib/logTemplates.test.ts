import { describe, expect, it } from 'vitest'
import { entrySummary, recentTemplates, splitData } from './logTemplates'
import type { FieldDef, LogEntry } from '../types'

const mealFields: FieldDef[] = [
  { key: 'slot', label: '時間帯', type: 'select', options: ['朝', '昼', '夜'] },
  { key: 'content', label: '内容', type: 'multiselect', options: ['白米', '納豆', '味噌汁'] },
]

function log(id: string, data: Record<string, string | number>, date = '2026-07-20'): LogEntry {
  return { id, layerId: 'meal', date, time: '', data, note: '' }
}

describe('splitData', () => {
  it('multiselectを選択肢(values)とその他(others)に分ける', () => {
    const { values, others } = splitData(mealFields, { slot: '朝', content: '白米,納豆,バナナ' })
    expect(values.content).toBe('白米,納豆')
    expect(others.content).toBe('バナナ')
    expect(values.slot).toBe('朝')
  })

  it('データなしはselectの先頭/空文字で初期化', () => {
    const { values } = splitData(mealFields, undefined)
    expect(values.slot).toBe('朝') // selectは先頭
    expect(values.content).toBe('')
  })
})

describe('entrySummary', () => {
  it('フィールド値を / で連結する', () => {
    expect(entrySummary(mealFields, log('a', { slot: '朝', content: '白米,味噌汁' }))).toBe(
      '朝 / 白米,味噌汁',
    )
  })

  it('空フィールドは飛ばす', () => {
    expect(entrySummary(mealFields, log('a', { slot: '昼', content: '' }))).toBe('昼')
  })
})

describe('recentTemplates', () => {
  it('内容が同じ記録は重複排除して新しい順に返す', () => {
    const entries = [
      log('1', { slot: '朝', content: '白米,納豆' }),
      log('2', { slot: '朝', content: '白米,納豆' }), // 1と同じ内容
      log('3', { slot: '夜', content: '味噌汁' }),
    ]
    const r = recentTemplates(mealFields, entries, 5)
    expect(r.map((e) => e.id)).toEqual(['1', '3'])
  })

  it('limit件で打ち切る', () => {
    const entries = [
      log('1', { slot: '朝', content: '白米' }),
      log('2', { slot: '昼', content: '納豆' }),
      log('3', { slot: '夜', content: '味噌汁' }),
    ]
    expect(recentTemplates(mealFields, entries, 2).map((e) => e.id)).toEqual(['1', '2'])
  })

  it('全フィールドが空の記録は候補にしない', () => {
    const entries = [log('1', { slot: '', content: '' }), log('2', { slot: '朝', content: '白米' })]
    expect(recentTemplates(mealFields, entries, 5).map((e) => e.id)).toEqual(['2'])
  })
})
