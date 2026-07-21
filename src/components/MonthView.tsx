import { useMemo } from 'react'
import { format } from 'date-fns'
import type { AppData } from '../useAppData'
import { WEEKDAY_LABELS, fourWeekDays, toDateStr, todayStr } from '../lib/dates'
import { isAchieved } from '../lib/stats'
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

// 4週間表示: 前週・当週・翌週・翌々週(当週が2段目)。
// 当週と翌週の行は少し高くする。横スワイプ・矢印で次/前の4週間へ移動
export default function MonthView({ anchor, data, temps, onSelectDate, onMove }: Props) {
  const days = useMemo(() => fourWeekDays(anchor), [anchor])
  const today = todayStr()
  const swipe = useHorizontalSwipe((dir) => onMove(dir * 4))

  const visibleLayers = data.layers.filter((l) => !l.archived && l.visible)
  const habitLayers = visibleLayers.filter((l) => l.type === 'habit')
  const logLayers = visibleLayers.filter((l) => l.type === 'log')

  // date -> 集計のインデックスを作る
  const byDate = useMemo(() => {
    const map = new Map<string, DayCellInfo>()
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
    <div className="flex h-full flex-col" {...swipe}>
      <header className="flex items-center justify-between px-4 py-2">
        <button
          className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(-4)}
          aria-label="前の4週間"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">{format(anchor, 'yyyy年M月')}</h1>
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
          return (
            <DayCell
              key={ds}
              d={d}
              ds={ds}
              isToday={ds === today}
              info={byDate.get(ds)}
              temp={temps[ds]}
              habitLayers={habitLayers}
              logLayers={logLayers}
              onSelect={onSelectDate}
            />
          )
        })}
      </div>
    </div>
  )
}
