import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppData } from '../useAppData'
import { newId, repo } from '../useAppData'
import type { Todo } from '../types'
import { isOverdue, sortTodos } from '../lib/todos'
import { toDateStr, todayStr } from '../lib/dates'

interface Props {
  data: AppData
  onSelectDate: (date: string) => void
}

export default function TodoView({ data, onSelectDate }: Props) {
  const [title, setTitle] = useState('')
  const [showDone, setShowDone] = useState(false)
  const today = todayStr()

  const sorted = useMemo(() => sortTodos(data.todos), [data.todos])
  const undone = sorted.filter((t) => !t.done)
  const done = sorted.filter((t) => t.done)

  // 期日の候補: なし / 今日 / 明日 / 1週間後 …(あとから個別に変更できる)
  const dueOptions = useMemo(() => {
    const base = new Date(today + 'T00:00:00')
    return [
      { label: '期日なし', value: '' },
      { label: '今日', value: today },
      { label: '明日', value: toDateStr(addDays(base, 1)) },
      { label: '今週末', value: toDateStr(addDays(base, 6 - base.getDay())) },
      { label: '来週', value: toDateStr(addDays(base, 7)) },
    ]
  }, [today])

  async function add() {
    const t = title.trim()
    if (!t) return
    const maxOrder = Math.max(0, ...data.todos.map((x) => x.sortOrder))
    await repo.saveTodo({
      id: newId(),
      title: t,
      note: '',
      dueDate: '',
      done: false,
      sortOrder: maxOrder + 1,
    })
    setTitle('')
    data.reload()
  }

  async function toggleDone(todo: Todo) {
    await repo.saveTodo({ ...todo, done: !todo.done })
    data.reload()
  }

  async function setDue(todo: Todo, dueDate: string) {
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
    return (
      <li key={todo.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleDone(todo)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
              todo.done
                ? 'border-sky-500 bg-sky-500 text-white'
                : 'border-slate-600 text-transparent'
            }`}
            aria-label={`${todo.title}を完了に切り替え`}
          >
            ✓
          </button>
          <span
            className={`flex-1 text-sm ${todo.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}
          >
            {todo.title}
          </span>
          <button onClick={() => remove(todo)} className="shrink-0 text-xs text-rose-400">
            削除
          </button>
        </div>

        {!todo.done && (
          <div className="mt-1.5 flex items-center gap-2 pl-10">
            <select
              value={todo.dueDate}
              onChange={(e) => setDue(todo, e.target.value)}
              className={`rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs ${
                overdue ? 'text-rose-400' : todo.dueDate ? 'text-sky-300' : 'text-slate-500'
              }`}
              aria-label="期日"
            >
              {/* 既存の期日が候補にない場合も選択肢に出す */}
              {!dueOptions.some((o) => o.value === todo.dueDate) && todo.dueDate && (
                <option value={todo.dueDate}>
                  {format(new Date(todo.dueDate + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                </option>
              )}
              {dueOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {todo.dueDate && (
              <button
                onClick={() => onSelectDate(todo.dueDate)}
                className={`text-xs ${overdue ? 'text-rose-400' : 'text-slate-400'}`}
              >
                {format(new Date(todo.dueDate + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                {overdue ? ' (期限切れ)' : ''}
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
