import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import { WEEKDAY_LABELS, fourWeekDays, toDateStr, todayStr } from '../lib/dates'
import { calcHabitStatuses, isAchieved } from '../lib/stats'
import { nextHabitValues, selectedMenuName } from '../lib/habits'
import type { Layer } from '../types'
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

  // 今日の習慣の状況(チップ表示・タップで記録)
  const habitStatuses = useMemo(
    () => calcHabitStatuses(data.layers, data.habitEntries, today),
    [data.layers, data.habitEntries, today],
  )

  // メニュー選択を開いている習慣のレイヤーID(A/Bなどの選択肢を持つ習慣のみ)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  // チップのタップで今日の記録を切り替える(1タップで記録完了)。
  // A/Bなどのメニューを持つ習慣は、いきなり記録せず選択肢を開く
  const entryOf = (layerId: string) =>
    data.habitEntries.find((e) => e.layerId === layerId && e.date === today)

  async function record(layer: Layer, menuName?: string) {
    const cur = entryOf(layer.id)
    await repo.upsertHabitEntry({
      id: cur?.id ?? newId(),
      layerId: layer.id,
      date: today,
      ...nextHabitValues(cur, layer, menuName),
    })
    setMenuFor(null)
    data.reload()
  }

  function tapChip(layer: Layer) {
    if ((layer.config.menus ?? []).length > 0) {
      setMenuFor((cur) => (cur === layer.id ? null : layer.id))
      return
    }
    record(layer)
  }

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

      {/* 今日の習慣: タップでその場で記録。達成済みはレイヤー色、🔥は連続日数。
          A/Bなどのメニューを持つ習慣はタップで選択肢を開く */}
      {habitStatuses.length > 0 && (
        <div className="mx-2 mb-1">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {habitStatuses.map((s) => {
              const menu = selectedMenuName(entryOf(s.layer.id))
              const hasMenus = (s.layer.config.menus ?? []).length > 0
              return (
                <button
                  key={s.layer.id}
                  onClick={() => tapChip(s.layer)}
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                    s.doneToday
                      ? 'border-transparent font-medium text-slate-900'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400'
                  }`}
                  style={s.doneToday ? { backgroundColor: s.layer.color } : undefined}
                >
                  <span>{s.doneToday ? '✓' : s.layer.config.icon || '○'}</span>
                  <span>{s.layer.name}</span>
                  {menu && <span className="font-bold">{menu}</span>}
                  {s.streak > 0 && (
                    <span className={s.doneToday ? 'text-slate-900/70' : 'text-slate-500'}>
                      🔥{s.streak}
                    </span>
                  )}
                  {/* 選択肢があることをひと目でわかるようにする */}
                  {hasMenus && (
                    <span className={s.doneToday ? 'text-slate-900/60' : 'text-slate-600'}>
                      {menuFor === s.layer.id ? '▲' : '▼'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 選択されたメニュー(A/B等)。中身を出して選び間違いを防ぐ */}
          {menuFor && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {(data.layers.find((l) => l.id === menuFor)?.config.menus ?? []).map((m) => {
                const layer = data.layers.find((l) => l.id === menuFor)!
                const active = selectedMenuName(entryOf(menuFor)) === m.name
                return (
                  <button
                    key={m.name}
                    onClick={() => record(layer, m.name)}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${
                      active
                        ? 'border-transparent font-medium text-slate-900'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300'
                    }`}
                    style={active ? { backgroundColor: layer.color } : undefined}
                  >
                    <span className="font-bold">{m.name}</span>
                    {m.items.length > 0 && (
                      <span className={active ? 'ml-1 text-slate-900/70' : 'ml-1 text-slate-500'}>
                        {m.items.join('・')}
                      </span>
                    )}
                    {active && <span className="ml-1 text-slate-900/70">✓</span>}
                  </button>
                )
              })}
              <button
                onClick={() => setMenuFor(null)}
                className="px-1 text-xs text-slate-500"
                aria-label="選択を閉じる"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-7 px-2 text-center text-xs">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} className={`py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
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
                        className={`mx-px flex items-center gap-0.5 overflow-hidden bg-sky-600 px-1 text-[9px] font-medium leading-4 text-slate-900 ${
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
