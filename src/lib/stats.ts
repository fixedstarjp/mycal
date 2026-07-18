import type { HabitEntry } from '../types'

export function isAchieved(e: HabitEntry): boolean {
  return e.valueBool === true || (e.valueNum !== null && e.valueNum > 0)
}

// 指定日(通常は今日)から遡った連続達成日数。
// entriesは同一レイヤーのものを渡す前提。
export function calcStreak(entries: HabitEntry[], fromDate: string): number {
  const achieved = new Set(entries.filter(isAchieved).map((e) => e.date))
  let streak = 0
  let d = fromDate
  // 今日未達成でも昨日まで続いていればstreak継続とみなす
  if (!achieved.has(d)) d = prevDate(d)
  while (achieved.has(d)) {
    streak++
    d = prevDate(d)
  }
  return streak
}

// 月間達成率(%)。month: 'YYYY-MM'
export function calcMonthlyRate(entries: HabitEntry[], month: string, daysInMonth: number): number {
  const achievedDays = new Set(
    entries.filter((e) => e.date.startsWith(month + '-')).filter(isAchieved).map((e) => e.date),
  ).size
  if (daysInMonth <= 0) return 0
  return Math.round((achievedDays / daysInMonth) * 100)
}

function prevDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d - 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}
