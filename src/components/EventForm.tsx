import { useState } from 'react'
import type { AppEvent } from '../types'
import { newId, repo } from '../useAppData'
import { addOneHour } from '../lib/dates'

// 予定に付けられる絵文字プリセット。自由入力も可
const ICON_PRESETS = ['📌', '💼', '🍽️', '🏥', '✈️', '🎂', '🎉', '🏃', '📞', '🎬', '📚', '💇']

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// iOSのtime inputはstep(5分刻み)を無視するため、時・分のセレクトで入力する
function TimeSelect({
  value,
  onChange,
  disabled = false,
  emptyLabel,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  emptyLabel: string
}) {
  const [h, m] = value ? value.split(':') : ['', '']
  // 既存データが5分刻み以外でも選択肢に出す
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES
  const cls =
    'rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-200 disabled:opacity-40'
  return (
    <span className="flex items-center gap-1">
      <select
        value={h}
        disabled={disabled}
        onChange={(e) => {
          const nh = e.target.value
          onChange(nh === '' ? '' : `${nh}:${m || '00'}`)
        }}
        className={cls}
      >
        <option value="">{emptyLabel}</option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span className="text-slate-500">:</span>
      <select
        value={m}
        disabled={disabled || h === ''}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className={cls}
      >
        {h === '' && <option value="">--</option>}
        {minutes.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </span>
  )
}

interface Props {
  date: string
  existing: AppEvent | null
  onClose: () => void
  onSaved: () => void
}

export default function EventForm({ date, existing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '')
  const [time, setTime] = useState(existing?.time ?? '')
  const [endTime, setEndTime] = useState(existing?.endTime ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')

  async function submit() {
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    if (time && endTime && endTime < time) {
      setError('終了時刻は開始時刻より後にしてください')
      return
    }
    await repo.saveEvent({
      id: existing?.id ?? newId(),
      date,
      time,
      endTime: time ? endTime : '',
      title: title.trim(),
      icon,
      note,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-900 p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-bold text-slate-100">
          {existing ? '予定を編集' : '予定を追加'}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              タイトル<span className="text-rose-400"> *</span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 歯医者"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs text-slate-500">アイコン(任意)</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIcon('')}
                className={`rounded-lg px-2.5 py-1.5 text-sm ${
                  icon === '' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                なし
              </button>
              {ICON_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`rounded-lg px-2 py-1 text-lg ${
                    icon === emoji ? 'bg-sky-600' : 'bg-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                value={ICON_PRESETS.includes(icon) ? '' : icon}
                onChange={(e) => setIcon(e.target.value.trim())}
                placeholder="他の絵文字"
                maxLength={4}
                className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-center text-sm text-slate-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <span className="mb-1 block text-xs text-slate-500">開始(未設定=終日)</span>
              <TimeSelect
                value={time}
                emptyLabel="--"
                onChange={(v) => {
                  setTime(v)
                  // 終了は開始の1時間後をデフォルトにする(未入力or前回の自動値のときだけ上書き)
                  if (v === '') {
                    setEndTime('')
                  } else if (!endTime || (time && endTime === addOneHour(time))) {
                    setEndTime(addOneHour(v))
                  }
                }}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-slate-500">終了</span>
              <TimeSelect
                value={endTime}
                emptyLabel="--"
                disabled={!time}
                onChange={setEndTime}
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">メモ(任意)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-300 active:bg-slate-700"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-bold text-white active:bg-sky-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
