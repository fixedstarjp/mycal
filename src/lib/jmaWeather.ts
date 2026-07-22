// 気象庁(JMA)の無料予報JSON APIから6時間ごとの降水確率を取得する。
// jma.go.jp/bosai/forecast と同じデータ。日本国内のみ。
// 位置情報から最寄りの府県予報区(office)を選ぶ。取得できなければ東京地方。

export interface JmaArea {
  code: string // 府県予報区(office)コード
  name: string
  lat: number
  lon: number
}

// 各府県予報区の代表地点(気象台のおおよその緯度経度)。
// 最寄り判定に使うので座標は概略でよい。北海道・沖縄は細分区も含める。
export const JMA_AREAS: JmaArea[] = [
  { code: '011000', name: '宗谷地方', lat: 45.42, lon: 141.67 },
  { code: '012000', name: '上川・留萌地方', lat: 43.77, lon: 142.37 },
  { code: '013000', name: '網走・北見・紋別地方', lat: 44.02, lon: 144.27 },
  { code: '014100', name: '釧路・根室・十勝地方', lat: 42.98, lon: 144.38 },
  { code: '015000', name: '胆振・日高地方', lat: 42.32, lon: 140.97 },
  { code: '016000', name: '石狩・空知・後志地方', lat: 43.06, lon: 141.35 },
  { code: '017000', name: '渡島・檜山地方', lat: 41.77, lon: 140.73 },
  { code: '020000', name: '青森県', lat: 40.82, lon: 140.74 },
  { code: '030000', name: '岩手県', lat: 39.7, lon: 141.15 },
  { code: '040000', name: '宮城県', lat: 38.27, lon: 140.87 },
  { code: '050000', name: '秋田県', lat: 39.72, lon: 140.1 },
  { code: '060000', name: '山形県', lat: 38.24, lon: 140.36 },
  { code: '070000', name: '福島県', lat: 37.75, lon: 140.47 },
  { code: '080000', name: '茨城県', lat: 36.34, lon: 140.45 },
  { code: '090000', name: '栃木県', lat: 36.57, lon: 139.88 },
  { code: '100000', name: '群馬県', lat: 36.39, lon: 139.06 },
  { code: '110000', name: '埼玉県', lat: 35.86, lon: 139.65 },
  { code: '120000', name: '千葉県', lat: 35.6, lon: 140.12 },
  { code: '130000', name: '東京地方', lat: 35.69, lon: 139.69 },
  { code: '140000', name: '神奈川県', lat: 35.45, lon: 139.64 },
  { code: '150000', name: '新潟県', lat: 37.9, lon: 139.02 },
  { code: '160000', name: '富山県', lat: 36.7, lon: 137.21 },
  { code: '170000', name: '石川県', lat: 36.59, lon: 136.63 },
  { code: '180000', name: '福井県', lat: 36.07, lon: 136.22 },
  { code: '190000', name: '山梨県', lat: 35.66, lon: 138.57 },
  { code: '200000', name: '長野県', lat: 36.65, lon: 138.18 },
  { code: '210000', name: '岐阜県', lat: 35.39, lon: 136.72 },
  { code: '220000', name: '静岡県', lat: 34.98, lon: 138.38 },
  { code: '230000', name: '愛知県', lat: 35.18, lon: 136.91 },
  { code: '240000', name: '三重県', lat: 34.73, lon: 136.51 },
  { code: '250000', name: '滋賀県', lat: 35.0, lon: 135.87 },
  { code: '260000', name: '京都府', lat: 35.02, lon: 135.76 },
  { code: '270000', name: '大阪府', lat: 34.69, lon: 135.52 },
  { code: '280000', name: '兵庫県', lat: 34.69, lon: 135.18 },
  { code: '290000', name: '奈良県', lat: 34.69, lon: 135.83 },
  { code: '300000', name: '和歌山県', lat: 34.23, lon: 135.17 },
  { code: '310000', name: '鳥取県', lat: 35.5, lon: 134.24 },
  { code: '320000', name: '島根県', lat: 35.47, lon: 133.05 },
  { code: '330000', name: '岡山県', lat: 34.66, lon: 133.93 },
  { code: '340000', name: '広島県', lat: 34.4, lon: 132.46 },
  { code: '350000', name: '山口県', lat: 34.19, lon: 131.47 },
  { code: '360000', name: '徳島県', lat: 34.07, lon: 134.56 },
  { code: '370000', name: '香川県', lat: 34.34, lon: 134.04 },
  { code: '380000', name: '愛媛県', lat: 33.84, lon: 132.77 },
  { code: '390000', name: '高知県', lat: 33.56, lon: 133.53 },
  { code: '400000', name: '福岡県', lat: 33.61, lon: 130.42 },
  { code: '410000', name: '佐賀県', lat: 33.25, lon: 130.3 },
  { code: '420000', name: '長崎県', lat: 32.74, lon: 129.87 },
  { code: '430000', name: '熊本県', lat: 32.79, lon: 130.74 },
  { code: '440000', name: '大分県', lat: 33.24, lon: 131.61 },
  { code: '450000', name: '宮崎県', lat: 31.91, lon: 131.42 },
  { code: '460100', name: '鹿児島県', lat: 31.56, lon: 130.56 },
  { code: '471000', name: '沖縄本島地方', lat: 26.21, lon: 127.68 },
  { code: '473000', name: '宮古島地方', lat: 24.8, lon: 125.28 },
  { code: '474000', name: '八重山地方', lat: 24.34, lon: 124.16 },
]

export const DEFAULT_AREA = JMA_AREAS.find((a) => a.code === '130000')!

// 最寄りの予報区を返す(単純な緯度経度の二乗距離。日本国内なら十分)
export function nearestArea(lat: number, lon: number): JmaArea {
  let best = DEFAULT_AREA
  let bestD = Infinity
  for (const a of JMA_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lon - lon) ** 2
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best
}

export interface JmaPops {
  areaName: string
  // 日付 -> [0-6, 6-12, 12-18, 18-24] の降水確率(データなしはnull)
  byDate: Record<string, (number | null)[]>
}

// JMA予報JSONから6時間ごとの降水確率を取り出す(テスト可能な純粋関数)。
// timeDefinesは各6時間区分の開始時刻(JST, +09:00付き)なので時差変換は不要
export function parseJmaPops(json: unknown): JmaPops {
  const forecast = Array.isArray(json) ? json[0] : undefined
  const series = forecast?.timeSeries?.find(
    (s: { areas?: { pops?: unknown }[] }) => Array.isArray(s.areas) && s.areas[0]?.pops,
  )
  if (!series) return { areaName: '', byDate: {} }
  const area = series.areas[0]
  const byDate: Record<string, (number | null)[]> = {}
  const times: string[] = series.timeDefines ?? []
  const pops: string[] = area.pops ?? []
  for (let i = 0; i < times.length; i++) {
    const t = times[i]
    const date = t.slice(0, 10)
    const hour = Number(t.slice(11, 13))
    const block = Math.floor(hour / 6)
    if (!(block >= 0 && block <= 3)) continue
    byDate[date] ??= [null, null, null, null]
    const v = Number(pops[i])
    if (pops[i] !== '' && pops[i] != null && !Number.isNaN(v)) byDate[date][block] = v
  }
  return { areaName: area.area?.name ?? '', byDate }
}

export async function fetchJmaPops(area: JmaArea): Promise<JmaPops> {
  const res = await fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${area.code}.json`)
  if (!res.ok) throw new Error(`JMA fetch failed: ${res.status}`)
  return parseJmaPops(await res.json())
}
