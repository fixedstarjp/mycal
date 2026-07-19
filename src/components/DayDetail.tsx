import { useEffect, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { AppEvent, HabitEntry, Layer, LogEntry } from '../types'
import { calcStreak, isAchieved } from '../lib/stats'
import { toDateStr } from '../lib/dates'
import { getHolidayName } from '../lib/holidays'
import LogEntryForm from './LogEntryForm'
import EventForm from './EventForm'

interface Props {
  date: string
  data: AppData
  onBack: () => void
  onChangeDate: (date: string) => void
}

// ボトムシート表示: 下から上にスライドして開き、
// 上から下へのフリック(または背景タップ・▼ボタン)で閉じる。
// 横フリックで前日/翌日に移動
export default function DayDetail({ date, data, onBack, onChangeDate }: Props) {
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [addingLayer, setAddingLayer] = useState<Layer | null>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null)

  // シートの開閉アニメーションとスワイプ量
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  // 最初に動いた方向で軸を固定: 'v'=下フリックで閉じる / 'h'=横フリックで日移動
  const axis = useRef<'h' | 'v' | null>(null)
  const canDragSheet = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function close() {
    if (closing) return
    setClosing(true)
    setTimeout(onBack, 250)
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    axis.current = null
    // 下フリックで閉じるのは中身が先頭までスクロールされている時だけ
    canDragSheet.current = (scrollRef.current?.scrollTop ?? 0) <= 0
  }

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    if (!axis.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (axis.current === 'v' && canDragSheet.current && dy > 0) setDragY(dy)
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current
    if (axis.current === 'h') {
      // 横フリック: 左=翌日、右=前日
      if (Math.abs(dx) > 60) {
        const next = addDays(new Date(date + 'T00:00:00'), dx < 0 ? 1 : -1)
        onChangeDate(toDateStr(next))
      }
    } else if (dragY > 100) {
      close()
    } else {
      setDragY(0)
    }
    axis.current = null
  }

  const d = new Date(date + 'T00:00:00')
  const layers = data.layers.filter((l) => !l.archived)
  const habitLayers = layers.filter((l) => l.type === 'habit')
  const logLayers = layers.filter((l) => l.type === 'log')

  const events = data.gcalEvents
    .filter((ev) => (ev.allDay ? ev.startAt.slice(0, 10) : toDateStr(new Date(ev.startAt))) === date)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  // 終日('')が先、あとは時刻順
  const dayEvents = data.events
    .filter((e) => e.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))
  const dayLogs = data.logEntries.filter((e) => e.date === date)

  const habitOf = (layerId: string) =>
    data.habitEntries.find((e) => e.layerId === layerId && e.date === date)

  // 習慣トグル: 2タップで記録完了(1タップ目=日セル、2タップ目=ここ)
  async function toggleHabit(layer: Layer) {
    const cur = habitOf(layer.id)
    const kind = layer.config.habitKind ?? 'bool'
    const achieved = cur ? isAchieved(cur) : false
    const entry: HabitEntry = {
      id: cur?.id ?? newId(),
      layerId: layer.id,
      date,
      valueBool: kind === 'bool' ? !achieved : null,
      valueNum: kind === 'number' ? (achieved ? 0 : (cur?.valueNum || 1)) : null,
      note: cur?.note ?? '',
    }
    await repo.upsertHabitEntry(entry)
    data.reload()
  }

  async function setHabitNum(layer: Layer, num: number) {
    const cur = habitOf(layer.id)
    await repo.upsertHabitEntry({
      id: cur?.id ?? newId(),
      layerId: layer.id,
      date,
      valueBool: null,
      valueNum: num,
      note: cur?.note ?? '',
    })
    data.reload()
  }

  async function deleteLog(entry: LogEntry) {
    if (!confirm('このログを削除しますか?')) return
    await repo.deleteLogEntry(entry.id)
    data.reload()
  }

  async function deleteEvent(event: AppEvent) {
    if (!confirm(`予定「${event.title}」を削除しますか?`)) return
    await repo.deleteEvent(event.id)
    data.reload()
  }

  const open = entered && !closing

  return (
    <div className="fixed inset-0 z-40">
      {/* 背景: タップで閉じる */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-250 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />

      <div
        className="absolute inset-x-0 bottom-0 top-10 mx-auto flex max-w-3xl flex-col rounded-t-2xl bg-slate-900 shadow-2xl"
        style={{
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragY > 0 ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* ドラッグハンドル */}
        <div className="flex shrink-0 justify-center pb-1 pt-2">
          <span className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <header className="flex shrink-0 items-center gap-3 px-4 pb-2">
          <h1 className="text-lg font-bold text-slate-100">
            {format(d, 'M月d日(E)', { locale: ja })}
          </h1>
          {getHolidayName(d) && <span className="text-xs text-rose-400">{getHolidayName(d)}</span>}
          <button
            onClick={close}
            className="ml-auto rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
            aria-label="閉じる"
          >
            ▼
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pb-10">
          {/* 予定: 自分の予定(編集可)+Google予定(読み取り専用) */}
          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">予定</h2>
            {events.length === 0 && dayEvents.length === 0 ? (
              <p className="text-sm text-slate-600">予定なし</p>
            ) : (
              <ul className="space-y-1.5">
                {dayEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
                    <span className="w-14 shrink-0 text-xs text-slate-400">
                      {ev.time ? `${ev.time}${ev.endTime ? `-${ev.endTime}` : ''}` : '終日'}
                    </span>
                    <span className="truncate text-sm text-slate-100">
                      {ev.icon && <span className="mr-1">{ev.icon}</span>}
                      {ev.title}
                    </span>
                    <span className="ml-auto flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          setEditingEvent(ev)
                          setEventFormOpen(true)
                        }}
                        className="text-xs text-sky-400"
                      >
                        編集
                      </button>
                      <button onClick={() => deleteEvent(ev)} className="text-xs text-rose-400">
                        削除
                      </button>
                    </span>
                  </li>
                ))}
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
                    <span className="w-14 shrink-0 text-xs text-slate-500">
                      {ev.allDay ? '終日' : format(new Date(ev.startAt), 'HH:mm')}
                    </span>
                    <span className="truncate text-sm text-slate-400">{ev.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-slate-600">Google</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 習慣チェック */}
          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">習慣</h2>
            <ul className="space-y-2">
              {habitLayers.map((layer) => {
                const entry = habitOf(layer.id)
                const achieved = entry ? isAchieved(entry) : false
                const kind = layer.config.habitKind ?? 'bool'
                const streak = calcStreak(
                  data.habitEntries.filter((e) => e.layerId === layer.id),
                  date,
                )
                return (
                  <li key={layer.id} className="flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2">
                    <button
                      onClick={() => toggleHabit(layer)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition ${
                        achieved ? 'text-white' : 'border-slate-600 text-transparent'
                      }`}
                      style={achieved ? { backgroundColor: layer.color, borderColor: layer.color } : {}}
                      aria-label={`${layer.name}を切り替え`}
                    >
                      ✓
                    </button>
                    <span className="flex-1 text-sm text-slate-200">{layer.name}</span>
                    {kind === 'number' && (
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={entry?.valueNum ?? ''}
                          placeholder="0"
                          onChange={(e) => setHabitNum(layer, Number(e.target.value))}
                          className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-sm text-slate-200"
                        />
                        <span className="text-xs text-slate-500">{layer.config.habitUnit}</span>
                      </span>
                    )}
                    {streak > 0 && (
                      <span className="text-xs text-slate-500" title="連続日数">
                        🔥{streak}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ログ */}
          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">記録</h2>
            <ul className="space-y-2">
              {dayLogs.map((entry) => {
                const layer = logLayers.find((l) => l.id === entry.layerId)
                if (!layer) return null
                return (
                  <li key={entry.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: layer.color }}
                      >
                        {layer.name}
                      </span>
                      {entry.time && <span className="text-xs text-slate-500">{entry.time}</span>}
                      <span className="ml-auto flex gap-2">
                        <button onClick={() => setEditingLog(entry)} className="text-xs text-sky-400">
                          編集
                        </button>
                        <button onClick={() => deleteLog(entry)} className="text-xs text-rose-400">
                          削除
                        </button>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      {(layer.config.fields ?? [])
                        .map((f) => entry.data[f.key])
                        .filter((v) => v !== undefined && v !== '')
                        .join(' / ')}
                    </p>
                    {entry.note && <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>}
                  </li>
                )
              })}
            </ul>
            {/* 追加ボタン: ログレイヤー+予定をひとまとめに */}
            <div className="mt-3 flex flex-wrap gap-2">
              {logLayers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setAddingLayer(l)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white active:opacity-80"
                  style={{ backgroundColor: l.color }}
                >
                  + {l.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setEditingEvent(null)
                  setEventFormOpen(true)
                }}
                className="rounded-full bg-yellow-500 px-3 py-1.5 text-sm font-medium text-slate-900 active:bg-yellow-400"
              >
                + 予定
              </button>
            </div>
          </section>
        </div>
      </div>

      {eventFormOpen && (
        <EventForm
          date={date}
          existing={editingEvent}
          onClose={() => {
            setEventFormOpen(false)
            setEditingEvent(null)
          }}
          onSaved={() => {
            setEventFormOpen(false)
            setEditingEvent(null)
            data.reload()
          }}
        />
      )}

      {(editingLog || addingLayer) && (
        <LogEntryForm
          date={date}
          layer={
            editingLog
              ? logLayers.find((l) => l.id === editingLog.layerId)!
              : addingLayer!
          }
          existing={editingLog}
          onClose={() => {
            setEditingLog(null)
            setAddingLayer(null)
          }}
          onSaved={() => {
            setEditingLog(null)
            setAddingLayer(null)
            data.reload()
          }}
        />
      )}
    </div>
  )
}
