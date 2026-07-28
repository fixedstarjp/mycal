import { describe, expect, it } from 'vitest'
import { detectTransition, distanceMeters, isAtHome } from './location'

const tokyoStation = { lat: 35.6812, lon: 139.7671 }

describe('distanceMeters', () => {
  it('同じ地点は0m', () => {
    expect(distanceMeters(tokyoStation, tokyoStation)).toBe(0)
  })

  it('緯度0.001度(約111m)の差を概ね正しく測る', () => {
    const d = distanceMeters(tokyoStation, { ...tokyoStation, lat: tokyoStation.lat + 0.001 })
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(120)
  })

  it('東京駅〜新宿駅は約6km', () => {
    const shinjuku = { lat: 35.6896, lon: 139.7006 }
    const d = distanceMeters(tokyoStation, shinjuku)
    expect(d).toBeGreaterThan(5000)
    expect(d).toBeLessThan(7000)
  })
})

describe('isAtHome', () => {
  it('半径内なら在宅', () => {
    // 約55m北
    expect(isAtHome({ ...tokyoStation, lat: tokyoStation.lat + 0.0005 }, tokyoStation)).toBe(true)
  })

  it('半径外なら外出', () => {
    // 約550m北
    expect(isAtHome({ ...tokyoStation, lat: tokyoStation.lat + 0.005 }, tokyoStation)).toBe(false)
  })

  it('半径は指定できる', () => {
    const pos = { ...tokyoStation, lat: tokyoStation.lat + 0.005 }
    expect(isAtHome(pos, tokyoStation, 1000)).toBe(true)
  })
})

describe('detectTransition', () => {
  it('在宅→外出で「出発」', () => {
    expect(detectTransition('home', 'away')).toBe('出発')
  })

  it('外出→在宅で「帰宅」', () => {
    expect(detectTransition('away', 'home')).toBe('帰宅')
  })

  it('変化がなければ記録しない', () => {
    expect(detectTransition('home', 'home')).toBeNull()
    expect(detectTransition('away', 'away')).toBeNull()
  })

  it('初回(前回の状態がない)は記録しない', () => {
    expect(detectTransition(null, 'away')).toBeNull()
    expect(detectTransition(null, 'home')).toBeNull()
  })
})
