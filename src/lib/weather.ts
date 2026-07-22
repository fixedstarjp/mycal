import { toDateStr } from './dates'

export interface DayTemp {
  max: number
  min: number
  code?: number // WMO weather code
  pop?: number // 降水確率(%)
}

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

const CACHE_KEY = 'mycal.weather'
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
      // 旧形式キャッシュ(天気コード・降水確率なし)は取得し直す
      if (fresh && today && typeof today.code === 'number' && typeof today.pop === 'number') {
        return cache.byDate
      }
    }
  } catch {
    // キャッシュ破損時は取得し直す
  }

  const { lat, lon } = await getPosition()
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max` +
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

// テスト可能な純粋関数として分離
export function parseOpenMeteoDaily(json: {
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    weathercode?: number[]
    precipitation_probability_max?: number[]
  }
}): TempsByDate {
  const byDate: TempsByDate = {}
  const time = json.daily?.time ?? []
  const max = json.daily?.temperature_2m_max ?? []
  const min = json.daily?.temperature_2m_min ?? []
  const codes = json.daily?.weathercode ?? []
  const pops = json.daily?.precipitation_probability_max ?? []
  for (let i = 0; i < time.length; i++) {
    if (typeof max[i] === 'number' && typeof min[i] === 'number') {
      byDate[time[i]] = {
        max: Math.round(max[i]),
        min: Math.round(min[i]),
        ...(typeof codes[i] === 'number' ? { code: codes[i] } : {}),
        ...(typeof pops[i] === 'number' ? { pop: Math.round(pops[i]) } : {}),
      }
    }
  }
  return byDate
}
