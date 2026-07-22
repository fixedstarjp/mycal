import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { AppEvent, HabitEntry, Layer, LogEntry } from '../types'
import { calcStreak, isAchieved } from '../lib/stats'
import { toDateStr } from '../lib/dates'
import { getHolidayName } from '../lib/holidays'
import { eventEndDate, eventOccursOn } from '../lib/events'
import { POP6_LABELS, weatherEmoji, type TempsByDate } from '../lib/weather'
import { useBottomSheet } from '../hooks/useBottomSheet'
import LogEntryForm from './LogEntryForm'
import EventForm from './EventForm'

interface Props {
  date: string
  data: AppData
  temps: TempsByDate
  onBack: () => void
  onChangeDate: (date: string) => void
}

// ボトムシート表示: 下から上にスライドして開き、
// 上から下へのフリック(または背景タップ・▼ボタン)で閉じる。
// 横フリックで前日/翌日に移動
export default function DayDetail({ date, data, temps, onBack, onChangeDate }: Props) {
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [addingLayer, setAddingLayer] = useState<Layer | null>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null)

  // 直近の日送り方向(コンテンツのスライドインに使う)
  const [slideDir, setSlideDir] = useState<0 | 1 | -1>(0)

  // シートの開閉・下フリックで閉じる・横フリックで前日/翌日
  const sheet = useBottomSheet({
    onClose: onBack,
    onSwipeHorizontal: (dir) => {
      setSlideDir(dir)
      const next = addDays(new Date(date + 'T00:00:00'), dir)
      onChangeDate(toDateStr(next))
    },
  })

  const d = new Date(date + 'T00:00:00')
  const layers = data.layers.filter((l) => !l.archived)
  const habitLayers = layers.filter((l) => l.type === 'habit')
  const logLayers = layers.filter((l) => l.type === 'log')

  const events = data.gcalEvents
    .filter((ev) => (ev.allDay ? ev.startAt.slice(0, 10) : toDateStr(new Date(ev.startAt))) === date)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  // 終日('')が先、あとは時刻順。複数日予定は期間内のすべての日に表示
  const dayEvents = data.events
    .filter((e) => eventOccursOn(e, date))
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

  // メニュー(A/Bセット等)の選択。選んだメニュー名はnoteに保存する。
  // 同じメニューを再タップすると解除(その日の記録を未達成に戻す)
  async function selectMenu(layer: Layer, menuName: string) {
    const cur = habitOf(layer.id)
    const kind = layer.config.habitKind ?? 'bool'
    const isSame = cur?.note === menuName && cur && isAchieved(cur)
    await repo.upsertHabitEntry({
      id: cur?.id ?? newId(),
      layerId: layer.id,
      date,
      valueBool: kind === 'bool' ? !isSame : null,
      valueNum: kind === 'number' ? (isSame ? 0 : (cur?.valueNum || 1)) : null,
      note: isSame ? '' : menuName,
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

  return (
    <div className="fixed inset-0 z-40">
      {/* 背景: タップで閉じる */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-250 ${sheet.open ? 'opacity-100' : 'opacity-0'}`}
        onClick={sheet.close}
      />

      <div
        className="absolute inset-x-0 bottom-0 top-10 mx-auto flex max-w-3xl flex-col rounded-t-2xl bg-slate-900 shadow-2xl"
        style={sheet.sheetStyle}
        {...sheet.sheetHandlers}
      >
        {/* ドラッグハンドル */}
        <div className="flex shrink-0 justify-center pb-1 pt-2">
          <span className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <header className="flex shrink-0 items-center gap-3 px-4 pb-2">
          <h1 className="text-lg font-bold text-slate-100">
            {format(d, 'M月d日(E)', { locale: ja })}
          </h1>
          {getHolidayName(d) && <span className="text-sm text-rose-400">{getHolidayName(d)}</span>}
          {temps[date] && (
            <span className="flex items-center gap-1 text-base font-medium text-slate-200">
              <span className="text-xl leading-none">{weatherEmoji(temps[date].code)}</span>
              {temps[date].max}°/{temps[date].min}°
              {temps[date].pop !== undefined && (
                <span className="text-sky-300" title="降水確率">
                  ☔{temps[date].pop}%
                </span>
              )}
            </span>
          )}
          <button
            onClick={sheet.close}
            className="ml-auto rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
            aria-label="閉じる"
          >
            ▼
          </button>
        </header>

        {/* 6時間ごとの降水確率(0-6/6-12/12-18/18-24) */}
        {temps[date]?.pops6 && (
          <div className="grid shrink-0 grid-cols-4 gap-1 px-4 pb-2">
            {temps[date].pops6!.map((p, i) => (
              <div key={POP6_LABELS[i]} className="rounded-lg bg-slate-800/60 py-1 text-center">
                <div className="text-[10px] leading-4 text-slate-500">{POP6_LABELS[i]}時</div>
                <div className="text-sm leading-4 text-sky-300">{p === null ? '—' : `${p}%`}</div>
              </div>
            ))}
          </div>
        )}

        <div
          key={date}
          ref={sheet.scrollRef}
          className={`flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pb-10 ${
            slideDir === 1 ? 'slide-in-rtl' : slideDir === -1 ? 'slide-in-ltr' : ''
          }`}
        >
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
                      {ev.endDate && ev.endDate !== ev.date && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({format(new Date(ev.date + 'T00:00:00'), 'M/d')}〜
                          {format(new Date(eventEndDate(ev) + 'T00:00:00'), 'M/d')})
                        </span>
                      )}
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
                const menus = layer.config.menus ?? []
                const selectedMenu = menus.find((m) => m.name === entry?.note && achieved)
                return (
                  <li key={layer.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-3">
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
                    </div>

                    {/* メニュー(A/Bセット等)。タップでそのメニューを記録、再タップで解除 */}
                    {menus.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {menus.map((m) => {
                          const on = entry?.note === m.name && achieved
                          return (
                            <button
                              key={m.name}
                              onClick={() => selectMenu(layer, m.name)}
                              className={`rounded-full px-3 py-1.5 text-sm ${
                                on ? 'text-white' : 'bg-slate-800 text-slate-400'
                              }`}
                              style={on ? { backgroundColor: layer.color } : {}}
                              title={m.items.join('・')}
                            >
                              {m.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedMenu && selectedMenu.items.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">{selectedMenu.items.join('・')}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ログ: レイヤーごとに見出しを分けて表示(食事記録・日記・株の売買が混ざらないように) */}
          {logLayers.map((layer) => {
            const entries = dayLogs.filter((e) => e.layerId === layer.id)
            if (entries.length === 0) return null
            return (
              <section key={layer.id}>
                <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: layer.color }} />
                  {layer.name}
                </h2>
                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
                      <div className="flex items-center gap-2">
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
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                        {(layer.config.fields ?? [])
                          .map((f) => entry.data[f.key])
                          .filter((v) => v !== undefined && v !== '')
                          .join(' / ')}
                      </p>
                      {entry.note && <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">追加</h2>
            {/* 追加ボタン: ログレイヤー+予定をひとまとめに */}
            <div className="flex flex-wrap gap-2">
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
