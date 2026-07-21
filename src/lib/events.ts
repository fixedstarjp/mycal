import { addDays } from 'date-fns'
import type { AppEvent } from '../types'
import { toDateStr } from './dates'

// 複数日予定の展開上限(暴走データ対策)
const MAX_SPAN_DAYS = 60

// 予定の実質的な終了日('' や開始日より前の値は開始日扱い)
export function eventEndDate(ev: Pick<AppEvent, 'date' | 'endDate'>): string {
  const end = ev.endDate || ev.date
  return end >= ev.date ? end : ev.date
}

// その日に予定が乗っているか(開始日〜終了日の範囲内)
export function eventOccursOn(ev: Pick<AppEvent, 'date' | 'endDate'>, ds: string): boolean {
  return ds >= ev.date && ds <= eventEndDate(ev)
}

// 予定が乗る日付の一覧(月ビューでの展開用)
export function eventDates(ev: Pick<AppEvent, 'date' | 'endDate'>): string[] {
  const end = eventEndDate(ev)
  const dates: string[] = []
  let d = new Date(ev.date + 'T00:00:00')
  for (let i = 0; i < MAX_SPAN_DAYS; i++) {
    const ds = toDateStr(d)
    if (ds > end) break
    dates.push(ds)
    d = addDays(d, 1)
  }
  return dates
}
