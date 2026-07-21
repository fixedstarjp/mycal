import { useState } from 'react'
import type { AppEvent } from '../types'
import { newId, repo } from '../useAppData'
import { addOneHour } from '../lib/dates'
import { getIconPresets } from '../lib/iconPresets'
import BottomModal from './BottomModal'
import TimeSelect from './TimeSelect'

interface Props {
  date: string
  existing: AppEvent | null
  onClose: () => void
  onSaved: () => void
}

export default function EventForm({ date, existing, onClose, onSaved }: Props) {
  // アイコンプリセットは設定画面で編集できる(開いた時点の内容を使う)
  const [iconPresets] = useState(() => getIconPresets())
  const [title, setTitle] = useState(existing?.title ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '')
  const [time, setTime] = useState(existing?.time ?? '')
  const [endTime, setEndTime] = useState(existing?.endTime ?? '')
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')

  async function submit() {
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    if (endDate && endDate < date) {
      setError('終了日は開始日以降にしてください')
      return
    }
    const singleDay = !endDate || endDate === date
    if (singleDay && time && endTime && endTime < time) {
      setError('終了時刻は開始時刻より後にしてください')
      return
    }
    await repo.saveEvent({
      id: existing?.id ?? newId(),
      date,
      endDate: singleDay ? '' : endDate,
      time,
      endTime: time ? endTime : '',
      title: title.trim(),
      icon,
      note,
    })
    onSaved()
  }

  return (
    <BottomModal
      title={existing ? '予定を編集' : '予定を追加'}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">
          タイトル<span className="text-rose-400"> *</span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 歯医者"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base text-slate-200"
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
          {iconPresets.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`rounded-lg px-2 py-1 text-lg ${icon === emoji ? 'bg-sky-600' : 'bg-slate-800'}`}
            >
              {emoji}
            </button>
          ))}
          <input
            value={iconPresets.includes(icon) ? '' : icon}
            onChange={(e) => setIcon(e.target.value.trim())}
            placeholder="他の絵文字"
            maxLength={4}
            className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-center text-sm text-slate-200"
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-600">プリセットは 設定 → 予定アイコン で編集できます</p>
      </div>

      {/* 時刻: スマホではみ出さないよう「開始」「終了」を縦に並べる */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-slate-500">開始(--=終日)</span>
          <TimeSelect
            value={time}
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
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-slate-500">終了時刻</span>
          <TimeSelect value={endTime} disabled={!time} onChange={setEndTime} />
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">終了日(日付をまたぐ予定のみ)</span>
        <input
          type="date"
          value={endDate}
          min={date}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base text-slate-200"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">メモ(任意)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base text-slate-200"
        />
      </label>
    </BottomModal>
  )
}
