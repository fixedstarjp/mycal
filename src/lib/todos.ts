import type { Todo } from '../types'

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
