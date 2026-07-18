import { useMemo } from 'react'
import { format } from 'date-fns'
import type { AppData } from '../useAppData'
import { WEEKDAY_LABELS, monthGridDays, toDateStr, todayStr } from '../lib/dates'
import { isAchieved } from '../lib/stats'

interface Props {
  year: number
  month: number
  data: AppData
  onSelectDate: (date: string) => void
  onMove: (deltaMonth: number) => void
}

export default function MonthView({ year, month, data, onSelectDate, onMove }: Props) {
  const days = useMemo(() => monthGridDays(year, month), [year, month])
  const today = todayStr()
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(-1)}
          aria-label="前の月"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">
          {year}年{month}月
        </h1>
        <button
          className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(1)}
          aria-label="次の月"
        >
          ▶
        </button>
      </header>

      <div className="grid grid-cols-7 px-2 text-center text-xs text-slate-500">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7 gap-px bg-slate-800 p-px">
        {days.map((d) => {
          const ds = toDateStr(d)
          const inMonth = d.getMonth() === month - 1
          const info = byDate.get(ds)
          const isToday = ds === today
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={`flex flex-col items-stretch gap-0.5 overflow-hidden bg-slate-900 p-1 text-left align-top hover:bg-slate-800 active:bg-slate-700 ${
                inMonth ? '' : 'opacity-40'
              }`}
            >
              <span
                className={`self-start rounded-full px-1.5 text-xs leading-5 ${
                  isToday ? 'bg-sky-500 font-bold text-white' : 'text-slate-300'
                }`}
              >
                {format(d, 'd')}
              </span>

              {/* 自分の予定(アイコン付き・明るめ)を先に、Google予定(グレー)を後に、計2件まで表示 */}
              {info?.appEvents.slice(0, 2).map((ev, i) => (
                <span key={`a${i}`} className="truncate rounded bg-slate-700 px-1 text-[10px] leading-4 text-slate-100">
                  {ev.icon && `${ev.icon} `}
                  {ev.title}
                </span>
              ))}
              {info?.events.slice(0, Math.max(0, 2 - info.appEvents.length)).map((t, i) => (
                <span key={`g${i}`} className="truncate rounded bg-slate-800 px-1 text-[10px] leading-4 text-slate-400">
                  {t}
                </span>
              ))}
              {info && info.appEvents.length + info.events.length > 2 && (
                <span className="px-1 text-[10px] text-slate-500">
                  +{info.appEvents.length + info.events.length - 2}
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
