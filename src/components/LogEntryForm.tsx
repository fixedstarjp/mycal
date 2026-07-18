import { useState } from 'react'
import type { Layer, LogEntry } from '../types'
import { newId, repo } from '../useAppData'

interface Props {
  date: string
  layer: Layer
  existing: LogEntry | null
  onClose: () => void
  onSaved: () => void
}

export default function LogEntryForm({ date, layer, existing, onClose, onSaved }: Props) {
  const fields = layer.config.fields ?? []
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      const v = existing?.data[f.key]
      init[f.key] = v !== undefined ? String(v) : (f.type === 'select' ? (f.options?.[0] ?? '') : '')
    }
    return init
  })
  const [time, setTime] = useState(existing?.time ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')

  async function submit() {
    for (const f of fields) {
      if (f.required && !values[f.key]) {
        setError(`「${f.label}」を入力してください`)
        return
      }
      if (f.type === 'number' && values[f.key] !== '' && isNaN(Number(values[f.key]))) {
        setError(`「${f.label}」は数値で入力してください`)
        return
      }
    }
    const dataObj: Record<string, string | number> = {}
    for (const f of fields) {
      if (values[f.key] === '') continue
      dataObj[f.key] = f.type === 'number' ? Number(values[f.key]) : values[f.key]
    }
    await repo.saveLogEntry({
      id: existing?.id ?? newId(),
      layerId: layer.id,
      date,
      time,
      data: dataObj,
      note,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-slate-900 p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-100">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: layer.color }} />
          {layer.name} {existing ? '編集' : '追加'}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">時刻(任意)</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>

          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs text-slate-500">
                {f.label}
                {f.required && <span className="text-rose-400"> *</span>}
              </span>
              {f.type === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {(f.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, [f.key]: opt }))}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        values[f.key] === opt
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  inputMode={f.type === 'number' ? 'decimal' : undefined}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                />
              )}
            </label>
          ))}

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
