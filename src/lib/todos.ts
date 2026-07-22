import { addDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Todo } from '../types'
import { toDateStr } from './dates'

// 期日チップの選択肢: 今日から7日間。今日/明日はラベル、以降は「d(E)」
export function dueChips(today: string): { label: string; value: string }[] {
  const base = new Date(today + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(base, i)
    const label = i === 0 ? '今日' : i === 1 ? '明日' : format(d, 'd(E)', { locale: ja })
    return { label, value: toDateStr(d) }
  })
}

// 期日の表示("7/24(金)"形式)。'' は '期日なし'
export function formatDue(date: string): string {
  if (!date) return '期日なし'
  return format(new Date(date + 'T00:00:00'), 'M/d(E)', { locale: ja })
}

// 表示順:
//   未完了 → 完了 の順。
//   未完了の中では「期日あり(日付の早い順)」→「期日なし(新しい順)」。
//   完了は新しい順(sortOrder降順)。
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.done) {
      const aHas = a.dueDate !== ''
      const bHas = b.dueDate !== ''
      if (aHas !== bHas) return aHas ? -1 : 1
      if (aHas && bHas && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    }
    return b.sortOrder - a.sortOrder
  })
}

// その日に表示すべきToDo(期日が一致するもの)
export function todosOnDate(todos: Todo[], date: string): Todo[] {
  return sortTodos(todos.filter((t) => t.dueDate === date))
}

// 未完了かつ期日が過ぎているか(今日より前)
export function isOverdue(todo: Todo, today: string): boolean {
  return !todo.done && todo.dueDate !== '' && todo.dueDate < today
}
