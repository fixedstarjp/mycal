import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { AppData } from '../useAppData'
import { WEEKDAY_LABELS, fourWeekDays, toDateStr, todayStr } from '../lib/dates'
import { isAchieved } from '../lib/stats'
import { isMultiDay, weekEventBars } from '../lib/events'
import type { TempsByDate } from '../lib/weather'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import DayCell, { type DayCellInfo } from './DayCell'

interface Props {
  anchor: Date
  data: AppData
  temps: TempsByDate
  onSelectDate: (date: string) => void
  onMove: (deltaWeek: number) => void
}

// 横断バーの1段の高さ、および日付行の直下に置くための上部オフセット(px)
const BAR_LANE_PX = 15
const BAR_TOP_PX = 21

// 4週間表示: 前週・当週・翌週・翌々週(当週が2段目)。
// 当週と翌週の行は少し高くする。横スワイプ・矢印で次/前の4週間へ移動
export default function MonthView({ anchor, data, temps, onSelectDate, onMove }: Props) {
  const days = useMemo(() => fourWeekDays(anchor), [anchor])
  // 7日ずつ4週に分ける
  const weeks = useMemo(
    () => [0, 1, 2, 3].map((w) => days.slice(w * 7, w * 7 + 7)),
    [days],
  )
  const today = todayStr()
  // 直近の移動方向(スライドインの向きに使う)
  const [slideDir, setSlideDir] = useState<0 | 1 | -1>(0)
  const swipe = useHorizontalSwipe((dir) => {
    setSlideDir(dir)
    onMove(dir * 4)
  })

  function move(dir: 1 | -1) {
    setSlideDir(dir)
    onMove(dir * 4)
  }

  const visibleLayers = data.layers.filter((l) => !l.archived && l.visible)
  const habitLayers = visibleLayers.filter((l) => l.type === 'habit')
  const logLayers = visibleLayers.filter((l) => l.type === 'log')

  // date -> 集計のインデックスを作る
  const byDate = useMemo(() => {
    const map = new Map<string, DayCellInfo>()
    const get = (d: string) => {
      let v = map.get(d)
      if (!v) {
        v = { events: [], appEvents: [], todos: [], habits: new Set(), logCounts: new Map() }
        map.set(d, v)
      }
      return v
    }
    for (const ev of data.events) {
      // 単日予定はセル内チップ。複数日予定は週の横断バーで描くのでここでは入れない
      if (!isMultiDay(ev)) get(ev.date).appEvents.push({ icon: ev.icon, title: ev.title })
    }
    for (const t of data.todos) {
      // 期日つきのToDoだけカレンダーに出す
      if (t.dueDate) get(t.dueDate).todos.push({ title: t.title, done: t.done })
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
  }, [data.events, data.gcalEvents, data.habitEntries, data.logEntries, data.todos])

  return (
    <div className="flex h-full flex-col" {...swipe.handlers}>
      <header className="flex items-center justify-between px-4 py-2">
        <button
          className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => move(-1)}
          aria-label="前の4週間"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">{format(anchor, 'yyyy年M月')}</h1>
        <button
          className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => move(1)}
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

      {/* 当週(2段目)と翌週(3段目)を高めにする。
          ドラッグ中は指に追従し、切り替え後は横からスライドイン */}
      <div
        key={toDateStr(anchor)}
        className={`grid min-h-0 flex-1 grid-rows-[1fr_1.4fr_1.4fr_1fr] gap-px overflow-hidden bg-slate-800 p-px ${
          slideDir === 1 ? 'slide-in-rtl' : slideDir === -1 ? 'slide-in-ltr' : ''
        }`}
        style={{
          transform: swipe.dragX ? `translateX(${swipe.dragX * 0.4}px)` : undefined,
          transition: swipe.dragX ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {weeks.map((week) => {
          const weekDates = week.map(toDateStr)
          const { bars, lanes } = weekEventBars(weekDates, data.events)
          const barBandPx = lanes * BAR_LANE_PX
          return (
            <div key={weekDates[0]} className="relative grid min-h-0 grid-cols-7 gap-px bg-slate-800">
              {week.map((d, i) => (
                <DayCell
                  key={weekDates[i]}
                  d={d}
                  ds={weekDates[i]}
                  isToday={weekDates[i] === today}
                  info={byDate.get(weekDates[i])}
                  temp={temps[weekDates[i]]}
                  habitLayers={habitLayers}
                  logLayers={logLayers}
                  barBandPx={barBandPx}
                  onSelect={onSelectDate}
                />
              ))}

              {/* 複数日予定の横断バー(週内の列をまたいで1本で描く) */}
              {bars.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0" style={{ top: BAR_TOP_PX }}>
                  <div className="grid grid-cols-7 gap-px" style={{ gridAutoRows: `${BAR_LANE_PX}px` }}>
                    {bars.map((b) => (
                      <div
                        key={b.id}
                        title={b.title}
                        style={{ gridColumn: `${b.startCol + 1} / span ${b.span}`, gridRow: b.lane + 1 }}
                        className={`mx-px flex items-center gap-0.5 overflow-hidden bg-indigo-500 px-1 text-[9px] leading-4 text-white ${
                          b.roundLeft ? 'ml-0.5 rounded-l' : ''
                        } ${b.roundRight ? 'mr-0.5 rounded-r' : ''}`}
                      >
                        {b.icon && <span className="shrink-0">{b.icon}</span>}
                        <span className="truncate">{b.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
