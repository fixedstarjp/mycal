import { describe, expect, it } from 'vitest'
import { getHolidayName, isRestDay } from './holidays'

describe('getHolidayName', () => {
  it('祝日名を返す', () => {
    expect(getHolidayName(new Date(2026, 0, 1))).toBe('元日')
    expect(getHolidayName(new Date(2026, 6, 20))).toBe('海の日') // 2026年7月第3月曜
  })

  it('振替休日も判定する(2026-05-03憲法記念日が日曜 → 5/6振替)', () => {
    expect(getHolidayName(new Date(2026, 4, 6))).toContain('振替')
  })

  it('平日はnull', () => {
    expect(getHolidayName(new Date(2026, 6, 17))).toBeNull() // 金曜
  })
})

describe('isRestDay', () => {
  it('土日は休日', () => {
    expect(isRestDay(new Date(2026, 6, 18))).toBe(true) // 土
    expect(isRestDay(new Date(2026, 6, 19))).toBe(true) // 日
  })

  it('平日の祝日も休日', () => {
    expect(isRestDay(new Date(2026, 6, 20))).toBe(true) // 海の日(月)
  })

  it('通常の平日は休日でない', () => {
    expect(isRestDay(new Date(2026, 6, 17))).toBe(false) // 金
  })
})
