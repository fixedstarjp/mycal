import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { HabitEntry, Layer, LogEntry } from '../types'
import { calcStreak, isAchieved } from '../lib/stats'
import { toDateStr } from '../lib/dates'
import LogEntryForm from './LogEntryForm'

interface Props {
  date: string
  data: AppData
  onBack: () => void
}

export default function DayDetail({ date, data, onBack }: Props) {
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [addingLayer, setAddingLayer] = useState<Layer | null>(null)

  const d = new Date(date + 'T00:00:00')
  const layers = data.layers.filter((l) => !l.archived)
  const habitLayers = layers.filter((l) => l.type === 'habit')
  const logLayers = layers.filter((l) => l.type === 'log')

  const events = data.gcalEvents
    .filter((ev) => (ev.allDay ? ev.startAt.slice(0, 10) : toDateStr(new Date(ev.startAt))) === date)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
          aria-label="戻る"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold text-slate-100">
          {format(d, 'M月d日(E)', { locale: ja })}
        </h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24">
        {/* Google予定(読み取り専用) */}
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500">予定 (Google)</h2>
          {events.length === 0 ? (
            <p className="text-sm text-slate-600">予定なし</p>
          ) : (
            <ul className="space-y-1.5">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
                  <span className="w-14 shrink-0 text-xs text-slate-500">
                    {ev.allDay ? '終日' : format(new Date(ev.startAt), 'HH:mm')}
                  </span>
                  <span className="truncate text-sm text-slate-300">{ev.title}</span>
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
          </div>
        </section>
      </div>

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
