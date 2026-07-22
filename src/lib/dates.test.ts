import { describe, expect, it } from 'vitest'
import { fourWeekDays, toDateStr, weekDays } from './dates'
import { parseOpenMeteoDaily, weatherEmoji } from './weather'

describe('fourWeekDays', () => {
  it('日曜始まりの28日間を返し、アンカーの週が2段目に来る', () => {
    const anchor = new Date(2026, 6, 19) // 2026-07-19(日)
    const days = fourWeekDays(anchor)
    expect(days).toHaveLength(28)
    expect(days[0].getDay()).toBe(0) // 日曜始まり
    expect(toDateStr(days[0])).toBe('2026-07-12') // 前週の日曜
    // 2段目(index 7-13)にアンカーの週
    expect(toDateStr(days[7])).toBe('2026-07-19')
    expect(toDateStr(days[27])).toBe('2026-08-08') // 翌々週の土曜まで
  })

  it('アンカーが週の途中(水曜)でも同じ週割りになる', () => {
    const days = fourWeekDays(new Date(2026, 6, 22)) // 水曜
    expect(toDateStr(days[0])).toBe('2026-07-12')
  })
})

describe('weekDays', () => {
  it('日曜始まりの7日間を返す', () => {
    const days = weekDays(new Date(2026, 6, 22))
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(0)
    expect(toDateStr(days[0])).toBe('2026-07-19')
  })
})

describe('parseOpenMeteoDaily', () => {
  it('日付ごとの最高/最低気温(四捨五入)と天気コード・降水確率に変換する', () => {
    const byDate = parseOpenMeteoDaily({
      daily: {
        time: ['2026-07-19', '2026-07-20'],
        temperature_2m_max: [33.6, 30.2],
        temperature_2m_min: [25.4, 24.8],
        weathercode: [0, 61],
        precipitation_probability_mean: [10, 80.4],
      },
    })
    expect(byDate['2026-07-19']).toEqual({ max: 34, min: 25, code: 0, pop: 10 })
    expect(byDate['2026-07-20']).toEqual({ max: 30, min: 25, code: 61, pop: 80 })
  })

  it('降水確率がなくても他の情報は取れる', () => {
    const byDate = parseOpenMeteoDaily({
      daily: {
        time: ['2026-07-19'],
        temperature_2m_max: [30],
        temperature_2m_min: [25],
        weathercode: [0],
      },
    })
    expect(byDate['2026-07-19']).toEqual({ max: 30, min: 25, code: 0 })
  })

  it('天気コードがなくても気温だけで動く', () => {
    const byDate = parseOpenMeteoDaily({
      daily: { time: ['2026-07-19'], temperature_2m_max: [30], temperature_2m_min: [25] },
    })
    expect(byDate['2026-07-19']).toEqual({ max: 30, min: 25 })
  })

  it('データ欠損でも落ちない', () => {
    expect(parseOpenMeteoDaily({})).toEqual({})
    expect(parseOpenMeteoDaily({ daily: { time: ['2026-07-19'] } })).toEqual({})
  })
})

describe('weatherEmoji', () => {
  it('代表的なWMOコードを絵文字に変換する', () => {
    expect(weatherEmoji(0)).toBe('☀️') // 快晴
    expect(weatherEmoji(2)).toBe('🌤️') // 晴れ時々曇り
    expect(weatherEmoji(3)).toBe('☁️') // 曇り
    expect(weatherEmoji(61)).toBe('🌧️') // 雨
    expect(weatherEmoji(71)).toBe('❄️') // 雪
    expect(weatherEmoji(95)).toBe('⛈️') // 雷雨
    expect(weatherEmoji(undefined)).toBe('')
  })
})
