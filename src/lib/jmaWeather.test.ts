import { describe, expect, it } from 'vitest'
import { DEFAULT_AREA, nearestArea, parseJmaPops } from './jmaWeather'

describe('nearestArea', () => {
  it('東京の座標では東京地方', () => {
    expect(nearestArea(35.69, 139.69).code).toBe('130000')
  })

  it('大阪の座標では大阪府', () => {
    expect(nearestArea(34.69, 135.5).code).toBe('270000')
  })

  it('那覇の座標では沖縄本島地方', () => {
    expect(nearestArea(26.21, 127.68).code).toBe('471000')
  })

  it('札幌の座標では石狩・空知・後志地方', () => {
    expect(nearestArea(43.06, 141.35).code).toBe('016000')
  })

  it('既定は東京地方', () => {
    expect(DEFAULT_AREA.code).toBe('130000')
  })
})

describe('parseJmaPops', () => {
  // JMA予報JSONの最小構造(pops を持つ timeSeries)
  const sample = [
    {
      timeSeries: [
        { timeDefines: ['2026-07-23T06:00:00+09:00'], areas: [{ area: { name: '東京地方' }, weathers: ['晴れ'] }] },
        {
          timeDefines: [
            '2026-07-23T06:00:00+09:00', // 06-12
            '2026-07-23T12:00:00+09:00', // 12-18
            '2026-07-23T18:00:00+09:00', // 18-24
            '2026-07-24T00:00:00+09:00', // 00-06
            '2026-07-24T06:00:00+09:00', // 06-12
          ],
          areas: [{ area: { name: '東京地方' }, pops: ['0', '30', '10', '20', '40'] }],
        },
      ],
    },
  ]

  it('6時間ごとの降水確率を日付別に取り出す(JSTのまま)', () => {
    const { areaName, byDate } = parseJmaPops(sample)
    expect(areaName).toBe('東京地方')
    // 初日は00-06が過ぎているためnull
    expect(byDate['2026-07-23']).toEqual([null, 0, 30, 10])
    expect(byDate['2026-07-24']).toEqual([20, 40, null, null])
  })

  it('pops を持つ timeSeries を選ぶ(天気のみの系列は無視)', () => {
    const { byDate } = parseJmaPops(sample)
    expect(Object.keys(byDate)).toEqual(['2026-07-23', '2026-07-24'])
  })

  it('空データでも落ちない', () => {
    expect(parseJmaPops([]).byDate).toEqual({})
    expect(parseJmaPops(null).byDate).toEqual({})
    expect(parseJmaPops([{ timeSeries: [] }]).byDate).toEqual({})
  })
})
