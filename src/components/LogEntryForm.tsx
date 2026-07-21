import { useState } from 'react'
import type { Layer, LogEntry } from '../types'
import { newId, repo } from '../useAppData'
import BottomModal from './BottomModal'

interface Props {
  date: string
  layer: Layer
  existing: LogEntry | null
  onClose: () => void
  onSaved: () => void
}

// 入力欄はモバイルでの押しやすさを優先して大きめ(py-3・text-base)
const INPUT = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base text-slate-200'

export default function LogEntryForm({ date, layer, existing, onClose, onSaved }: Props) {
  const fields = layer.config.fields ?? []
  const hideNote = layer.config.hideNote ?? false

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      const v = existing?.data[f.key]
      init[f.key] = v !== undefined ? String(v) : f.type === 'select' ? (f.options?.[0] ?? '') : ''
    }
    return init
  })
  const [time, setTime] = useState(existing?.time ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')

  // multiselectはカンマ区切り文字列で保持する
  function toggleMulti(key: string, opt: string) {
    setValues((v) => {
      const cur = v[key] ? v[key].split(',') : []
      const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]
      return { ...v, [key]: next.join(',') }
    })
  }

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
      note: hideNote ? '' : note,
    })
    onSaved()
  }

  return (
    <BottomModal
      title={
        <>
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: layer.color }} />
          {layer.name} {existing ? '編集' : '追加'}
        </>
      }
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">時刻(任意)</span>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} />
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
                  className={`rounded-full px-4 py-2 text-base ${
                    values[f.key] === opt ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : f.type === 'multiselect' ? (
            <div className="flex flex-wrap gap-2">
              {(f.options ?? []).map((opt) => {
                const selected = (values[f.key] ? values[f.key].split(',') : []).includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMulti(f.key, opt)}
                    className={`rounded-full px-4 py-2 text-base ${
                      selected ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : f.type === 'textarea' ? (
            <textarea
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={6}
              className={INPUT}
            />
          ) : (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={INPUT}
            />
          )}
        </label>
      ))}

      {!hideNote && (
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">メモ(任意)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={INPUT} />
        </label>
      )}
    </BottomModal>
  )
}
