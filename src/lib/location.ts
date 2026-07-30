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

// 現在地チェックの結果。手動チェック(フッターの位置情報ボタン)では
// 「何も起きなかった」ときも理由を伝えたいので、成功以外も型で返す
export type PresenceResult =
  | { kind: 'transition'; transition: '出発' | '帰宅' } // 出入りを検知した
  | { kind: 'unchanged'; state: PresenceState } // 前回から変化なし(初回もここ)
  | { kind: 'no-home' } // 自宅が未登録
  | { kind: 'unavailable' } // 現在地を取得できない(許可なし/タイムアウト等)
  | { kind: 'inaccurate'; accuracy: number } // 精度が悪すぎて判定しない

// 現在地を確認し、前回の状態と比べて出入りを判定する。判定後の状態は保存する
export async function checkPresence(): Promise<PresenceResult> {
  const home = getHomeLocation()
  if (!home) return { kind: 'no-home' }
  const pos = await getCurrentPosition()
  if (!pos) return { kind: 'unavailable' }
  // 精度が悪いときは誤検知を避けて状態も更新しない
  if (pos.accuracy > MAX_ACCURACY_M) return { kind: 'inaccurate', accuracy: pos.accuracy }

  const current: PresenceState = isAtHome(pos, home) ? 'home' : 'away'
  const transition = detectTransition(getPresenceState(), current)
  setPresenceState(current)
  return transition ? { kind: 'transition', transition } : { kind: 'unchanged', state: current }
}

// 手動チェックの結果メッセージ。押しても無反応にならないよう必ず何か返す
export function presenceMessage(r: PresenceResult): string {
  switch (r.kind) {
    case 'transition':
      return `${r.transition}を検知しました`
    case 'unchanged':
      return r.state === 'home' ? '自宅にいます(変化なし)' : '外出中です(変化なし)'
    case 'no-home':
      return '設定 → 外出の自動記録 で自宅を登録してください'
    case 'unavailable':
      return '現在地を取得できませんでした(位置情報の許可を確認してください)'
    case 'inaccurate':
      return `現在地の精度が粗いため判定しません(約${Math.round(r.accuracy)}m)`
  }
}
