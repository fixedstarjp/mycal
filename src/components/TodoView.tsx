import { useMemo, useState } from 'react'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { Todo } from '../types'
import { dueChips, formatDue, isOverdue, sortTodos } from '../lib/todos'
import { todayStr } from '../lib/dates'

export default function TodoView({ data }: { data: AppData }) {
  const [title, setTitle] = useState('')
  const [showDone, setShowDone] = useState(false)
  // 期日ピッカーを開いているToDoのid、および「その他(カレンダー)」入力中のid
  const [editingDueId, setEditingDueId] = useState<string | null>(null)
  const [otherDueId, setOtherDueId] = useState<string | null>(null)
  const today = todayStr()
  const chips = useMemo(() => dueChips(today), [today])

  const sorted = useMemo(() => sortTodos(data.todos), [data.todos])
  const undone = sorted.filter((t) => !t.done)
  const done = sorted.filter((t) => t.done)

  async function add() {
    const t = title.trim()
    if (!t) return
    const maxOrder = Math.max(0, ...data.todos.map((x) => x.sortOrder))
    await repo.saveTodo({ id: newId(), title: t, note: '', dueDate: '', done: false, sortOrder: maxOrder + 1 })
    setTitle('')
    data.reload()
  }

  async function toggleDone(todo: Todo) {
    await repo.saveTodo({ ...todo, done: !todo.done })
    data.reload()
  }

  async function setDue(todo: Todo, dueDate: string) {
    setEditingDueId(null)
    setOtherDueId(null)
    await repo.saveTodo({ ...todo, dueDate })
    data.reload()
  }

  async function remove(todo: Todo) {
    if (!confirm(`「${todo.title}」を削除しますか?`)) return
    await repo.deleteTodo(todo.id)
    data.reload()
  }

  function row(todo: Todo) {
    const overdue = isOverdue(todo, today)
    const editing = editingDueId === todo.id
    return (
      <li key={todo.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleDone(todo)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
              todo.done ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-600 text-transparent'
            }`}
            aria-label={`${todo.title}を完了に切り替え`}
          >
            ✓
          </button>
          <span className={`flex-1 text-sm ${todo.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
            {todo.title}
          </span>
          {!todo.done && (
            <button
              onClick={() => {
                setEditingDueId(editing ? null : todo.id)
                setOtherDueId(null)
              }}
              className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                overdue
                  ? 'bg-rose-900/60 text-rose-300'
                  : todo.dueDate
                    ? 'bg-slate-700 text-sky-300'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              📅 {formatDue(todo.dueDate)}
              {overdue ? '・期限切れ' : ''}
            </button>
          )}
          <button onClick={() => remove(todo)} className="shrink-0 text-xs text-rose-400">
            削除
          </button>
        </div>

        {/* 期日ピッカー: 7日間チップ + なし + その他(カレンダー) */}
        {editing && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
            {chips.map((c) => (
              <button
                key={c.value}
                onClick={() => setDue(todo, c.value)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  todo.dueDate === c.value ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={() => setDue(todo, '')}
              className={`rounded-full px-3 py-1.5 text-sm ${
                todo.dueDate === '' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              なし
            </button>
            {otherDueId === todo.id ? (
              <input
                type="date"
                defaultValue={todo.dueDate || undefined}
                autoFocus
                onChange={(e) => e.target.value && setDue(todo, e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              />
            ) : (
              <button
                onClick={() => setOtherDueId(todo.id)}
                className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-400"
              >
                その他
              </button>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="mb-2 text-lg font-bold text-slate-100">ToDo</h1>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            placeholder="やること・メモを入力"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-slate-200"
          />
          <button
            onClick={add}
            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white active:bg-sky-500"
          >
            追加
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-24">
        <section>
          {undone.length === 0 ? (
            <p className="text-sm text-slate-600">やることはありません</p>
          ) : (
            <ul className="space-y-2">{undone.map(row)}</ul>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="mb-2 text-xs font-semibold tracking-wide text-slate-500"
            >
              完了 {done.length}件 {showDone ? '▲' : '▼'}
            </button>
            {showDone && <ul className="space-y-2">{done.map(row)}</ul>}
          </section>
        )}
      </div>
    </div>
  )
}
