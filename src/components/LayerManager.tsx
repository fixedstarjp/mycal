import { useState } from 'react'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { FieldDef, FieldType, Layer } from '../types'
import BottomModal from './BottomModal'

const PALETTE = ['#f97316', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#ef4444']

export default function LayerManager({ data }: { data: AppData }) {
  const [editing, setEditing] = useState<Layer | null>(null)

  async function toggleVisible(layer: Layer) {
    await repo.saveLayer({ ...layer, visible: !layer.visible })
    data.reload()
  }

  async function toggleArchive(layer: Layer) {
    await repo.saveLayer({ ...layer, archived: !layer.archived })
    data.reload()
  }

  function addNew(type: 'habit' | 'log') {
    const maxOrder = Math.max(0, ...data.layers.map((l) => l.sortOrder))
    setEditing({
      id: newId(),
      name: '',
      type,
      color: PALETTE[data.layers.length % PALETTE.length],
      config: type === 'habit' ? { habitKind: 'bool' } : { fields: [] },
      sortOrder: maxOrder + 1,
      archived: false,
      visible: true,
    })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="text-lg font-bold text-slate-100">レイヤー管理</h1>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-24">
        {data.layers.map((layer) => (
          <div key={layer.id} className={`rounded-xl bg-slate-800/60 px-3 py-2 ${layer.archived ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: layer.color }} />
              <span className="text-sm font-medium text-slate-200">{layer.name}</span>
              <span className="rounded bg-slate-700 px-1.5 text-[10px] text-slate-400">
                {layer.type === 'habit' ? '習慣' : 'ログ'}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => toggleVisible(layer)}
                  className={`text-xs ${layer.visible ? 'text-sky-400' : 'text-slate-600'}`}
                  title="月ビューでの表示ON/OFF"
                >
                  {layer.visible ? '表示中' : '非表示'}
                </button>
                <button onClick={() => setEditing(layer)} className="text-xs text-slate-400">
                  編集
                </button>
                <button onClick={() => toggleArchive(layer)} className="text-xs text-slate-500">
                  {layer.archived ? '復元' : 'アーカイブ'}
                </button>
              </span>
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => addNew('habit')}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-300 active:bg-slate-700"
          >
            + 習慣レイヤー
          </button>
          <button
            onClick={() => addNew('log')}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-300 active:bg-slate-700"
          >
            + ログレイヤー
          </button>
        </div>
      </div>

      {editing && (
        <LayerEditForm
          layer={editing}
          isNew={!data.layers.some((l) => l.id === editing.id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            data.reload()
          }}
        />
      )}
    </div>
  )
}

function LayerEditForm({
  layer,
  isNew,
  onClose,
  onSaved,
}: {
  layer: Layer
  isNew: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(layer.name)
  const [color, setColor] = useState(layer.color)
  const [habitKind, setHabitKind] = useState(layer.config.habitKind ?? 'bool')
  const [habitUnit, setHabitUnit] = useState(layer.config.habitUnit ?? '')
  const [fields, setFields] = useState<FieldDef[]>(layer.config.fields ?? [])
  const [error, setError] = useState('')

  function updateField(i: number, patch: Partial<FieldDef>) {
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  }

  function addField() {
    setFields((fs) => [...fs, { key: `field_${fs.length + 1}`, label: '', type: 'text' }])
  }

  async function submit() {
    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }
    if (layer.type === 'log' && fields.some((f) => !f.label.trim())) {
      setError('フィールド名を入力してください')
      return
    }
    await repo.saveLayer({
      ...layer,
      name: name.trim(),
      color,
      config:
        layer.type === 'habit'
          ? { habitKind, habitUnit: habitUnit || undefined }
          : {
              // hideNote等の既存設定は編集フォームで触らないため引き継ぐ
              ...layer.config,
              fields: fields.map((f) => ({
                ...f,
                options:
                  f.type === 'select' || f.type === 'multiselect' ? (f.options ?? []) : undefined,
              })),
            },
    })
    onSaved()
  }

  return (
    <BottomModal
      title={`${isNew ? 'レイヤー追加' : 'レイヤー編集'}(${layer.type === 'habit' ? '習慣型' : 'ログ型'})`}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">名前</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs text-slate-500">色</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {layer.type === 'habit' ? (
            <div className="space-y-2">
              <span className="block text-xs text-slate-500">記録タイプ</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHabitKind('bool')}
                  className={`flex-1 rounded-lg py-2 text-sm ${habitKind === 'bool' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  やった/やらない
                </button>
                <button
                  onClick={() => setHabitKind('number')}
                  className={`flex-1 rounded-lg py-2 text-sm ${habitKind === 'number' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  数値
                </button>
              </div>
              {habitKind === 'number' && (
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">単位(分、セット等)</span>
                  <input
                    value={habitUnit}
                    onChange={(e) => setHabitUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-xs text-slate-500">フィールド定義</span>
              {fields.map((f, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-slate-800 p-2">
                  <div className="flex gap-2">
                    <input
                      value={f.label}
                      placeholder="フィールド名"
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    />
                    <select
                      value={f.type}
                      onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    >
                      <option value="text">テキスト</option>
                      <option value="textarea">長文</option>
                      <option value="number">数値</option>
                      <option value="select">選択肢(1つ)</option>
                      <option value="multiselect">選択肢(複数)</option>
                    </select>
                    <button
                      onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                      className="text-xs text-rose-400"
                    >
                      削除
                    </button>
                  </div>
                  {(f.type === 'select' || f.type === 'multiselect') && (
                    <input
                      value={(f.options ?? []).join(',')}
                      placeholder="選択肢をカンマ区切りで(例: 朝,昼,夜)"
                      onChange={(e) =>
                        updateField(i, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    />
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={f.required ?? false}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                    />
                    必須
                  </label>
                </div>
              ))}
              <button onClick={addField} className="text-sm text-sky-400">
                + フィールド追加
              </button>
            </div>
          )}
    </BottomModal>
  )
}
