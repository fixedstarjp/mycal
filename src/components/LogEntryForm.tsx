import { useEffect, useMemo, useState } from 'react'
import type { FieldDef, Layer, LogEntry } from '../types'
import { newId, repo } from '../useAppData'
import { optionFrequency, orderOptions, splitData } from '../lib/logTemplates'
import { roundTime5 } from '../lib/dates'
import BottomModal from './BottomModal'
import TimeSelect from './TimeSelect'

interface Props {
  date: string
  layer: Layer
  existing: LogEntry | null
  onClose: () => void
  onSaved: () => void
}

const INPUT = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base text-slate-200'
// 食材などのチップは数が多いので小さめ
const CHIP = 'rounded-full px-2.5 py-1 text-sm'

export default function LogEntryForm({ date, layer, existing, onClose, onSaved }: Props) {
  const fields = layer.config.fields ?? []
  const hideNote = layer.config.hideNote ?? false
  // 時間帯などの単一選択フィールド(先頭のselect)を「文脈」として頻度集計に使う
  const slotKey = fields.find((f) => f.type === 'select')?.key ?? null
  const contentKey = fields.find((f) => f.type === 'multiselect')?.key ?? null

  const initial = splitData(fields, existing?.data)
  const [values, setValues] = useState<Record<string, string>>(initial.values)
  const [others, setOthers] = useState<Record<string, string>>(initial.others)
  const [time, setTime] = useState(existing ? existing.time : roundTime5())
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<LogEntry[]>([])

  // 過去の記録を読み込み、時間帯ごとの「よく食べる」頻度を集計する
  useEffect(() => {
    let cancelled = false
    repo.getRecentLogEntries(layer.id, 300).then((rows) => {
      if (!cancelled) setRecent(rows)
    })
    return () => {
      cancelled = true
    }
  }, [layer.id])

  const freqBySlot = useMemo(() => {
    if (!contentKey) return null
    return optionFrequency(recent, contentKey, slotKey)
  }, [recent, contentKey, slotKey])

  // 現在の時間帯でよく食べる順に並べた選択肢
  function orderedOptions(f: FieldDef): string[] {
    const opts = f.options ?? []
    if (f.type !== 'multiselect' || !freqBySlot) return opts
    const slot = slotKey ? values[slotKey] : ''
    return orderOptions(opts, freqBySlot[slot ?? ''])
  }

  function toggleMulti(key: string, opt: string) {
    setValues((v) => {
      const cur = v[key] ? v[key].split(',') : []
      const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]
      return { ...v, [key]: next.join(',') }
    })
  }

  // その他の自由入力を項目配列に
  function freeItems(key: string): string[] {
    return (others[key] ?? '')
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function finalValue(f: FieldDef): string {
    if (f.type !== 'multiselect') return values[f.key]
    const chips = values[f.key] ? values[f.key].split(',') : []
    return [...chips, ...freeItems(f.key)].join(',')
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

    // 「その他」で入れた新しい食材を選択肢に自動登録する
    let newFields = fields
    let changed = false
    for (const f of fields) {
      if (f.type !== 'multiselect') continue
      const opts = f.options ?? []
      const added = freeItems(f.key).filter((x) => !opts.includes(x))
      if (added.length > 0) {
        newFields = newFields.map((nf) => (nf.key === f.key ? { ...nf, options: [...opts, ...added] } : nf))
        changed = true
      }
    }
    if (changed) {
      await repo.saveLayer({ ...layer, config: { ...layer.config, fields: newFields } })
    }

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
                  className={`${CHIP} ${
                    values[f.key] === opt ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : f.type === 'multiselect' ? (
            <div>
              <div className="flex flex-wrap gap-1.5">
                {orderedOptions(f).map((opt) => {
                  const selected = (values[f.key] ? values[f.key].split(',') : []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMulti(f.key, opt)}
                      className={`${CHIP} ${
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
                placeholder="その他(新しい食材は自動で選択肢に追加)"
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
