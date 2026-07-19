import { useMemo, useRef } from 'react'
import { format } from 'date-fns'
import type { AppData } from '../useAppData'
import { WEEKDAY_LABELS, fourWeekDays, toDateStr, todayStr } from '../lib/dates'
import { getHolidayName, isRestDay } from '../lib/holidays'
import { isAchieved } from '../lib/stats'
import { weatherEmoji, type TempsByDate } from '../lib/weather'

interface Props {
  anchor: Date
  data: AppData
  temps: TempsByDate
  onSelectDate: (date: string) => void
  onMove: (deltaWeek: number) => void
}

// 4週間表示: 前週・当週・翌週・翌々週(当週が2段目)。
// 当週と翌週の行は少し高くする
export default function MonthView({ anchor, data, temps, onSelectDate, onMove }: Props) {
  const days = useMemo(() => fourWeekDays(anchor), [anchor])
  const today = todayStr()
  // 横スワイプで週送り(縦方向の動きが大きい場合は無視)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    // 次/前の「4週間」へまとめて移動
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onMove(dx < 0 ? 4 : -4)
    }
  }

  const visibleLayers = data.layers.filter((l) => !l.archived && l.visible)
  const habitLayers = visibleLayers.filter((l) => l.type === 'habit')
  const logLayers = visibleLayers.filter((l) => l.type === 'log')

  // date -> 集計のインデックスを作る
  const byDate = useMemo(() => {
    const map = new Map<
      string,
      {
        events: string[]
        appEvents: { icon: string; title: string }[]
        habits: Set<string>
        logCounts: Map<string, number>
      }
    >()
    const get = (d: string) => {
      let v = map.get(d)
      if (!v) {
        v = { events: [], appEvents: [], habits: new Set(), logCounts: new Map() }
        map.set(d, v)
      }
      return v
    }
    for (const ev of data.events) {
      get(ev.date).appEvents.push({ icon: ev.icon, title: ev.title })
    }
    for (const ev of data.gcalEvents) {
      const d = ev.allDay ? ev.startAt.slice(0, 10) : toDateStr(new Date(ev.startAt))
      get(d).events.push(ev.title)
    }
    for (const e of data.habitEntries) {
      if (isAchieved(e)) get(e.date).habits.add(e.layerId)
    }
    for (const e of data.logEntries) {
      const counts = get(e.date).logCounts
      counts.set(e.layerId, (counts.get(e.layerId) ?? 0) + 1)
    }
    return map
  }, [data.events, data.gcalEvents, data.habitEntries, data.logEntries])

  return (
    <div className="flex h-full flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="flex items-center justify-between px-4 py-2">
        <button
          className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(-4)}
          aria-label="前の4週間"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">
          {format(anchor, 'yyyy年M月')}
        </h1>
        <button
          className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(4)}
          aria-label="次の4週間"
        >
          ▶
        </button>
      </header>

      <div className="grid grid-cols-7 px-2 text-center text-xs">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} className={`py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-500'}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 当週(2段目)と翌週(3段目)を高めにする */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[1fr_1.4fr_1.4fr_1fr] gap-px overflow-hidden bg-slate-800 p-px">
        {days.map((d) => {
          const ds = toDateStr(d)
          const info = byDate.get(ds)
          const isToday = ds === today
          const holiday = getHolidayName(d)
          const rest = isRestDay(d)
          const dow = d.getDay()
          const temp = temps[ds]
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={`flex flex-col items-stretch gap-0.5 overflow-hidden p-1 text-left align-top hover:bg-slate-800 active:bg-slate-700 ${
                rest ? 'bg-slate-900' : 'bg-slate-800/45'
              }`}
            >
              {/* 日付ブロック: 1行目=日付+祝日名(今日は青い帯)、2行目=天気+気温 */}
              <span className={`-m-1 mb-0 flex flex-col px-1 py-0.5 ${isToday ? 'bg-sky-500' : ''}`}>
                <span className="flex min-w-0 items-baseline">
                  <span
                    className={`shrink-0 text-xs leading-4 ${
                      isToday
                        ? 'font-bold text-white'
                        : holiday || dow === 0
                          ? 'text-rose-400'
                          : dow === 6
                            ? 'text-sky-400'
                            : 'text-slate-300'
                    }`}
                  >
                    {/* 毎月1日は「8/1」のように月を付けて表示 */}
                    {d.getDate() === 1 ? format(d, 'M/d') : format(d, 'd')}
                  </span>
                  {holiday && (
                    <span
                      className={`min-w-0 break-all text-[8px] leading-3 ${isToday ? 'text-white' : 'text-rose-400'}`}
                    >
                      {holiday}
                    </span>
                  )}
                </span>
                {temp && (
                  <span
                    className={`text-[8px] leading-3 ${isToday ? 'text-sky-100' : 'text-slate-400'}`}
                    title={`最高${temp.max}° / 最低${temp.min}°`}
                  >
                    {weatherEmoji(temp.code)} {temp.max}/{temp.min}°
                  </span>
                )}
              </span>

              {/* 自分の予定(アイコン付き・明るめ)を先に、Google予定(グレー)を後に、計5件まで表示 */}
              {info?.appEvents.slice(0, 5).map((ev, i) => (
                <span
                  key={`a${i}`}
                  title={ev.title}
                  className="flex flex-col items-center rounded bg-slate-700 px-0.5"
                >
                  {ev.icon && <span className="text-[10px] leading-3">{ev.icon}</span>}
                  <span className="line-clamp-1 w-full break-all text-center text-[9px] leading-3 text-slate-100">
                    {ev.title}
                  </span>
                </span>
              ))}
              {info?.events.slice(0, Math.max(0, 5 - info.appEvents.length)).map((t, i) => (
                <span key={`g${i}`} className="truncate rounded bg-slate-800 px-1 text-[10px] leading-4 text-slate-400">
                  {t}
                </span>
              ))}
              {info && info.appEvents.length + info.events.length > 5 && (
                <span className="px-1 text-[10px] text-slate-500">
                  +{info.appEvents.length + info.events.length - 5}
                </span>
              )}

              <span className="mt-auto flex flex-wrap items-center gap-1">
                {/* 習慣ドット(達成日のみ) */}
                {habitLayers
                  .filter((l) => info?.habits.has(l.id))
                  .map((l) => (
                    <span
                      key={l.id}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                      title={l.name}
                    />
                  ))}
                {/* ログ件数バッジ */}
                {logLayers.map((l) => {
                  const n = info?.logCounts.get(l.id) ?? 0
                  if (n === 0) return null
                  return (
                    <span
                      key={l.id}
                      className="rounded px-1 text-[10px] font-medium leading-4 text-white"
                      style={{ backgroundColor: l.color }}
                      title={`${l.name} ${n}件`}
                    >
                      {n}
                    </span>
                  )
                })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
