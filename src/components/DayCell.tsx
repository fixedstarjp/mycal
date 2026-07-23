import { format } from 'date-fns'
import type { Layer } from '../types'
import { getHolidayName, isRestDay } from '../lib/holidays'
import { weatherEmoji, type DayTemp } from '../lib/weather'

export interface DayCellInfo {
  events: string[] // Google予定タイトル
  appEvents: { icon: string; title: string }[]
  todos: { title: string; done: boolean }[] // その日が期日のToDo
  habits: Set<string> // 達成済みhabit layerId
  logCounts: Map<string, number>
}

interface Props {
  d: Date
  ds: string
  isToday: boolean
  info: DayCellInfo | undefined
  temp: DayTemp | undefined
  habitLayers: Layer[]
  logLayers: Layer[]
  barBandPx: number // 複数日予定の横断バー用に上部へ空ける高さ(週で共通)
  onSelect: (date: string) => void
}

const MAX_EVENTS = 5

// カレンダーの1日分のセル。
// 1行目=日付+祝日名(今日は青い帯)、2行目=天気+気温、以降=予定チップ、最下段=習慣ドット+ログ件数
export default function DayCell({
  d,
  ds,
  isToday,
  info,
  temp,
  habitLayers,
  logLayers,
  barBandPx,
  onSelect,
}: Props) {
  const holiday = getHolidayName(d)
  const rest = isRestDay(d)
  const dow = d.getDay()

  return (
    <button
      onClick={() => onSelect(ds)}
      className={`flex flex-col items-stretch gap-0.5 overflow-hidden p-1 text-left align-top hover:bg-slate-800 active:bg-slate-700 ${
        rest ? 'bg-slate-900' : 'bg-slate-800/45'
      } ${isToday ? 'ring-2 ring-inset ring-emerald-400' : ''}`}
    >
      {/* 今日は日付行を緑の帯にして目立たせる(セルは緑の細枠で囲う) */}
      <span className={`-m-1 mb-0 flex min-w-0 items-baseline px-1 py-0.5 ${isToday ? 'bg-emerald-500' : ''}`}>
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

      {/* 複数日予定の横断バー用に上部を空ける(バー本体はMonthViewが週単位で重ねて描く) */}
      {barBandPx > 0 && <span style={{ height: barBandPx }} className="shrink-0" />}

      {temp && (
        <span
          className="text-[8px] leading-3 text-slate-400"
          title={`最高${temp.max}° / 最低${temp.min}°`}
        >
          {weatherEmoji(temp.code)} {temp.max}/{temp.min}°
        </span>
      )}

      {/* 期日つきToDo(未完了のみ) */}
      {info?.todos
        .filter((t) => !t.done)
        .slice(0, 2)
        .map((t, i) => (
          <span
            key={`t${i}`}
            title={t.title}
            className="truncate rounded bg-sky-900/70 px-1 text-[9px] leading-4 text-sky-200"
          >
            ✓{t.title}
          </span>
        ))}

      {/* 自分の予定(アイコン付き・明るめ)を先に、Google予定(グレー)を後に表示 */}
      {info?.appEvents.slice(0, MAX_EVENTS).map((ev, i) => (
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
      {info?.events.slice(0, Math.max(0, MAX_EVENTS - info.appEvents.length)).map((t, i) => (
        <span key={`g${i}`} className="truncate rounded bg-slate-800 px-1 text-[10px] leading-4 text-slate-400">
          {t}
        </span>
      ))}
      {info && info.appEvents.length + info.events.length > MAX_EVENTS && (
        <span className="px-1 text-[10px] text-slate-500">
          +{info.appEvents.length + info.events.length - MAX_EVENTS}
        </span>
      )}

      <span className="mt-auto flex flex-wrap items-center gap-1">
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
}
