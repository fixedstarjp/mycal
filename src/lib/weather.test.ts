import { describe, expect, it } from 'vitest'
import { COORD_DIGITS, coarseCoord, weatherEmoji } from './weather'

// 外部APIに自宅の正確な位置を渡さないための丸め。
// 桁数を増やす変更が入ったらここで気づけるようにしている
describe('coarseCoord', () => {
  it('既定は小数2桁(約1km)に丸める', () => {
    expect(COORD_DIGITS).toBe(2)
    expect(coarseCoord(35.6812345)).toBe(35.68)
    expect(coarseCoord(139.7671234)).toBe(139.77)
  })

  it('丸めた結果は元の座標から1km程度しかずれない', () => {
    const lat = 35.6812345
    // 緯度1度 ≒ 111km。2桁丸めの最大誤差は0.005度 ≒ 555m
    expect(Math.abs(coarseCoord(lat) - lat) * 111000).toBeLessThan(1000)
  })

  it('南半球・西経(負の値)でも丸められる', () => {
    expect(coarseCoord(-33.8688197)).toBe(-33.87)
    expect(coarseCoord(-70.6692655)).toBe(-70.67)
  })

  it('すでに粗い座標は変わらない', () => {
    expect(coarseCoord(35.68)).toBe(35.68)
    expect(coarseCoord(0)).toBe(0)
  })

  it('桁数は指定できる', () => {
    expect(coarseCoord(35.6812345, 1)).toBe(35.7)
    expect(coarseCoord(35.6812345, 0)).toBe(36)
  })
})

describe('weatherEmoji', () => {
  it('未取得は空文字', () => {
    expect(weatherEmoji(undefined)).toBe('')
  })

  it('WMOコードを絵文字にする', () => {
    expect(weatherEmoji(0)).toBe('☀️')
    expect(weatherEmoji(3)).toBe('☁️')
    expect(weatherEmoji(95)).toBe('⛈️')
  })
})
