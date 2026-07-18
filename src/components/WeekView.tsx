import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppData } from '../useAppData'
import { toDateStr, todayStr, weekDays } from '../lib/dates'
import { isAchieved } from '../lib/stats'

interface Props {
  anchor: Date
  data: AppData
  onSelectDate: (date: string) => void
  onMove: (deltaWeek: number) => void
}

// v1簡易版: 7日分を縦に並べ、予定+記録を時系列表示
export default function WeekView({ anchor, data, onSelectDate, onMove }: Props) {
  const days = weekDays(anchor)
  const today = todayStr()
  const layers = data.layers.filter((l) => !l.archived && l.visible)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(-1)}
          aria-label="前の週"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">
          {format(days[0], 'M/d')} - {format(days[6], 'M/d')}
        </h1>
        <button
          className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          onClick={() => onMove(1)}
          aria-label="次の週"
        >
          ▶
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-24">
        {days.map((d) => {
          const ds = toDateStr(d)
          const events = data.gcalEvents
            .filter((ev) => (ev.allDay ? ev.startAt.slice(0, 10) : toDateStr(new Date(ev.startAt))) === ds)
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
          const habits = layers.filter(
            (l) =>
              l.type === 'habit' &&
              data.habitEntries.some((e) => e.layerId === l.id && e.date === ds && isAchieved(e)),
          )
          const logs = data.logEntries.filter((e) => e.date === ds)
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className="block w-full rounded-xl bg-slate-800/60 px-3 py-2 text-left active:bg-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${ds === today ? 'text-sky-400' : 'text-slate-200'}`}>
                  {format(d, 'M/d(E)', { locale: ja })}
                </span>
                <span className="flex gap-1">
                  {habits.map((l) => (
                    <span
                      key={l.id}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                  ))}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {events.map((ev) => (
                  <li key={ev.id} className="flex gap-2 text-xs text-slate-400">
                    <span className="w-10 shrink-0 text-slate-500">
                      {ev.allDay ? '終日' : format(new Date(ev.startAt), 'HH:mm')}
                    </span>
                    <span className="truncate">{ev.title}</span>
                  </li>
                ))}
                {logs.map((e) => {
                  const layer = layers.find((l) => l.id === e.layerId)
                  if (!layer) return null
                  return (
                    <li key={e.id} className="flex gap-2 text-xs">
                      <span className="w-10 shrink-0 text-slate-500">{e.time || '--:--'}</span>
                      <span style={{ color: layer.color }}>{layer.name}</span>
                      <span className="truncate text-slate-400">
                        {Object.values(e.data).slice(0, 2).join(' ')}
                      </span>
                    </li>
                  )
                })}
                {events.length === 0 && logs.length === 0 && habits.length === 0 && (
                  <li className="text-xs text-slate-600">記録なし</li>
                )}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}
