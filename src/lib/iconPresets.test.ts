import { describe, expect, it } from 'vitest'
import { iconFrequency, orderIcons } from './iconPresets'

describe('iconFrequency', () => {
  it('アイコンの使用回数を数える(空は無視)', () => {
    const freq = iconFrequency([{ icon: '🏥' }, { icon: '📞' }, { icon: '🏥' }, { icon: '' }])
    expect(freq).toEqual({ '🏥': 2, '📞': 1 })
  })

  it('予定がなければ空', () => {
    expect(iconFrequency([])).toEqual({})
  })
})

describe('orderIcons', () => {
  const presets = ['📌', '💼', '🏥', '📞']

  it('よく使う順に並べ、同数は元の順を保つ', () => {
    const ordered = orderIcons(presets, { '🏥': 3, '📞': 1 })
    expect(ordered).toEqual(['🏥', '📞', '📌', '💼'])
  })

  it('プリセットにない使用済みアイコンも候補に混ぜる', () => {
    const ordered = orderIcons(presets, { '🎾': 5 })
    expect(ordered[0]).toBe('🎾')
    expect(ordered).toHaveLength(5)
  })

  it('使用履歴がなければ元の順のまま', () => {
    expect(orderIcons(presets, {})).toEqual(presets)
  })
})
