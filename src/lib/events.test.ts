import { describe, expect, it } from 'vitest'
import { eventDates, eventEndDate, eventOccursOn, weekEventBars } from './events'
import type { AppEvent } from '../types'

function ev(over: Partial<AppEvent> & { id: string; date: string; endDate: string }): AppEvent {
  return { time: '', endTime: '', title: over.id, icon: '', note: '', ...over }
}

// 8月9日(日)〜15日(土)の週
const week = [
  '2026-08-09',
  '2026-08-10',
  '2026-08-11',
  '2026-08-12',
  '2026-08-13',
  '2026-08-14',
  '2026-08-15',
]

describe('weekEventBars', () => {
  it('週内に収まる複数日予定を1本のバーにする', () => {
    const { bars, lanes } = weekEventBars(week, [
      ev({ id: '名古屋', date: '2026-08-09', endDate: '2026-08-11', title: '名古屋' }),
    ])
    expect(lanes).toBe(1)
    expect(bars[0]).toMatchObject({
      title: '名古屋',
      startCol: 0,
      span: 3,
      lane: 0,
      roundLeft: true,
      roundRight: true,
    })
  })

  it('単日予定はバーにしない', () => {
    const { bars } = weekEventBars(week, [ev({ id: 'x', date: '2026-08-10', endDate: '' })])
    expect(bars).toEqual([])
  })

  it('週をまたぐ予定は端を丸めず、週内の範囲でクランプ', () => {
    // 前週から今週火曜まで
    const { bars } = weekEventBars(week, [
      ev({ id: '出張', date: '2026-08-06', endDate: '2026-08-11' }),
    ])
    expect(bars[0]).toMatchObject({ startCol: 0, span: 3, roundLeft: false, roundRight: true })
  })

  it('重なる予定は別の段(lane)に割り当てる', () => {
    const { bars, lanes } = weekEventBars(week, [
      ev({ id: 'A', date: '2026-08-09', endDate: '2026-08-11' }),
      ev({ id: 'B', date: '2026-08-10', endDate: '2026-08-13' }),
    ])
    expect(lanes).toBe(2)
    expect(bars.find((b) => b.id === 'A')!.lane).toBe(0)
    expect(bars.find((b) => b.id === 'B')!.lane).toBe(1)
  })

  it('重ならなければ同じ段を使い回す', () => {
    const { lanes } = weekEventBars(week, [
      ev({ id: 'A', date: '2026-08-09', endDate: '2026-08-10' }),
      ev({ id: 'B', date: '2026-08-12', endDate: '2026-08-14' }),
    ])
    expect(lanes).toBe(1)
  })
})

describe('eventOccursOn', () => {
  it('単日予定は開始日のみ', () => {
    const ev = { date: '2026-07-20', endDate: '' }
    expect(eventOccursOn(ev, '2026-07-20')).toBe(true)
    expect(eventOccursOn(ev, '2026-07-21')).toBe(false)
  })

  it('複数日予定は期間内すべての日に乗る(月またぎも)', () => {
    const ev = { date: '2026-07-30', endDate: '2026-08-02' }
    expect(eventOccursOn(ev, '2026-07-29')).toBe(false)
    expect(eventOccursOn(ev, '2026-07-30')).toBe(true)
    expect(eventOccursOn(ev, '2026-07-31')).toBe(true)
    expect(eventOccursOn(ev, '2026-08-01')).toBe(true)
    expect(eventOccursOn(ev, '2026-08-02')).toBe(true)
    expect(eventOccursOn(ev, '2026-08-03')).toBe(false)
  })

  it('終了日が開始日より前の不正データは単日扱い', () => {
    const ev = { date: '2026-07-20', endDate: '2026-07-10' }
    expect(eventEndDate(ev)).toBe('2026-07-20')
    expect(eventOccursOn(ev, '2026-07-20')).toBe(true)
    expect(eventOccursOn(ev, '2026-07-15')).toBe(false)
  })
})

describe('eventDates', () => {
  it('開始日から終了日までの日付一覧を返す', () => {
    expect(eventDates({ date: '2026-07-20', endDate: '2026-07-22' })).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
    ])
  })

  it('単日予定は1日だけ', () => {
    expect(eventDates({ date: '2026-07-20', endDate: '' })).toEqual(['2026-07-20'])
  })
})
