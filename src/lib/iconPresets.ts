// 予定に付けられる絵文字プリセット。設定画面から追加/削除できる。
// この端末のlocalStorageに保存される(端末ごとの設定)

const KEY = 'mycal.icon_presets'

export const DEFAULT_ICON_PRESETS = ['📌', '💼', '🍽️', '🏥', '✈️', '🎂', '🎉', '🏃', '📞', '🎬', '📚', '💇']

export function getIconPresets(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_ICON_PRESETS
    const list = JSON.parse(raw)
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_ICON_PRESETS
  } catch {
    return DEFAULT_ICON_PRESETS
  }
}

export function setIconPresets(list: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(list.filter(Boolean)))
}

export function addIconPreset(emoji: string): string[] {
  const cur = getIconPresets()
  const next = cur.includes(emoji) ? cur : [...cur, emoji]
  setIconPresets(next)
  return next
}

export function removeIconPreset(emoji: string): string[] {
  const next = getIconPresets().filter((e) => e !== emoji)
  setIconPresets(next)
  return next
}

// 過去の予定からアイコンの使用回数を数える(空アイコンは除く)
export function iconFrequency(events: { icon: string }[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const e of events) {
    if (!e.icon) continue
    freq[e.icon] = (freq[e.icon] ?? 0) + 1
  }
  return freq
}

// プリセットを「よく使う順」に並べる(同数は元の順を保つ)。
// 過去に使ったがプリセットにないアイコンは先頭側に混ぜる(最近使ったものが選べる)
export function orderIcons(presets: string[], freq: Record<string, number>): string[] {
  const extras = Object.keys(freq).filter((e) => !presets.includes(e))
  return [...presets, ...extras]
    .map((e, i) => ({ e, i, n: freq[e] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.e)
}
