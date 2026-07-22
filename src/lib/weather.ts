import { toDateStr } from './dates'

export interface DayTemp {
  max: number
  min: number
  code?: number // WMO weather code
  pop?: number // 降水確率(その日の平均, %)
  pops6?: (number | null)[] // 6時間ごとの降水確率 [0-6, 6-12, 12-18, 18-24](データなしはnull)
}

// 6時間区分のラベル(0時起点)
export const POP6_LABELS = ['0-6', '6-12', '12-18', '18-24']

// WMO weather code → 絵文字(https://open-meteo.com/en/docs のweathercode表)
export function weatherEmoji(code: number | undefined): string {
  if (code === undefined) return ''
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '❄️'
  return '⛈️'
}

export type TempsByDate = Record<string, DayTemp>

// 降水確率をmax→meanに変更したため、旧キャッシュを使わないようキーを更新
const CACHE_KEY = 'mycal.weather.v2'
const TTL_MS = 6 * 60 * 60 * 1000 // 6時間
const FALLBACK = { lat: 35.68, lon: 139.76 } // 位置情報が取れない場合は東京

interface Cache {
  fetchedAt: string
  byDate: TempsByDate
}

function getPosition(timeoutMs = 3000): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(FALLBACK)
    const timer = setTimeout(() => resolve(FALLBACK), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => {
        clearTimeout(timer)
        resolve(FALLBACK)
      },
      { timeout: timeoutMs, maximumAge: 30 * 60 * 1000 },
    )
  })
}

// Open-Meteo(無料・APIキー不要)から今日以降7日間の最高/最低気温を取得。
// 6時間キャッシュし、force=trueで強制再取得
export async function fetchWeather(force = false): Promise<TempsByDate> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw && !force) {
      const cache = JSON.parse(raw) as Cache
      const fresh = Date.now() - new Date(cache.fetchedAt).getTime() < TTL_MS
      const today = cache.byDate[toDateStr(new Date())]
      // 旧形式キャッシュ(天気コード・降水確率・6時間別なし)は取得し直す
      if (fresh && today && typeof today.code === 'number' && typeof today.pop === 'number' && today.pops6) {
        return cache.byDate
      }
    }
  } catch {
    // キャッシュ破損時は取得し直す
  }

  const { lat, lon } = await getPosition()
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    // 降水確率は「その日の平均」を使う。max(その日の最大)は雨量0mmでも
    // 100%になることがあり、天気予報の感覚と大きくズレるため
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_mean` +
    // 6時間ごと(0-6/6-12/12-18/18-24)の降水確率を出すため時間別も取得する
    `&hourly=precipitation_probability` +
    `&timezone=auto&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`)
  const json = await res.json()

  const byDate = parseOpenMeteoDaily(json)
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ fetchedAt: new Date().toISOString(), byDate } satisfies Cache),
  )
  return byDate
}

// 時間別の降水確率を6時間ごと(0-6/6-12/12-18/18-24)の平均にまとめる。
// timezone=auto なので hourly.time はローカル時刻("2026-07-22T13:00")として扱える。
// 各区分の最大値ではなく平均を使う(最大は雨量0mmでも100%になりやすいため)
export function aggregatePop6(hourly: {
  time?: string[]
  precipitation_probability?: (number | null)[]
}): Record<string, (number | null)[]> {
  const sums: Record<string, { sum: number; n: number }[]> = {}
  const time = hourly.time ?? []
  const probs = hourly.precipitation_probability ?? []
  for (let i = 0; i < time.length; i++) {
    const p = probs[i]
    if (typeof p !== 'number') continue
    const [day, clock] = time[i].split('T')
    if (!day || !clock) continue
    const block = Math.floor(Number(clock.slice(0, 2)) / 6)
    if (!(block >= 0 && block <= 3)) continue
    sums[day] ??= [
      { sum: 0, n: 0 },
      { sum: 0, n: 0 },
      { sum: 0, n: 0 },
      { sum: 0, n: 0 },
    ]
    sums[day][block].sum += p
    sums[day][block].n += 1
  }
  const out: Record<string, (number | null)[]> = {}
  for (const [day, blocks] of Object.entries(sums)) {
    out[day] = blocks.map((b) => (b.n > 0 ? Math.round(b.sum / b.n) : null))
  }
  return out
}

// テスト可能な純粋関数として分離
export function parseOpenMeteoDaily(json: {
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    weathercode?: number[]
    precipitation_probability_mean?: number[]
  }
  hourly?: {
    time?: string[]
    precipitation_probability?: (number | null)[]
  }
}): TempsByDate {
  const byDate: TempsByDate = {}
  const time = json.daily?.time ?? []
  const max = json.daily?.temperature_2m_max ?? []
  const min = json.daily?.temperature_2m_min ?? []
  const codes = json.daily?.weathercode ?? []
  const pops = json.daily?.precipitation_probability_mean ?? []
  const pops6 = json.hourly ? aggregatePop6(json.hourly) : {}
  for (let i = 0; i < time.length; i++) {
    if (typeof max[i] === 'number' && typeof min[i] === 'number') {
      byDate[time[i]] = {
        max: Math.round(max[i]),
        min: Math.round(min[i]),
        ...(typeof codes[i] === 'number' ? { code: codes[i] } : {}),
        ...(typeof pops[i] === 'number' ? { pop: Math.round(pops[i]) } : {}),
        ...(pops6[time[i]] ? { pops6: pops6[time[i]] } : {}),
      }
    }
  }
  return byDate
}
