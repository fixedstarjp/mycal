import type { HabitEntry, Layer } from '../types'

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

export interface TodayStatus {
  todayDone: number // 今日達成した習慣の数
  todayTotal: number // 対象の習慣数
  weekDone: number // 今週(週の初日〜今日)の達成のべ回数
  topStreak: { name: string; icon: string; color: string; days: number } | null
}

// カレンダー上部の「今日のステータス」バー用の集計。
// weekDates は今週の日付(週初め〜)を渡す
export function calcTodayStatus(
  layers: Layer[],
  entries: HabitEntry[],
  today: string,
  weekDates: string[],
): TodayStatus {
  const habits = layers.filter((l) => l.type === 'habit' && !l.archived)
  const achieved = entries.filter(isAchieved)

  const todayDone = habits.filter((l) =>
    achieved.some((e) => e.layerId === l.id && e.date === today),
  ).length

  // 今週は未来日を除く(今日まで)
  const pastWeek = new Set(weekDates.filter((d) => d <= today))
  const weekDone = achieved.filter(
    (e) => pastWeek.has(e.date) && habits.some((l) => l.id === e.layerId),
  ).length

  let topStreak: TodayStatus['topStreak'] = null
  for (const l of habits) {
    const days = calcStreak(
      achieved.filter((e) => e.layerId === l.id),
      today,
    )
    if (days > 0 && (!topStreak || days > topStreak.days)) {
      topStreak = { name: l.name, icon: l.config.icon ?? '', color: l.color, days }
    }
  }

  return { todayDone, todayTotal: habits.length, weekDone, topStreak }
}

function prevDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d - 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}
