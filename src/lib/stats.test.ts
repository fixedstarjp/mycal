import { describe, expect, it } from 'vitest'
import { calcHabitStatuses, calcMonthlyRate, calcStreak, isAchieved } from './stats'
import type { Layer } from '../types'
import { addOneHour } from './dates'
import type { HabitEntry } from '../types'

function entry(date: string, over: Partial<HabitEntry> = {}): HabitEntry {
  return {
    id: `e-${date}`,
    layerId: 'layer-1',
    date,
    valueBool: true,
    valueNum: null,
    note: '',
    ...over,
  }
}

describe('isAchieved', () => {
  it('bool習慣: trueで達成', () => {
    expect(isAchieved(entry('2026-07-18', { valueBool: true }))).toBe(true)
    expect(isAchieved(entry('2026-07-18', { valueBool: false }))).toBe(false)
  })

  it('数値習慣: 正の値で達成、0は未達成', () => {
    expect(isAchieved(entry('2026-07-18', { valueBool: null, valueNum: 30 }))).toBe(true)
    expect(isAchieved(entry('2026-07-18', { valueBool: null, valueNum: 0 }))).toBe(false)
    expect(isAchieved(entry('2026-07-18', { valueBool: null, valueNum: null }))).toBe(false)
  })
})

describe('calcStreak', () => {
  it('今日を含む連続日数を数える', () => {
    const entries = [entry('2026-07-16'), entry('2026-07-17'), entry('2026-07-18')]
    expect(calcStreak(entries, '2026-07-18')).toBe(3)
  })

  it('途切れたらそこで止まる', () => {
    const entries = [entry('2026-07-14'), entry('2026-07-17'), entry('2026-07-18')]
    expect(calcStreak(entries, '2026-07-18')).toBe(2)
  })

  it('今日未達成でも昨日までの連続は維持', () => {
    const entries = [entry('2026-07-16'), entry('2026-07-17')]
    expect(calcStreak(entries, '2026-07-18')).toBe(2)
  })

  it('記録なしなら0', () => {
    expect(calcStreak([], '2026-07-18')).toBe(0)
  })

  it('月またぎ(7/1←6/30)も連続と数える', () => {
    const entries = [entry('2026-06-29'), entry('2026-06-30'), entry('2026-07-01')]
    expect(calcStreak(entries, '2026-07-01')).toBe(3)
  })

  it('未達成エントリ(bool=false)は連続に含めない', () => {
    const entries = [entry('2026-07-17', { valueBool: false }), entry('2026-07-18')]
    expect(calcStreak(entries, '2026-07-18')).toBe(1)
  })
})

describe('calcHabitStatuses', () => {
  const layers: Layer[] = [
    { id: 'gym', name: '筋トレ', type: 'habit', color: '#e0a028', config: { icon: '💪' }, sortOrder: 0, archived: false, visible: true },
    { id: 'walk', name: 'ウォーキング', type: 'habit', color: '#6fae5f', config: {}, sortOrder: 1, archived: false, visible: true },
    { id: 'diary', name: '日記', type: 'log', color: '#6b7fb5', config: {}, sortOrder: 2, archived: false, visible: true },
  ]
  const today = '2026-07-22'

  function e(layerId: string, date: string, over: Partial<HabitEntry> = {}): HabitEntry {
    return { id: `${layerId}-${date}`, layerId, date, valueBool: true, valueNum: null, note: '', ...over }
  }

  it('習慣型のみを対象にする(ログ型は含めない)', () => {
    const s = calcHabitStatuses(layers, [], today)
    expect(s.map((x) => x.layer.id)).toEqual(['gym', 'walk'])
  })

  it('今日達成した習慣にdoneTodayが立つ', () => {
    const s = calcHabitStatuses(layers, [e('gym', today)], today)
    expect(s.find((x) => x.layer.id === 'gym')!.doneToday).toBe(true)
    expect(s.find((x) => x.layer.id === 'walk')!.doneToday).toBe(false)
  })

  it('連続日数を習慣ごとに返す', () => {
    const s = calcHabitStatuses(
      layers,
      [e('gym', '2026-07-20'), e('gym', '2026-07-21'), e('gym', today)],
      today,
    )
    expect(s.find((x) => x.layer.id === 'gym')!.streak).toBe(3)
    expect(s.find((x) => x.layer.id === 'walk')!.streak).toBe(0)
  })

  it('数値習慣は0なら未達成扱い', () => {
    const s = calcHabitStatuses(layers, [e('gym', today, { valueBool: null, valueNum: 0 })], today)
    expect(s.find((x) => x.layer.id === 'gym')!.doneToday).toBe(false)
  })

  it('アーカイブ済みの習慣は対象外', () => {
    const archived = layers.map((l) => (l.id === 'walk' ? { ...l, archived: true } : l))
    const s = calcHabitStatuses(archived, [], today)
    expect(s.map((x) => x.layer.id)).toEqual(['gym'])
  })
})

describe('addOneHour', () => {
  it('1時間後を返す', () => {
    expect(addOneHour('14:05')).toBe('15:05')
    expect(addOneHour('09:30')).toBe('10:30')
  })

  it('日をまたぐ場合は23:55に丸める', () => {
    expect(addOneHour('23:30')).toBe('23:55')
  })
})

describe('calcMonthlyRate', () => {
  it('達成日数/月日数を%で返す', () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      entry(`2026-07-${String(i + 1).padStart(2, '0')}`),
    )
    expect(calcMonthlyRate(entries, '2026-07', 31)).toBe(48) // 15/31 = 48.4%
  })

  it('別の月のエントリは数えない', () => {
    const entries = [entry('2026-06-30'), entry('2026-07-01')]
    expect(calcMonthlyRate(entries, '2026-07', 31)).toBe(3) // 1/31
  })

  it('記録なしなら0%', () => {
    expect(calcMonthlyRate([], '2026-07', 31)).toBe(0)
  })
})
