import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayStr(): string {
  return toDateStr(new Date())
}

// 月ビュー用: 月曜始まりで前後の端数日を含む6週分までのグリッド
export function monthGridDays(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1)
  const start = startOfWeek(startOfMonth(first), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(first), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
