import { addDays, addWeeks, format, startOfWeek } from 'date-fns'

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayStr(): string {
  return toDateStr(new Date())
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

// 'HH:mm' の1時間後を返す(終了時刻のデフォルト用)。日をまたぐ場合は23:55に丸める
export function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (h + 1 > 23) return '23:55'
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
