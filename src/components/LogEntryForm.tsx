import { useState } from 'react'
import type { Layer, LogEntry } from '../types'
import { newId, repo } from '../useAppData'
import BottomModal from './BottomModal'
import TimeSelect from './TimeSelect'

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
      if (f.type === 'multiselect') {
        // 選択肢に含まれるものだけチップ選択に、残りは「その他」欄へ
        const list = v !== undefined ? String(v).split(',') : []
        init[f.key] = list.filter((o) => f.options?.includes(o)).join(',')
      } else {
        init[f.key] = v !== undefined ? String(v) : f.type === 'select' ? (f.options?.[0] ?? '') : ''
      }
    }
    return init
  })
  // multiselectの「その他」自由入力(カンマ区切りで複数可)
  const [others, setOthers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      if (f.type !== 'multiselect') continue
      const v = existing?.data[f.key]
      const list = v !== undefined ? String(v).split(',') : []
      init[f.key] = list.filter((o) => !f.options?.includes(o)).join(',')
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

  // チップ選択+その他入力を結合した最終値
  function finalValue(f: (typeof fields)[number]): string {
    if (f.type !== 'multiselect') return values[f.key]
    const chips = values[f.key] ? values[f.key].split(',') : []
    const free = (others[f.key] ?? '')
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    return [...chips, ...free].join(',')
  }

  async function submit() {
    for (const f of fields) {
      if (f.required && !finalValue(f)) {
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
      const v = finalValue(f)
      if (v === '') continue
      dataObj[f.key] = f.type === 'number' ? Number(v) : v
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
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-xs text-slate-500">時刻(任意)</span>
        <TimeSelect value={time} onChange={setTime} />
      </div>

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
            <div>
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
              <input
                value={others[f.key] ?? ''}
                onChange={(e) => setOthers((o) => ({ ...o, [f.key]: e.target.value }))}
                placeholder="その他(自由入力、カンマ区切りで複数)"
                className={`${INPUT} mt-2`}
              />
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
