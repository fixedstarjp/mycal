import { describe, expect, it } from 'vitest'
import { eventDates, eventEndDate, eventOccursOn } from './events'

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
