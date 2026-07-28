import type { HabitEntry, Layer } from '../types'
import { isAchieved } from './stats'

// 習慣の記録値。upsertHabitEntryに渡す可変部分だけを表す
export interface HabitValues {
  valueBool: boolean | null
  valueNum: number | null
  note: string
}

// 習慣の記録を1タップで切り替えたときの次の値を返す。
// 月ビューのチップと日詳細の両方から使うため、判定はここに集約する。
//
// menuName あり: そのメニューで達成にする。同じメニューを再選択したときだけ解除。
//                別のメニューを選んだ場合は達成のまま付け替える。
// menuName なし: 達成/未達成を単純に切り替える(メモは維持)。
//
// 数値習慣を解除すると0になるため、再度達成にしたときの既定値は1。
// セット数を指定したい場合は日詳細から入力する。
export function nextHabitValues(
  current: HabitEntry | undefined,
  layer: Layer,
  menuName?: string,
): HabitValues {
  const kind = layer.config.habitKind ?? 'bool'
  const done = current !== undefined && isAchieved(current)
  // メニュー選択時は「同じメニューの再タップ」だけが解除操作になる
  const clear = menuName === undefined ? done : done && current?.note === menuName

  return {
    valueBool: kind === 'bool' ? !clear : null,
    valueNum: kind === 'number' ? (clear ? 0 : current?.valueNum || 1) : null,
    note: menuName === undefined ? (current?.note ?? '') : clear ? '' : menuName,
  }
}

// その日に選択されているメニュー名(未達成なら null)
export function selectedMenuName(current: HabitEntry | undefined): string | null {
  if (!current || !isAchieved(current) || !current.note) return null
  return current.note
}
