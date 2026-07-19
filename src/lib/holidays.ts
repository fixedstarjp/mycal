import { isHoliday } from 'japanese-holidays'

// 日本の祝日名を返す(祝日でなければnull)。振替休日・国民の休日も含む。
// japanese-holidaysはアルゴリズム計算のためオフラインで動き、年次データ更新も不要
export function getHolidayName(date: Date): string | null {
  return isHoliday(date) ?? null
}

// 休日(土日または祝日)かどうか。月ビューの背景色分けに使う
export function isRestDay(date: Date): boolean {
  const dow = date.getDay()
  return dow === 0 || dow === 6 || getHolidayName(date) !== null
}
