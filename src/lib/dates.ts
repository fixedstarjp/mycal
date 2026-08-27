import { addDays, addWeeks, format, startOfWeek } from 'date-fns'

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayStr(): string {
  return toDateStr(new Date())
}

// 日付セレクトの候補。baseの前後を並べ、範囲外の既存値(extra)があれば必ず含める。
// 既存の予定を編集するとき、候補に無くて日付が変わってしまうのを防ぐ
export function dateOptions(base: string, before: number, after: number, extra?: string): string[] {
  const b = new Date(base + 'T00:00:00')
  const set = new Set<string>()
  for (let i = -before; i <= after; i++) set.add(toDateStr(addDays(b, i)))
  if (extra) set.add(extra)
  return [...set].sort()
}

// 日曜始まり
const WEEK_STARTS_ON = 0 as const

// メインビュー用: 前週・当週(アンカーの週)・翌週・翌々週の4週間(28日)。
// アンカー=今日のとき当週が必ず2段目に来る
export function fourWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(addWeeks(anchor, -1), { weekStartsOn: WEEK_STARTS_ON })
  return Array.from({ length: 28 }, (_, i) => addDays(start, i))
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// 現在時刻(等)を5分単位に丸めて 'HH:mm' で返す。ログの時刻初期値に使う
export function roundTime5(d: Date = new Date()): string {
  let h = d.getHours()
  let m = Math.round(d.getMinutes() / 5) * 5
  if (m === 60) {
    m = 0
    h += 1
  }
  if (h >= 24) {
    h = 23
    m = 55
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 'HH:mm' の1時間後を返す(終了時刻のデフォルト用)。日をまたぐ場合は23:55に丸める
export function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (h + 1 > 23) return '23:55'
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
