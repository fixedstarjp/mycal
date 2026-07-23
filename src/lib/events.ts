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

// 複数日予定かどうか(終了日が開始日より後)
export function isMultiDay(ev: Pick<AppEvent, 'date' | 'endDate'>): boolean {
  return eventEndDate(ev) !== ev.date
}

// カレンダーの1週間(7日)に描く「横断バー」1本分の情報
export interface EventBar {
  id: string
  title: string
  icon: string
  startCol: number // 0-6(週内の開始列)
  span: number // 何列ぶち抜くか
  lane: number // 縦の段(重なり回避)
  roundLeft: boolean // 実際の開始日が今週内(左端を丸める)
  roundRight: boolean // 実際の終了日が今週内(右端を丸める)
}

// その週にかかる複数日予定を、列をまたぐバーに変換する。
// 重なりは段(lane)を分けて回避。単日予定はバーにしない(セル内チップのまま)
export function weekEventBars(
  weekDates: string[],
  events: AppEvent[],
): { bars: EventBar[]; lanes: number } {
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const multi = events
    .filter((e) => isMultiDay(e) && e.date <= weekEnd && eventEndDate(e) >= weekStart)
    .sort((a, b) => a.date.localeCompare(b.date) || eventEndDate(b).localeCompare(eventEndDate(a)))

  const laneEnd: number[] = [] // 各段の最後に埋まっている列
  const bars: EventBar[] = []
  for (const e of multi) {
    const end = eventEndDate(e)
    const sIdx = e.date < weekStart ? 0 : weekDates.indexOf(e.date)
    const eIdx = end > weekEnd ? 6 : weekDates.indexOf(end)
    if (sIdx < 0 || eIdx < 0) continue
    let lane = laneEnd.findIndex((last) => last < sIdx)
    if (lane === -1) {
      lane = laneEnd.length
      laneEnd.push(-1)
    }
    laneEnd[lane] = eIdx
    bars.push({
      id: e.id,
      title: e.title,
      icon: e.icon,
      startCol: sIdx,
      span: eIdx - sIdx + 1,
      lane,
      roundLeft: e.date >= weekStart,
      roundRight: end <= weekEnd,
    })
  }
  return { bars, lanes: laneEnd.length }
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
