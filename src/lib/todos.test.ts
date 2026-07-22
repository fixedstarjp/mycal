import { describe, expect, it } from 'vitest'
import { isOverdue, sortTodos, todosOnDate } from './todos'
import type { Todo } from '../types'

function todo(over: Partial<Todo> & { id: string }): Todo {
  return { title: over.id, note: '', dueDate: '', done: false, sortOrder: 0, ...over }
}

describe('sortTodos', () => {
  it('未完了が先、完了が後', () => {
    const list = [todo({ id: 'a', done: true }), todo({ id: 'b' })]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('未完了は期日ありが先、期日の早い順', () => {
    const list = [
      todo({ id: 'なし' }),
      todo({ id: '遅い', dueDate: '2026-08-01' }),
      todo({ id: '早い', dueDate: '2026-07-25' }),
    ]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['早い', '遅い', 'なし'])
  })

  it('期日なし同士は新しい順(sortOrder降順)', () => {
    const list = [todo({ id: '古', sortOrder: 1 }), todo({ id: '新', sortOrder: 5 })]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['新', '古'])
  })

  it('同じ期日ならsortOrder降順', () => {
    const list = [
      todo({ id: '先', dueDate: '2026-07-25', sortOrder: 1 }),
      todo({ id: '後', dueDate: '2026-07-25', sortOrder: 9 }),
    ]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['後', '先'])
  })

  it('元の配列を書き換えない', () => {
    const list = [todo({ id: 'a', done: true }), todo({ id: 'b' })]
    sortTodos(list)
    expect(list.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('todosOnDate', () => {
  it('期日が一致するものだけ返す', () => {
    const list = [
      todo({ id: 'x', dueDate: '2026-07-25' }),
      todo({ id: 'y', dueDate: '2026-07-26' }),
      todo({ id: 'z' }),
    ]
    expect(todosOnDate(list, '2026-07-25').map((t) => t.id)).toEqual(['x'])
  })

  it('期日なしはどの日にも出ない', () => {
    expect(todosOnDate([todo({ id: 'z' })], '2026-07-25')).toEqual([])
  })
})

describe('isOverdue', () => {
  it('未完了かつ期日が今日より前なら期限切れ', () => {
    expect(isOverdue(todo({ id: 'a', dueDate: '2026-07-21' }), '2026-07-22')).toBe(true)
  })

  it('今日・未来・期日なし・完了済みは期限切れではない', () => {
    expect(isOverdue(todo({ id: 'a', dueDate: '2026-07-22' }), '2026-07-22')).toBe(false)
    expect(isOverdue(todo({ id: 'b', dueDate: '2026-07-23' }), '2026-07-22')).toBe(false)
    expect(isOverdue(todo({ id: 'c' }), '2026-07-22')).toBe(false)
    expect(isOverdue(todo({ id: 'd', dueDate: '2026-07-01', done: true }), '2026-07-22')).toBe(false)
  })
})
