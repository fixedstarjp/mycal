// 自宅の位置を端末に登録しておき、アプリを開いたときの現在地と比べて
// 「外出した/帰宅した」を検知する(半自動)。
// ※Web/PWAにはバックグラウンド位置監視の仕組みがないため、検知できるのは
//   アプリを開いたタイミング。記録する時刻もその時刻になる。

export interface Coords {
  lat: number
  lon: number
}

export type PresenceState = 'home' | 'away'
export type Transition = '出発' | '帰宅' | null

const HOME_KEY = 'mycal.home_location'
const STATE_KEY = 'mycal.presence_state'

// 自宅とみなす半径(m)。GPSの誤差を考慮して広めに取る
export const HOME_RADIUS_M = 150
// 位置精度がこれより悪い(m)ときは誤検知を避けて判定しない
export const MAX_ACCURACY_M = 200

// 2地点間の距離(m)。Haversine
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 現在地が自宅圏内か
export function isAtHome(pos: Coords, home: Coords, radiusM = HOME_RADIUS_M): boolean {
  return distanceMeters(pos, home) <= radiusM
}

// 前回の状態と今の状態から、記録すべき出来事を判定する。
// 初回(prevがnull)は基準がないので記録しない
export function detectTransition(prev: PresenceState | null, current: PresenceState): Transition {
  if (prev === null || prev === current) return null
  return current === 'away' ? '出発' : '帰宅'
}

export function getHomeLocation(): Coords | null {
  try {
    const raw = localStorage.getItem(HOME_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return typeof v?.lat === 'number' && typeof v?.lon === 'number' ? { lat: v.lat, lon: v.lon } : null
  } catch {
    return null
  }
}

export function setHomeLocation(c: Coords): void {
  localStorage.setItem(HOME_KEY, JSON.stringify(c))
}

export function clearHomeLocation(): void {
  localStorage.removeItem(HOME_KEY)
  localStorage.removeItem(STATE_KEY)
}

export function getPresenceState(): PresenceState | null {
  const v = localStorage.getItem(STATE_KEY)
  return v === 'home' || v === 'away' ? v : null
}

export function setPresenceState(s: PresenceState): void {
  localStorage.setItem(STATE_KEY, s)
}

// 現在地を取得(精度つき)。取得できなければnull
export function getCurrentPosition(timeoutMs = 5000): Promise<(Coords & { accuracy: number }) | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    let settled = false
    const done = (v: (Coords & { accuracy: number }) | null) => {
      if (!settled) {
        settled = true
        resolve(v)
      }
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        done({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy })
      },
      () => {
        clearTimeout(timer)
        done(null)
      },
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// アプリ起動時のチェック。検知した出来事(出発/帰宅)を返し、状態を更新する
export async function checkPresence(): Promise<Transition> {
  const home = getHomeLocation()
  if (!home) return null
  const pos = await getCurrentPosition()
  // 位置が取れない/精度が悪いときは誤検知を避けて何もしない
  if (!pos || pos.accuracy > MAX_ACCURACY_M) return null

  const current: PresenceState = isAtHome(pos, home) ? 'home' : 'away'
  const transition = detectTransition(getPresenceState(), current)
  setPresenceState(current)
  return transition
}
